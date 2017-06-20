'use strict';
const { folio, search, get, titles, excel } = require( './utils' ),
    excelbuilder = require( 'msexcel-builder-protobi' ),
    workbook = excelbuilder.createWorkbook( './', ( ( new Date() ).toDateString() ) + '.xlsx' )



if ( !module.parent ) {
    excel.run( workbook )
}

function single( startDate, endDate, title ) {

    const isSameAsTitles = Array.isArray( title ) && title.length == titles.length
    let extra = ""
    if ( !isSameAsTitles ) {
        if ( !Array.isArray( title ) ) {
            title = [ title ]
        }
        extra = " " + title.join( " " )
    }
    const fileName = startDate.toDateString() + ' - ' + endDate.toDateString() + extra
    return excel.run( excelbuilder.createWorkbook( './', fileName + '.xlsx' ), { startDate: startDate, endDate: endDate }, title )
}
module.exports = function ( startDate, endDate ) {
    return single( startDate, endDate, titles )
}
module.exports.single = single
