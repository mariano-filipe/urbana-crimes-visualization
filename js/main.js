// ***********
document.addEventListener("DOMContentLoaded", e => {
    main();
});

const race_color_palette = {
    'AMERICAN INDIAN/ALASKAN': '#e6ab02',
    'ASIAN/PACIFIC ISLAND': '#7570b3',
    'BLACK': '#e7298a',
    'HISPANIC': '#d95f02',
    'WHITE': '#66a61e'
}
const urbana_coord = [-88.20727, 40.11059];
let load_data = new Promise((resolve, reject) => {
    d3.json('/data/urbana-crimes-preprocessed.json', (error, crimes) => {
        if (error) reject(error);
        resolve(crimes);
    });
});

// Main function
function main() {
    let width = parseInt(document.getElementById("map-wrapper").clientWidth),
        height = parseInt(document.getElementById("map-wrapper").clientHeight),
        svg = d3.select("#svg-map").attr("width", width).attr("height", height),
        map = svg.append("g").attr("class", "map"),
        map_elements = map.append("g").attr("id", "map-elements"),
        states_counties = map_elements.append("g").attr("id", "states-counties"),
        arrestee_cities = map_elements.append("g").attr("id", "arrestee-cities"),
        edges_to_urbana = map_elements.append("g").attr("id", "edges-city-urbana"),
        projection = d3.geoAlbersUsa().scale(width).translate([width / 2, height / 2]),
        sca_w = parseInt(document.getElementById("sca").clientWidth),
        sca_h = parseInt(document.getElementById("sca").clientHeight),
        sca_svg = d3.select("#svg-sca").attr("width", sca_w).attr("height", sca_h),
        parseTime = d3.timeParse("%m/%d/%Y"),
        his_w = parseInt(document.getElementById("his").clientWidth),
        his_h = parseInt(document.getElementById("his").clientHeight),
        his_svg = d3.select("#svg-his").attr("width", his_w).attr("height", his_h),
        barc_w = parseInt(document.getElementById("barc").clientWidth),
        barc_h = parseInt(document.getElementById("barc").clientHeight),
        barc_svg = d3.select("#svg-barc").attr("width", barc_w).attr("height", barc_h),
        current_ranges = {
            race: {},
            age: {},
            date: {},
            year: null
        };

    drawUsaMap(states_counties, projection);
    drawLegend();
    addInteractivityToMap(svg, map, map_elements, width, height);

    assertDatasetSizeChange();

    // Actions for: dataset size change
    document.querySelector("#svg-map").addEventListener('dsizechange', e => {
        let crimes = e.detail,
            cities = uniqueCities(crimes),
            dates = crimes.map(crime => parseTime(crime.date)),
            ages = crimes.map(crime => crime.age),
            date_range = d3.extent(dates),
            start_year = date_range[0].getFullYear(),
            end_year = date_range[1].getFullYear(),
            middle_year = Math.floor((start_year + end_year) / 2);
        current_ranges.year = middle_year;

        updatePointsOnMap(arrestee_cities, projection, cities, crimes);
        updateEdgesOnMap(edges_to_urbana, projection, cities, crimes);

        drawHistogram(his_svg, his_w, his_h, dates, "Year", "Crime count");
        drawBarChart(barc_svg, barc_w, barc_h, ages, "Age", "Crime count");

        initYearSlider(start_year, middle_year, end_year);
    });

    // Actions for: race selection
    Object.keys(race_color_palette).forEach(race_name => {
        current_ranges.race[race_name] = false;
    });
    document.querySelector("#svg-map").addEventListener('raceselection', e => {
        current_ranges.race[e.detail] = !current_ranges.race[e.detail];
        arrestee_cities.selectAll("circle")
            .attr("display", d => assertSelectedRecord(d, current_ranges));
        edges_to_urbana.selectAll("line")
            .attr("display", d => assertSelectedRecord(d, current_ranges));
    });

    // Actions for: scatter plot brushing
    document.querySelector("#svg-map").addEventListener('scaplotbrushing', e => {
        current_ranges.date = e.detail;
        arrestee_cities.selectAll("circle")
            .attr("display", d => assertSelectedRecord(d, current_ranges));
        edges_to_urbana.selectAll("line")
            .attr("display", d => assertSelectedRecord(d, current_ranges));
    });

    // Actions for: bar chart brushing
    document.querySelector("#svg-map").addEventListener('barcbrushing', e => {
        current_ranges.age = e.detail;
        arrestee_cities.selectAll("circle")
            .attr("display", d => assertSelectedRecord(d, current_ranges));
        edges_to_urbana.selectAll("line")
            .attr("display", d => assertSelectedRecord(d, current_ranges));
    });

    // Actions for: year selection on Map
    document.querySelector("#svg-map").addEventListener('yearselection', e => {
        current_ranges.year = parseInt(e.detail);

        arrestee_cities.selectAll("circle")
            .attr("display", d => assertSelectedRecord(d, current_ranges));
        edges_to_urbana.selectAll("line")
            .attr("display", d => assertSelectedRecord(d, current_ranges));
    });

    // Actions for: year selection on Scatter Plot
    document.querySelector("#svg-sca").addEventListener('yearselection', e => {
        let selected_year = parseInt(e.detail),
            crimes = d3.select("#svg-map").selectAll("circle.crime-coordinate").data(),
            crimes_in_year = crimes.filter(d => parseTime(d.date).getFullYear() === selected_year),
            dates = crimes_in_year.map(crime => parseTime(crime.date)),
            distances = crimes_in_year.map(crime => Math.log(1 + distance(crime.loc.coord[0], crime.loc.coord[1], urbana_coord[0], urbana_coord[1])));

        drawScatterPlot(sca_svg, sca_w, sca_h, dates, distances, "Date (dd/mm/" + e.detail + ")", "log(1 + distance to Urbana)");
    });
}

