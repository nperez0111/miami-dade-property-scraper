'use strict';
const queryString = require( 'query-string' ),
    merge = require( 'merge-obj' ),
    loadJson = require( 'load-json-file' ),
    writeJson = require( 'write-json-file' ),
    manip = require( 'object-manip' ),
    got = require( 'got' ),
    makeProxy = require( 'proxify-objects' ),
    memoize = require( 'lodash.memoize' )

const error = err => { console.error( err ) },
    get = memoize( function ( url, cookie, bool ) {
        //console.log( 'ran' )
        const ops = {
            Cookie: cookie || null,
            "User-Agent": `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36`,
            Accept: "application/json, text/plain, */*",
            Referer: "http://www.miamidade.gov/propertysearch/"
        }
        return got( url, {
                headers: bool ? ops : {
                    Cookie: cookie || null
                }
            } )
            .then( resp => resp.body )
            .then( resp => JSON.parse( resp ) )
            .catch( err => {
                console.error( "CHECK YOUR INTERNET CONNECTION" )
                console.log( err )
            } )
    } )


const folio = {
    buildUrl: memoize( input => {
        const endDate = new Date(),
            startDate = new Date()
        startDate.setDate( endDate.getDate() - 1 )
        startDate.setUTCHours( 0, 0 )
        endDate.setUTCHours( 12, 59 )

        //console.log( Number( startDate ) )
        //console.log( Number( endDate ) )
        if ( typeof input == 'string' ) {
            input = { query: input }
        }
        const defaultObj = {
                query: 'COURT',
                startDate: Number( startDate ),
                endDate: Number( endDate )
            },
            obj = merge( defaultObj, input ),
            baseUrl = 'http://ecmrer.miamidade.gov:8080/OpenContent/rest/query/search?',
            params = {
                'logic[]': ' and ',
                'oc_property[]': [
                    `objectName:${obj.query}:LOGIC_LIKE`,
                    `ct_application:${Number(new Date(obj.startDate))}|${Number(new Date(obj.endDate))}:LOGIC_LIKE`
                ],
                'oc_type[]': 'proc_document',
                order: 'asc',
                sort_by: 'creationDate'
            }

        return `${baseUrl}${queryString.stringify(params)}`

    } ),
    getSearchResults: memoize( input => get( folio.buildUrl( input ), 'ticket=1234' ) ),
    loadSearchResults: () => loadJson( 'result.json' ),
    transformSearchResults: obj => {
        return manip( {
            results: function ( cur ) {
                return manip( {
                    ci_street_number: 'streetNumber',
                    ci_zipcode: 'zipcode',
                    creationDate: 'creationDate',
                    cs_casetype: 'caseType',
                    cs_casenumber: 'caseNumber',
                    cs_facility_name: 'name',
                    cs_folio: 'folio',
                    cs_doctype: 'doctype',
                    cs_street_direction: 'streetDirection',
                    cs_street_number: 'streetNumber',
                    cs_street_name: 'streetName',
                    cs_street_type: 'streetType',
                    cs_unit: 'unit',
                    ct_application: 'application',
                    objectId: 'ID',
                    objectName: 'objName',
                    objectType: 'type',
                    solr_file_path: 'filePath',
                    subject: 'subject'
                }, cur.properties )
            }
        }, obj )
    },
    run: filetype =>
        folio.getSearchResults( filetype ).then( obj => {

            ///console.log( obj.results )
            const ret = folio.transformSearchResults( obj )
                //console.log( ret.results )
            return ret.results
        } ).catch( error )

}

