'use strict';
const queryString = require( 'query-string' ),
    merge = require( 'merge-obj' ),
    loadJson = require( 'load-json-file' ),
    writeJson = require( 'write-json-file' ),
    manip = require( 'object-manip' ),
    got = require( 'got' ),
    makeProxy = require( 'proxify-objects' ),
    memoize = require( 'lodash.memoize' ),
    //pify = require( 'pify' ),
    where = require( 'node-where' )
const whereis = function ( loc ) {
    return new Promise( function ( resolve, reject ) {
        try {
            return where.is( loc, function ( err, resp ) {
                if ( err || !resp ) {
                    reject( err )
                }
                resolve( resp )
            } )
        } catch ( e ) {
            reject( "SOMETHING WENT WRONG" )
        }
    } )
}
const log = function () {
        console.log.apply( console, Array.from( arguments ) )
        return arguments[ 0 ]
    },
    error = err => { console.error( err ) },
    get = memoize( function ( url, cookie, bool ) {
        //log( 'ran' )
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
                log( err )
            } )
    } )


const folio = {
    buildUrl: memoize( input => {
        const endDate = new Date(),
            startDate = new Date()
        endDate.setUTCHours( 3, 59, 0, 0 )

        const diff = ( new Date().getUTCHours() < 4 ) ? 2 : 1 //utc fix

        startDate.setDate( endDate.getDate() - diff )
        startDate.setUTCHours( 4, 0, 0, 0 )


        //log( ( startDate ) )
        //log( ( endDate ) )
        //log( new Date() )
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
                    objectName: 'docType',
                    objectType: 'type',
                    solr_file_path: 'filePath',
                    subject: 'subject'
                }, cur.properties )
            }
        }, obj )
    },
    run: filetype =>
        folio.getSearchResults( filetype ).then( obj => {

            //log( obj.results )
            const ret = folio.transformSearchResults( obj )
                //log( ret.results )
            return ret.results
        } ).catch( error )

}

