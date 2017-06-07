'use strict';
const { folio, search, get, titles, excel } = require( './utils' ),
    excelbuilder = require( 'msexcel-builder-protobi' ),
    workbook = excelbuilder.createWorkbook( './', ( "sample" || ( new Date() ).toDateString() ) + '.xlsx' )


if ( !module.parent ) {
    excel.run( workbook )
}

function single( startDate, endDate, title ) {
    return excel.run( workbook, { startDate: startDate, endDate: endDate }, title )
}
module.exports = function ( startDate, endDate ) {
    return single( startDate, endDate, titles )
}
module.exports.single = single
