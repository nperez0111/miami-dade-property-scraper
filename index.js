'use strict';
const queryString = require( 'query-string' ),
    merge = require( 'merge-obj' ),
    loadJson = require( 'load-json-file' ),
    manip = require( 'object-manip' ),
    got = require( 'got' ),
    { folio, search, get } = require( './utils' ),
    excelbuilder = require( 'msexcel-builder-protobi' ),
    workbook = excelbuilder.createWorkbook( './', ( "sample" || ( new Date() ).toDateString() ) + '.xlsx' )


search.run()

const excel = {
    addSheet: ( title, data ) => {
        const headers = [
                "Case Number",
                "Document Type",
                "First Name",
                "Middle Name",
                "Last Name",
                "Suffix",
                "Title",
                "Company Name",
                "Address 1",
                "Address 2",
                "Address 3",
                "City",
                "State",
                "Zip"
            ],
            // columns then rows
            sheet = workbook.createSheet( title, headers.length, data.length );

        headers.forEach( ( cur, i ) => {
            sheet.set( i + 1, 1, cur )
        } )

        data.forEach( ( cur, r ) => {
            cur.forEach( ( val, c ) => {
                sheet.set( r + 2, c + 1, val )
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
    }

}
