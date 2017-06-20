#!/usr/bin/env node

'use strict';
const scrape = require( './pastDay' );
const loadJson = require( 'load-json-file' )

loadJson( 'options.json' ).then( obj => {
    //console.log( obj.endDate )
    const startDate = new Date( obj.startDate.year, obj.startDate.month, obj.startDate.day )
    const endDate = obj.endDate.useCurrentDate ? new Date() : new Date( obj.endDate.year, obj.endDate.month, obj.endDate.day )

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