const search = {
    getCookie: memoize( async function () {
        let cookie;
        try {
            cookie = await ( got( 'http://www.miamidade.gov/propertysearch/#/' )
                .then( resp => resp.headers[ 'set-cookie' ] ) )
        } catch ( e ) {
            error( e )
        }
        //log( cookie )
        return cookie[ 0 ].split( ';' )[ 0 ]
    } ),
    buildUrl: memoize( input => {
        const folio = input || 3069340213320
        return `http://www.miamidade.gov/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetPropertySearchByFolio&clientAppName=PropertySearch&folioNumber=${folio}`
    } ),
    getSearchResults: memoize( async function ( input, cookiePromise ) {
        const cookie = cookiePromise

        return get( search.buildUrl( input ), await cookie, true )
    } ),
    loadSearchResults: memoize( () => loadJson( 'result2.json' ) ),
    run: async function ( filetype ) {

        const gotFolios = await search.getFolios( filetype )
            //log( folios )
        const folioNumbers = gotFolios[ 0 ],
            folios = gotFolios[ 1 ]
        const cookie = search.getCookie()

        return folioNumbers.map( async function ( folio, i ) {
            let output;
            try {
                output = search.getSearchResults( folio, cookie );
            } catch ( e ) {
                error( e )
            }
            const transformed = search.transformSearchResults( ( await output ) )

            const merged = search.merge( transformed, filetype, folios[ i ] )

            const result = await search.addMissing( merged, folios[ i ] )

            //log( JSON.stringify( result, ( a, b ) => b, 2 ) )
            return result
        } )

    },
    addMissing: async function ( arr, folio ) {
        const addr = headers.indexOf( "Address 1" )
        const zip = headers.indexOf( "Zip" )

        return Promise.all( arr.map( async function ( line ) {
            if ( line[ addr ] == "" ) {
                line[ addr ] = `${folio.streetNumber[0]} ${folio.streetDirection[0]} ${folio.streetName[0]} ${folio.streetType[0]}`
                log( line[ addr ] )
                line[ addr + 2 ] = "Miami"
                line[ addr + 3 ] = "FL"
                log( line )
            }
            if ( line[ zip ] == "" && line[ addr ].trim() !== "" ) {
                //if address is not empty and zip is empty
                //log( line )
                //log( line[ addr ] )
                log( `"${line[addr]} ${line[addr+1]} ${line[addr+2]}, ${line[addr+3]}",` )
                try {
                    line[ zip ] = ( await ( whereis( `${line[addr]} ${line[addr+1]} ${line[addr+2]}, ${line[addr+3]}` ).catch( e => { console.log( 'eerror' ) } ) ) ).get( 'postalCode' ) || ''
                } catch ( e ) {
                    line[ zip ] = ''
                }
                //log( `${line[addr]} ${line[addr+1]} ${line[addr+2]}, ${line[addr+3]},` )
                //log( 'fo' )

            }
            return line
        } ) )
    },
    merge: ( obj, filetype, folio ) => {
        if ( Array.isArray( obj.owners ) ) {
            obj.owners = obj.owners.join( " & " )
        }
        //log( obj )

        const transformedFolios = search.transformFolios( folio )

        return [ transformedFolios.concat( obj.siteAddress[ 0 ] ).map( a => a || "" ), transformedFolios.slice( 0, transformedFolios.length - 1 ).concat( obj.owners ).concat( obj.mailingAddress ).map( a => a || "" ) ]



    },
    transformSearchResults: obj => {
        return manip( {
            SiteAddress: [ 'siteAddress', function ( cur ) {
                //addr line 1, addr line 2, city, state, zip
                const addressLine = [ cur.StreetNumber, cur.StreetPrefix, cur.StreetName, cur.StreetSuffix ].map( a => a || "" ).join( " " )
                return [ addressLine, cur.unit, cur.City, "FL", cur.Zip ].map( a => a || "" )

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
        //log( foli )
        if ( !Array.isArray( foli.name ) ) {
            foli.name = [ foli.name ]
        }
        const example = {
            streetNumber: [ '30401' ],
            zipcode: [ '0' ],
            creationDate: 1496837709000,
            caseType: '029',
            caseNumber: 'COM-72524',
            name: [ '' ],
            folio: '0000000000000',
            doctype: '015',
            streetDirection: [ 'SW' ],
            streetName: [ '217' ],
            streetType: [ 'AVE' ],
            unit: [ '' ],
            application: 1496721600000,
            ID: '0902a134837104dd',
            docType: 'ENFORCEMENT NOTICE',
            type: 'envd_dec_permit',
            filePath: '0902a134837104dd.pdf',
            subject: ''
        }
        return [ foli.docType, foli.caseNumber, foli.name.join( " & " ) ].map( a => a || "" )


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
        "Document Type",
        "Case Number",
        "Owners Name(s)",
        "Address 1",
        "Address 2",
        "City",
        "State",
        "Zip"
    ],
    excel = {
        titles: titles,
        documents: titles.map( c => c.toUpperCase() ),
        addToSheet: ( data, sheet ) => {

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
                if ( err ) {
                    log( "Some error occured with the creation of your notebook" )
                } else
                    log( 'Congratulations, your workbook is created' )
            } )
        },
        run: async function ( workbook, dateRange, inpu ) {

            const sheet = workbook.createSheet( ( ( new Date() ).toDateString() ), headers.length, 1000 )

            const allResults = await Promise.all( ( inpu || titles ).map( title => {
                //log( title )
                const query = merge( { query: title }, dateRange || {} )

                return search.run( query ).then( arr => {
                    return Promise.all( arr )
                } )
            } ) )
            console.log( allResults )

            const data = allResults.reduce( ( p, c ) => p.concat( c ), [] ).reduce( ( p, c ) => p.concat( c ), [] )

            excel.addToSheet( data, sheet )
            excel.saveWorkBook( workbook )

        }

    }
    /*
if all zeroes or all 9999 
use the address from the first site ||

//// if no address in the second site then use the first site

    */

module.exports = {
    get,
    folio,
    search,
    titles,
    headers,
    excel,
    whereis
}