const search = {
    getCookie: memoize( () => {
        return got( 'http://www.miamidade.gov/propertysearch/#/' )
            .then( resp => resp.headers[ 'set-cookie' ] ).then( cookie => {
                //console.log( cookie )
                return cookie[ 0 ].split( ';' )[ 0 ]
            } ).catch( error )
    } ),
    buildUrl: memoize( input => {
        const folio = input || 3069340213320
        return `http://www.miamidade.gov/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetPropertySearchByFolio&clientAppName=PropertySearch&folioNumber=${folio}`
    } ),
    getSearchResults: memoize( ( input, cookiePromise ) => {
        return cookiePromise.then( cookie => {
            return get( search.buildUrl( input ), cookie, true )
        } )
    } ),
    loadSearchResults: memoize( () => loadJson( 'result2.json' ) ),
    run: ( filetype ) => {

        return search.getFolios( filetype ).then( arr => {
            //console.log( folios )
            const foliosNums = arr[ 0 ],
                folios = arr[ 1 ]
            const cookie = search.getCookie()
            return foliosNums.map( ( folio, i ) => {
                return search.getSearchResults( folio, cookie ).then( output => {

                    const result = search.addMissing( search.transformSearchResults( output ), filetype, folios[ i ] )
                        //console.log( JSON.stringify( result, ( a, b ) => b, 2 ) )
                    return result

                } ).catch( error )
            } )
        } ).catch( error )

    },
    addMissing: ( obj, filetype, folio ) => {
        if ( Array.isArray( obj.owners ) ) {
            obj.owners = obj.owners.join( " & " )
        }

        const transformedFolios = search.transformFolios( folio )


        return [
            transformedFolios[ 0 ],
            obj.owners,
            transformedFolios[ 1 ]
        ].concat( obj.siteAddress[ 0 ] ).concat( obj.mailingAddress ).map( a => a || "" )



    },
    transformSearchResults: obj => {
        return manip( {
            SiteAddress: [ 'siteAddress', function ( cur ) {
                //addr line 1, addr line 2, city, state, zip
                return [ `${cur.StreetNumber||""} ${cur.StreetPrefix||""} ${cur.StreetName||""} ${cur.StreetSuffix||""}`, `${cur.unit||""}`, cur.City || "", "FL", cur.Zip || "" ]

            } ],
            MailingAddress: [ 'mailingAddress', function ( a ) {
                //addr line 1, addr line 2, city, state, zip
                return [ a.Address1, a.Address2, a.City, a.State, a.Zip ].map( a => a || "" )
            } ],
            OwnerInfos: [ 'owners', owner => owner.Name ]
        }, obj )
    },
    getFolios: memoize( ( filetype ) => {
        return folio.run( filetype ).then( folios => {
            return [ folios.map( folio => folio.folio ), folios ]
        } )
    } ),
    transformFolios: foli => {

        if ( !Array.isArray( foli.name ) ) {
            foli.name = [ foli.name ]
        }
        return [ foli.caseNumber, foli.name.join( " & " ) ]


    }
}

const titles = [
        "Consent Agreement",
        "Court",
        "Enforcement Letter",
        "Enforcement Notice",
        "Final Notice Prior",
        "UCVN"
    ],
    headers = [
        "Case Number",
        "Owners Name(s)",
        "Company Name",
        "Property Address 1",
        "Property Address 2",
        "City",
        "State",
        "Zip",
        "Mailing Address 1",
        "Mailing Address 2",
        "City",
        "State",
        "Zip"
    ],
    excel = {
        titles: titles,
        documents: titles.map( c => c.toUpperCase() ),
        addSheet: ( title, data, workbook ) => {
            const sheet = workbook.createSheet( title, headers.length, data.length + 1 )
                // columns then rows

            headers.forEach( ( cur, i ) => {
                sheet.set( i + 1, 1, cur )
            } )

            data.forEach( ( cur, r ) => {
                if ( Array.isArray( cur ) ) {
                    cur.forEach( ( val, c ) => {
                        sheet.set( c + 1, r + 2, val )
                    } )
                }
            } )
        },
        saveWorkBook: ( workbook ) => {
            // Save it
            workbook.save( function ( err ) {
                if ( err )
                    throw err
                else
                    console.log( 'congratulations, your workbook created' )
            } )
        },
        run: ( workbook, dateRange, inpu ) => {

            Promise.all( ( inpu || titles ).map( title => {
                //console.log( title )
                const query = merge( { query: title }, dateRange || {} )

                return search.run( query ).then( arr => {
                    return Promise.all( arr ).then( data => {
                        excel.addSheet( title, data, workbook )
                    } ).catch( error )
                } )
            } ) ).then( allDone => {
                console.log( 'attempt save' )
                excel.saveWorkBook( workbook )
            } ).catch( error )
        }

    }

module.exports = {
    get,
    folio,
    search,
    titles,
    excel
}
