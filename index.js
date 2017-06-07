'use strict';
const { folio, search, get, titles, excel } = require( './utils' ),
    excelbuilder = require( 'msexcel-builder-protobi' ),
    workbook = excelbuilder.createWorkbook( './', ( "sample" || ( new Date() ).toDateString() ) + '.xlsx' )



excel.run( workbook )
