#!/usr/bin/env node

'use strict';
const scrape = require( './pastDay' );
const loadJson = require( 'load-json-file' )

function transformMonth( month ) {
    if ( typeof month == 'number' ) {
        return month
    }
    const num = month => {
        month = month.toLowerCase()
        if ( month.length == 3 ) {
            return [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ].map( c => c.toLowerCase() ).indexOf( month )
        }
        return [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ].map( c => c.toLowerCase() ).indexOf( month )
    }
    const ans = num( month )
    if ( ans == -1 ) {
        console.log( `Illegal Month entered: "${month}"` )
        console.log( 'Press any key to exit...' );

        process.stdin.setRawMode( true );
        process.stdin.resume();
        process.stdin.on( 'data', process.exit.bind( process, 0 ) );


    }
    return ans

}

loadJson( 'options.json' ).then( obj => {
    //console.log( obj.endDate )
    const startMonth = transformMonth( obj.startDate.month ),
        endMonth = transformMonth( obj.endDate.month )
    if ( startMonth == -1 || endMonth == -1 ) {
        return;
    }

    const startDate = new Date( obj.startDate.year, startMonth, obj.startDate.day ),
        endDate = obj.endDate.useCurrentDate ? new Date() : new Date( obj.endDate.year, endMonth, obj.endDate.day )

    if ( obj.selectFiles ) {
        //scrape only specific types of documents
        const pos = obj.possibleFiles.map( cur => cur.toUpperCase() )
        const titles = obj.selection.map( cur => pos[ cur ] )
        scrape.single( startDate, endDate, titles )
    } else {
        //scrapes all doc types
        scrape( startDate, endDate )
            //figure out end date
    }

} )
