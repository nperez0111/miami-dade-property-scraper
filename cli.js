#!/usr/bin/env node

'use strict';
const meow = require( 'meow' );
const miamiDadePropertyScraper = require( '.' );

const cli = meow( `
	Usage
	  $ scrape [input]

	Options
	  --foo  Lorem ipsum [Default: false]

	Examples
	  $ miami-dade-property-scraper
	  unicorns & rainbows
	  $ miami-dade-property-scraper ponies
	  ponies & rainbows
` );

console.log( miamiDadePropertyScraper( cli.input[ 0 ] || 'unicorns' ) );
