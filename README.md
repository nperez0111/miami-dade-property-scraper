# miami-dade-property-scraper

> Scrapes http://ecmrer.miamidade.gov:8080/index.html and cross-references http://www.miamidade.gov/propertysearch/#/ to gather data about recent filings of specific documents


## Install

```
$ npm install --save miami-dade-property-scraper
```


## Usage

```bash
node pastDay.js
```

Also there is an issue with node-where : insert at lib/address.js:18
````js
if ( !body ) {
            return Error( "No Results" )
        }
````

## License

MIT © [Nick The Sick](http://nickthesick.com)
