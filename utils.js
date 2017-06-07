'use strict';
const queryString = require( 'query-string' ),
    merge = require( 'merge-obj' ),
    loadJson = require( 'load-json-file' ),
    writeJson = require( 'write-json-file' ),
    manip = require( 'object-manip' ),
    got = require( 'got' ),
    makeProxy = require( 'proxify-objects' ),
    memoize = require( 'lodash.memoize' )

const get = memoize( function ( url, cookie, bool ) {
    console.log( 'ran' )
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
        console.log( Number( startDate ) )
        console.log( Number( endDate ) )
        const defaultObj = {
                query: input || 'COURT',
                startDate: Number( startDate ),
                endDate: Number( endDate )
            },
            obj = merge( defaultObj, {} ),
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
            console.log( obj.results )
            const ret = folio.transformSearchResults( obj )
            console.log( ret.results )
            return ret.results
        } )

}

const search = {
    getCookie: memoize( () => {
        return got( 'http://www.miamidade.gov/propertysearch/#/' )
            .then( resp => resp.headers[ 'set-cookie' ] ).then( cookie => {
                console.log( cookie )
                return cookie[ 0 ].split( ';' )[ 0 ]
            } )
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
        /*search.getFolios(filetype).then( folios => {
            console.log( folios )
            const cookie = search.getCookie()
            return folios.map( folio => {
                
                return search.getSearchResults( folio, cookie ).then( output => {
                    console.log( JSON.stringify( output, ( a, b ) => b, 2 ) )
                    return output
                } )
            } )
        } )*/
        return search.getFolios( filetype ).then( folios => {
            console.log( folios )
            const cookie = search.getCookie()
            return folios.map( folio => {
                return search.getSearchResults( folio, cookie ).then( output => {
                    return search.addMissing( search.transformSearchResults( output ), filetype, folio ).then( obj => {
                        console.log( JSON.stringify( obj, ( a, b ) => b, 2 ) )

                        return obj
                    } ).catch( err => { console.log( err ) } )

                } ).catch( err => { console.log( err ) } )
            } )
        } ).catch( err => {
            console.log( err )
        } )

    },
    addMissing: ( obj, filetype, folio ) => {
        if ( Array.isArray( obj.owners ) ) {
            obj.owners = obj.owners.join( " & " )
        }

        return search.transformFolios( folio ).then( transformedFolios => {
            return [
                transformedFolios[ 0 ],
                obj.owners,
                transformedFolios[ 1 ]
            ].concat( obj.siteAddress[ 0 ] ).concat( obj.mailingAddress ).map( a => a || "" )
        } )



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
        return folio.run( filetype ).then( folios => folios.map( folio => folio.folio ) )
    } ),
    transformFolios: foli => {
        return folio.run( foli ).then( f => {
            console.log( f )
            if ( !Array.isArray( f.name ) ) {
                f.name = [ f.name ]
            }
            return [ f.caseNumber, f.name.join( " & " ) ]
        } )

    }
}

module.exports = {
    get,
    folio,
    search
}
