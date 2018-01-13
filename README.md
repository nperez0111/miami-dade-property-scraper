# miami-dade-property-scraper

> Scrapes http://ecmrer.miamidade.gov:8080/index.html and cross-references http://www.miamidade.gov/propertysearch/#/ to gather data about recent filings of specific documents


## Usage
1. Go to the [Releases Section](https://github.com/nperez0111/miami-dade-property-scraper/releases)
2. Download options.json, pastday-{Your Operating System} and specificDate-{Your Operating System}
3. Make sure options.json is in the same folder as where you downloaded specificDate-{Your Operating System}
4. Run the respective program by doubling clicking your desired timing (pastDay or specificDate) allow the program a moment and an excel file will be generated showing the properties for that time period you selected

### How to change specificDate to be the date you want
1. Open options.json in your preffered text editor
2. See "startDate"
 a. Go to "year" change to the desired year on the right hand side of the `:`
 b. Go to "month" change to the desired month within the `"`'s
 c. Go to "day" change to the desired day on the right hand side of the `:`
3. See "endDate" - Repeat proccess above
 a. "useCurrentDate" allows you to use the current date as the end date for the program
4. See "selection"
 a. This allows you to make a list of the files you are searching for. 
5. "selectFiles"
 a. If `true` will search the files specified in "selection" if `false` will search all possible files


# Technical Reminder

Also there is an issue with node-where : insert at lib/address.js:18
````js
if ( !body ) {
            return Error( "No Results" )
        }
````

## License

MIT © [Nick The Sick](http://nickthesick.com)
