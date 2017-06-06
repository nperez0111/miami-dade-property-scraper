'use strict';
const queryString = require( 'query-string' ),
    merge = require( 'merge-obj' ),
    loadJson = require( 'load-json-file' ),
    manip = require( 'object-manip' ),
    got = require( 'got' ),
    { folio, search, get } = require( './utils' )

folio.run()
