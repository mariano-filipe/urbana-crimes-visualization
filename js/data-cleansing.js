const fs = require('fs');
const csv = require('csv-parser');
const d3v5 = require('d3');
const moment = require('moment');
let err_log = {
    loc: {
        cnt: 0,
        invalid_elems: []
    },
    race: {
        cnt: 0,
        invalid_elems: []
    },
    date: {
        cnt: 0,
        invalid_elems: []
    },
    age: {
        cnt: 0,
        invalid_elems: []
    }
};

// Assert that the parameter 'loc' is properly formatted
function assertValidLoc(loc, us_states, us_counties) {
    if (loc !== "" && loc.includes('(') && loc.includes(')')) {
        // Detecting coordinates in 'loc' string
        let aux = loc.match(/[+-]?\d+(?:\.\d+)?/g).map(Number);
        let lon = aux[aux.length - 1];
        let lat = aux[aux.length - 2];
        let pr_bb = [-67.2424275377, 17.946553453, -65.5910037909, 18.5206011011];
        if (lon >= pr_bb[0] && lon <= pr_bb[2] && lat >= pr_bb[1] && lat <= pr_bb[3])
            return undefined; // this coordinate belongs to puerto rico

        // Detect in which state and city the [lon, lat] coordinate is
        let state, city;
        us_counties.features.forEach(county => {
            if (d3v5.geoContains(county, [lon, lat])) {
                state = us_states[county.properties.STATE];
                city = county.properties.NAME;
            }
        });
        if (!state || !city) {
            err_log["loc"].cnt += 1;
            err_log["loc"].invalid_elems.push(loc);
        }

        return {
            state: state,
            city: city,
            coord: [lon, lat]
        };
    }
    err_log["loc"].cnt += 1;
    err_log["loc"].invalid_elems.push(loc);
    return undefined;
}

// Assert that a given 'race' is one of the considered valid
function assertValidRace(race) {
    let valid_races = ["AMERICAN INDIAN/ALASKAN", "ASIAN/PACIFIC ISLAND", "BLACK", "HISPANIC", "WHITE"];
    if (race && race != "") {
        if (valid_races.includes(race))
            return race;
    }
    err_log["race"].cnt += 1;
    err_log["race"].invalid_elems.push(race);
    return "UNKNOWN";
}

// Assert that a given 'date' is valid
function assertValidDate(date) {
    if (moment(date, "MM/DD/YYYY", true).isValid())
        return date;
    err_log["date"].cnt += 1;
    err_log["date"].invalid_elems.push(date);
    return undefined;
}

// Assert that a given 'age' is valid
function assertValidAge(age) {
    age = parseInt(age)
    if (age && age > 0 && age < 123)
        return age;
    err_log["age"].cnt += 1;
    err_log["age"].invalid_elems.push(age);
    return undefined;
}

// Preprocess the 'urbana-crimes' dataset
async function preProcessData() {
    return new Promise((resolve, reject) => {
            // (1) Select only useful fields
            crimes = []
            fs.createReadStream('data/urbana-crimes.csv')
                .pipe(csv({
                    separator: ','
                }))
                .on('data', crime => {
                    try {
                        crimes.push({
                            date: crime['DATE OF ARREST'],
                            loc: crime['ARRESTEE HOME CITY - MAPPED'],
                            race: crime['ARRESTEE RACE'],
                            age: crime['AGE AT ARREST']
                        });
                    } catch (err) {
                        reject(err);
                    }
                })
                .on('end', () => {
                    resolve(crimes);
                });
        })
        .then(crimes => {
            // (2) Asynchronously load the us counties topology
            return new Promise((resolve, reject) => {
                fs.readFile('data/us-light.json', (err, us_counties) => {
                    if (err) reject(err);
                    resolve([crimes, JSON.parse(us_counties)]);
                })
            });
        })
        .then(([crimes, us_counties]) => {
            // (3) Asynchronously load the names of the us states
            return new Promise((resolve, reject) => {
                fs.readFile('data/us-states.json', (err, us_states) => {
                    if (err) reject(err)
                    us_states = JSON.parse(us_states);

                    let iter_cnt = 0;
                    crimes = crimes.reduce((acc, crime) => {
                        crime.loc = assertValidLoc(crime.loc, us_states, us_counties);
                        crime.race = assertValidRace(crime.race);
                        crime.date = assertValidDate(crime.date);
                        crime.age = assertValidAge(crime.age);
                        if (crime.loc && crime.race && crime.date && crime.age)
                            acc.push({
                                loc: crime.loc,
                                race: crime.race,
                                date: crime.date,
                                age: crime.age
                            });

                        iter_cnt += 1;
                        if (iter_cnt % 1000 === 0) {
                            console.log("Iter #" + iter_cnt);
                            console.log("Error Counts:");
                            Object.keys(err_log).forEach(key => {
                                console.log("field: " + key);
                                console.log("cnt: " + err_log[key].cnt);
                            });
                        }
                        return acc;
                    }, []);

                    fs.writeFileSync('data/urbana-crimes-preprocessed.json', JSON.stringify(crimes));
                    fs.writeFileSync('data/errors-log.json', JSON.stringify(err_log));
                    resolve();
                });
            });
        });
}

// *******************
preProcessData();