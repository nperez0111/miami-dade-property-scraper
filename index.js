'use strict';
const queryString = require( 'query-string' ),
    merge = require( 'merge-obj' ),
    loadJson = require( 'load-json-file' ),
    manip = require( 'object-manip' ),
    got = require( 'got' ),
    { folio, search, get } = require( './utils' ),
    excelbuilder = require( 'msexcel-builder-protobi' ),
    workbook = excelbuilder.createWorkbook( './', ( "sample" || ( new Date() ).toDateString() ) + '.xlsx' )


const titles = [
        "Consent Agreement",
        "Court",
        "Enforcement Letter",
        "Enforcement Notice",
        "Final Notice Prior",
        "UCVN"
    ],
    excel = {
        titles: titles,
        documents: titles.map( c => c.toUpperCase() ),
        addSheet: ( title, data ) => {
            const headers = [
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
                // columns then rows
                sheet = workbook.createSheet( title, headers.length, data.length + 1 );

            headers.forEach( ( cur, i ) => {
                sheet.set( i + 1, 1, cur )
            } )

            data.forEach( ( cur, r ) => {
                cur.forEach( ( val, c ) => {
                    sheet.set( c + 1, r + 2, val )
                } )
            } )
        },
        saveWorkBook: () => {
            // Save it
            workbook.save( function ( err ) {
                if ( err )
                    throw err;
                else
                    console.log( 'congratulations, your workbook created' );
            } );
        },
        run: () => {
            excel.documents.forEach( ( file, i ) => {
                search.run( file ).then( outputArr => {
                    const fileName = excel.titles[ i ]
                    excel.addSheet( fileName, outputArr )
                } )
            } )
        }

    }

Promise.all( titles.map( title => {
    console.log( title )
    return search.run( title ).then( arr => {
        return Promise.all( arr ).then( data => {
            excel.addSheet( title, data )
        } ).catch( err => { console.log( err ) } )
    } )
} ) ).then( allDone => {
    console.log( 'attempt save' )
    excel.saveWorkBook()
} ).catch( err => { console.log( err ) } )