// intialize year slider each time the data set size is changed
function initYearSlider(start_year, middle_year, end_year) {
    let slider = document.getElementById("year-range");

    let pvalue = slider.getAttribute("data-pvalue");
    if (pvalue)
        d3.select("rect#year-" + pvalue).node().classList.remove("selected");
    d3.select("rect#year-" + middle_year).node().classList.add("selected");

    slider.setAttribute("min", start_year);
    slider.setAttribute("max", end_year);
    slider.value = middle_year;
    slider.setAttribute("data-pvalue", middle_year);

    let targets = [document.querySelector("#svg-map"),
        document.querySelector("#svg-barc"),
        document.querySelector("#svg-sca")
    ];
    slider.addEventListener("mouseup", () => {
        let pvalue = slider.getAttribute("data-pvalue");
        if (pvalue !== slider.value) {
            slider.setAttribute("data-pvalue", slider.value);
            d3.select("rect#year-" + pvalue).node().classList.remove("selected");
            d3.select("rect#year-" + slider.value).node().classList.add("selected");

            // Dispatch event to all plots so that they can be updated
            targets.forEach(target => {
                target.dispatchEvent(new CustomEvent('yearselection', {
                    detail: slider.value
                }));
            });
        }
    });

    // Dispatch event to all plots so that they can be updated
    targets.forEach(target => {
        target.dispatchEvent(new CustomEvent('yearselection', {
            detail: middle_year
        }));
    });
}

// if d point should be displayed, return null. Otherwise returns "none".
function assertSelectedRecord(d, current_ranges) {
    let parseTime = d3.timeParse("%m/%d/%Y"),
        date = parseTime(d.date),
        year = date.getFullYear();
    // checking if d:date.year is different than the current selected year
    if (year !== current_ranges.year)
        return "none";
    // checking if d:date is outside the bounds of cur date range
    if (date < current_ranges.date[0] || date > current_ranges.date[1])
        return "none";
    // checking if d:race is selected
    if (current_ranges.race[d.race])
        return "none";
    // checking if d:age is outside the bounds of cur age range
    if (d.age < current_ranges.age[0] || d.age > current_ranges.age[1])
        return "none";
    return null;
}

// select a prisoner race in the map legend
function selectRace(race) {
    // Change style of the handle
    let sel_handle = document.querySelector("#race-legend td[data-race='" + race + "']");

    if (sel_handle.style.border) {
        sel_handle.style.border = null;
        sel_handle.setAttribute("bgcolor", race_color_palette[race]);
    } else {
        sel_handle.style.border = "1px solid " + race_color_palette[race];
        sel_handle.setAttribute("bgcolor", "#FFF");
    }

    // Dispatch event to map so that it can be updated
    let targets = [document.querySelector("#svg-map")];
    targets.forEach(target => {
        target.dispatchEvent(new CustomEvent('raceselection', {
            detail: race
        }));
    });
}

// draw the legend below the map
function drawLegend() {
    let race_legend_labels = document.querySelector("#race-legend .legend-labels");
    let race_legend_handles = document.querySelector("#race-legend .legend-handles");
    Object.keys(race_color_palette).forEach(race => {
        let label = document.createElement("td");
        label.innerHTML = race;
        race_legend_labels.appendChild(label);

        let handle = document.createElement("td");
        handle.setAttribute("style", "opacity: 1;");
        handle.setAttribute("bgcolor", race_color_palette[race]);
        handle.setAttribute("data-race", race);
        handle.setAttribute("onclick", "selectRace('" + race + "')");
        race_legend_handles.appendChild(handle);
    });
}

// Assert that the selected fraction of the dataset is loaded properly 
async function assertDatasetSizeChange() {
    return new Promise((resolve, reject) => {
        let btn_change_ds = document.getElementById("dsize-fraction");
        let dsize_fract = parseFloat(btn_change_ds.value);
        let targets = [document.querySelector("#svg-map")];

        load_data.then(all_crimes => {
            all_crimes = shuffle(all_crimes);
            let dsize = Math.ceil((dsize_fract / 100) * all_crimes.length);
            let selected_crimes = all_crimes.slice(0, dsize);

            targets.forEach(target => {
                target.dispatchEvent(new CustomEvent('dsizechange', {
                    detail: selected_crimes
                }));
            });

            resolve(selected_crimes);
        });
    });
}

// Return the unique cities and its count of crimes
function uniqueCities(crimes) {
    let unique_cities = crimes.reduce((acc, crime) => {
        const city = crime.loc.city;
        if (acc[city]) {
            acc[city].cnt += 1;
        } else {
            acc[city] = Object.create(null);
            acc[city].cnt = 1;
            acc[city].coord = crime.loc.coord;
        }
        return acc
    }, Object.create(null));
    let cities = Object.keys(unique_cities).map(key => {
        return [key, unique_cities[key].cnt, unique_cities[key].coord];
    });
    cities.sort((first, second) => {
        return second[1] - first[1];
    });
    return cities;
}

// Shuffle an array 'a'
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}