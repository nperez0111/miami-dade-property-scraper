'use strict';
const queryString = require( 'query-string' ),
    merge = require( 'merge-obj' ),
    loadJson = require( 'load-json-file' ),
    manip = require( 'object-manip' ),
    got = require( 'got' ),
    makeProxy = require( 'proxify-objects' )

function get( url, cookie, bool ) {
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
}


const folio = {
    buildUrl: input => {
        const defaultObj = {
                query: 'CONSENT AGREEMENT',
                startDate: 1494388800000,
                endDate: 1496721599999
            },
            obj = merge( defaultObj, input || {} ),
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

    },
    getSearchResults: input => get( folio.buildUrl( input ), 'ticket=1234' ),
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
                    objectName: 'name',
                    objectType: 'type',
                    solr_file_path: 'filePath',
                    subject: 'subject'
                }, cur.properties )
            }
        }, obj )
    },
    run: () =>
        folio.loadSearchResults().then( obj => {
            //console.log( obj )
            const ret = folio.transformSearchResults( obj )
            console.log( ret.results )
            return ret.results
        } )

}

const search = {
    getCookie: () => {
        return got( 'http://www.miamidade.gov/propertysearch/#/' )
            .then( resp => resp.headers[ 'set-cookie' ] ).then( cookie => {
                console.log( cookie )
                return cookie[ 0 ].split( ';' )[ 0 ]
            } )
    },
    buildUrl: input => {
        const folio = input || 3069340213320
        return `http://www.miamidade.gov/PApublicServiceProxy/PaServicesProxy.ashx?Operation=GetPropertySearchByFolio&clientAppName=PropertySearch&folioNumber=${folio}`
    },
    getSearchResults: ( input, cookiePromise ) => {
        return cookiePromise.then( cookie => {
            return get( search.buildUrl( input ), cookie, true )
        } )
    },
    loadSearchResults: () => loadJson( 'result2.json' ),
    run: () => {
        const cookie = search //.getCookie()
        search.loadSearchResults( folio, cookie ).then( output => {
            console.log( JSON.stringify( output, ( a, b ) => b, 2 ) )
        } )
    },
    getFolios: () => {
        return folio.run().then( folios => folios.map( folio => folio.folio ) )
    }
}

module.exports = {
    get,
    folio,
    search
}
