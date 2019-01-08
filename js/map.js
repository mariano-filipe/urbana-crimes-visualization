// Draw points (arrestee home city) on map
function updatePointsOnMap(map, projection, selected_cities, selected_crimes) {
    let city_names = selected_cities.map(ci => ci[0]);
    let sel_crimes = selected_crimes.filter(cr => city_names.includes(cr.loc.city));
    let selection = map.selectAll("circle.crime-coordinate")
        .data(sel_crimes, d => d.loc.city);
    selection.attr("display", null);
    selection.exit().remove();
    selection.enter().append("circle")
        .attr("class", "crime-coordinate")
        .attr("cx", c => projection(c.loc.coord)[0])
        .attr("cy", c => projection(c.loc.coord)[1])
        .attr("r", 2)
        .style("fill", c => race_color_palette[c.race]);
}

// Draw edges (links between Urbana and an arrestee home city) on map
function updateEdgesOnMap(map, projection, selected_cities, selected_crimes) {
    let city_names = selected_cities.map(ci => ci[0]);
    let sel_crimes = selected_crimes.filter(cr => city_names.includes(cr.loc.city));
    let selection = map.selectAll('line')
        .data(sel_crimes, d => d.loc.city);
    selection.attr("display", null);
    selection.exit().remove();
    selection.enter().append('line')
        .attr('x1', c => projection(c.loc.coord)[0])
        .attr('y1', c => projection(c.loc.coord)[1])
        .attr('x2', projection(urbana_coord)[0])
        .attr('y2', projection(urbana_coord)[1])
        .attr('stroke-width', 1)
        .attr('stroke', c => race_color_palette[c.race])
        .on("mouseover", (_, i, p) => {
            d3.select(p[i]).attr("stroke-width", 3);
        })
        .on("mouseout", (_, i, p) => {
            d3.select(p[i]).attr("stroke-width", 1);
        });
}

// Draw the us counties on a given 'selection' using the given 'projection'
function drawUsaMap(selection, projection) {
    d3.json("data/us-light.json", (error, us) => {
        if (error) throw error;

        let path = d3.geoPath().projection(projection)

        selection.selectAll("path")
            .data(us.features)
            .enter()
            .append("path")
            .attr("class", "county")
            .attr("name", c => c.properties.NAME)
            .attr("d", path)
            .on("mouseover", () => {
                tooltip.style("display", null);
            })
            .on("mouseout", () => {
                tooltip.style("display", "none");
            })
            .on("mousemove", d => {
                let x_pos = d3.event.pageX - document.getElementById("svg-map").getBoundingClientRect().x + 10;
                let y_pos = d3.event.pageY - document.getElementById("svg-map").getBoundingClientRect().y + 10;
                let city_name = d3.event.target.getAttribute("name");
                tooltip.attr("transform", "translate(" + x_pos + "," + y_pos + ")");
                tooltip.select("text").text(city_name);
                tooltip.select("rect").attr("width", 8.5 * city_name.length);
            });
        // Initialize tooltip
        let tooltip = d3.select("#svg-map").append("g")
            .attr("class", "tooltip")
            .style("display", "none");

        tooltip.append("rect")
            .attr("width", 50)
            .attr("height", 20)
            .attr("fill", "white")
            .style("opacity", 0.5);

        tooltip.append("text")
            .attr("x", 5)
            .attr("dy", "1.2em")
            .attr("font-size", "12px")
            .attr("font-weight", "bold");
    });
}

// Add 'zoom', 'pan' and 'resetting zoom' iteractivity to 'map'
function addInteractivityToMap(svg, map, map_elements, width, height) {
    let zoom = d3.zoom()
        .scaleExtent([0.5, 7])
        .translateExtent([
            [-width * 2, -height * 2],
            [width * 2, height * 2]
        ])
        .on("zoom", () => {
            map_elements.attr("transform", d3.event.transform);
        });
    map.call(zoom);

    svg.append("image")
        .attr("class", "home-zoom")
        .attr("x", 30)
        .attr("y", 30)
        .attr("width", 20)
        .attr("height", 20)
        .attr("xlink:href", "/img/home.svg")
        .on("click", () => {
            map.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        }).append("title").text("reset zoom");
}