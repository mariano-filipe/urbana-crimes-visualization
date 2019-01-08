function drawHistogram(selection, w, h, data, x_label, y_label) {
    // set the dimensions and margins of the graph
    let margin = {
            top: 20,
            right: 20,
            bottom: 35,
            left: 40
        },
        width = w - margin.left - margin.right,
        height = h - margin.top - margin.bottom,
        x_data_extent = d3.extent(data),
        x = d3.scaleTime().domain(x_data_extent).rangeRound([0, width]),
        histogram = d3.histogram().domain(x.domain()).thresholds(x.ticks(d3.timeYear)),
        bins = histogram(data),
        y = d3.scaleLinear().domain([0, d3.max(bins, d => d.length)]).range([height, 0]),
        hist_sel = selection.select("g.hist");

    if (hist_sel.empty()) {
        hist_sel = selection.append("g")
            .attr("class", "hist")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        hist_sel.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
        hist_sel.append("text")
            .attr("class", "axis--x-label")
            .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.bottom - 3) + ")")
            .style("text-anchor", "middle")
        hist_sel.append("g")
            .attr("class", "axis axis--y")
        hist_sel.append("text")
            .attr("class", "axis--y-label")
            .attr("y", -3)
            .attr("x", 3)
            .style("text-anchor", "start")
    }

    // Adjusting axes
    let x_tick_values = d3.timeYears(x_data_extent[0], x_data_extent[1], 2);
    hist_sel.select(".axis--x").call(d3.axisBottom(x).tickValues(x_tick_values));
    hist_sel.select(".axis--y").call(d3.axisLeft(y).ticks(6));
    hist_sel.select(".axis--x-label").text(x_label);
    hist_sel.select(".axis--y-label").text(y_label);

    // Updating bars
    let hist_bars_group = hist_sel.select("g.hist-bars");
    if (hist_bars_group.empty())
        hist_bars_group = hist_sel.append("g").attr("class", "hist-bars");
    let hist_bars = hist_bars_group.selectAll("rect.hist-bar")
        .data(bins);
    hist_bars
        .attr("id", d => ("year-" + d.x0.getFullYear()))
        .attr("transform", d => ("translate(" + x(d.x0) + "," + y(d.length) + ")"))
        .attr("width", d => (x(d.x1) - x(d.x0) - 1))
        .attr("height", d => (height - y(d.length)));
    hist_bars.enter().append("rect")
        .attr("class", "hist-bar")
        .attr("x", 1)
        .attr("id", d => ("year-" + d.x0.getFullYear()))
        .attr("transform", d => ("translate(" + x(d.x0) + "," + y(d.length) + ")"))
        .attr("width", d => (x(d.x1) - x(d.x0) - 1))
        .attr("height", d => (height - y(d.length)));
    hist_bars.exit().remove();
}

function drawBarChart(selection, w, h, data, x_label, y_label) {
    let margin_foc = {
            top: 20,
            right: 20,
            bottom: 40,
            left: 40
        },
        margin_ctx = {
            top: 0,
            right: 20,
            bottom: 35,
            left: 40
        },
        rem_h = h - margin_foc.top - margin_foc.bottom - margin_ctx.top - margin_ctx.bottom,
        width_foc = w - margin_foc.left - margin_foc.right,
        height_foc = 0.8 * rem_h,
        width_ctx = w - margin_ctx.left - margin_ctx.right,
        height_ctx = 0.2 * rem_h,
        x_data_extent = d3.extent(data),
        x_foc = d3.scaleLinear().domain(x_data_extent).range([0, width_foc]),
        x_ctx = d3.scaleLinear().domain(x_foc.domain()).range([0, width_ctx]),
        histogram = d3.histogram().domain(x_foc.domain()).thresholds(x_foc.ticks(30)),
        bins = histogram(data),
        y_data_extent = [0, d3.max(bins, d => d.length)],
        y_foc = d3.scaleLinear().domain(y_data_extent).range([height_foc, 0]),
        y_ctx = d3.scaleLinear().domain(y_foc.domain()).range([height_ctx, 0]),
        foc_sel = selection.select("g.focus"),
        ctx_sel = selection.select("g.context");

    if (foc_sel.empty()) {
        // *** Focus (bar chart)
        foc_sel = selection.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + margin_foc.left + "," + margin_foc.top + ")");
        foc_sel.append("defs").append("clipPath")
            .attr("id", "barc-clip")
            .append("rect")
            .attr("width", width_foc)
            .attr("height", height_foc);
        foc_sel.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height_foc + ")")
        foc_sel.append("text")
            .attr("class", "axis--x-label")
            .attr("transform", "translate(" + (width_foc / 2) + " ," + (height_foc + margin_foc.bottom - 10) + ")")
            .style("text-anchor", "middle")
        foc_sel.append("g")
            .attr("class", "axis axis--y")
        foc_sel.append("text")
            .attr("class", "axis--y-label")
            .attr("y", -3)
            .attr("x", 3)
            .style("text-anchor", "start")
        foc_sel.append("g")
            .attr("class", "foc-bars")
            .attr('clip-path', 'url(#barc-clip)');

        // *** Context (brushing)
        let foc_tot_h = margin_foc.top + (0.8 * rem_h) + margin_foc.bottom;
        ctx_sel = selection.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + margin_ctx.left + "," + (foc_tot_h + margin_ctx.top) + ")");
        ctx_sel.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height_ctx + ")");
        ctx_sel.append("g")
            .attr("class", "ctx-bars")

        // *** Brushing
        ctx_sel.append("g")
            .attr("class", "brush")
    }

    // *** Handling Year Selection
    let svg_barc = document.querySelector("#svg-barc");
    let crimes = d3.select("#svg-map").selectAll("circle.crime-coordinate").data(),
        parseTime = d3.timeParse("%m/%d/%Y");
    svg_barc.addEventListener('yearselection', function (e) {
        let selected_year = parseInt(e.detail),
            crimes_in_year = crimes.filter(d => parseTime(d.date).getFullYear() === selected_year),
            ages = crimes_in_year.map(d => d.age),
            sel_year_bins = histogram(ages);

        updateBarGraphOnYearSelection(sel_year_bins, x_foc, y_foc, height_foc, x_ctx, y_ctx, height_ctx);
    });

    // *** Brush
    let brush = d3.brushX()
        .extent([
            [0, 0],
            [width_ctx, height_ctx]
        ])
        .on("brush", () => {
            brushed_barc(x_ctx, x_foc, y_foc, foc_sel, height_foc);
        })
        .on("end", () => {
            // Dispatch event to map
            let targets = [document.querySelector("#svg-map")];
            targets.forEach(target => {
                target.dispatchEvent(new CustomEvent('barcbrushing', {
                    detail: x_foc.domain()
                }));
            });
        });

    // *** Adjusting brushing
    ctx_sel.select(".brush").call(brush).call(brush.move, x_ctx.range());

    // *** Adjusting axes
    foc_sel.select(".axis--x").call(d3.axisBottom(x_foc));
    foc_sel.select(".axis--y").call(d3.axisLeft(y_foc));
    ctx_sel.select(".axis--x").call(d3.axisBottom(x_ctx));
    foc_sel.select(".axis--x-label").text(x_label);
    foc_sel.select(".axis--y-label").text(y_label);

    // *** Focus (bar chart)
    let foc_bars = foc_sel.select("g.foc-bars");
    foc_bars = foc_bars.selectAll(".barc-bar")
        .data(bins);
    foc_bars
        .attr("transform", d => ("translate(" + x_foc(d.x0) + "," + y_foc(d.length) + ")"))
        .attr("width", d => (x_foc(d.x1) - x_foc(d.x0)))
        .attr("height", d => (height_foc - y_foc(d.length)));
    foc_bars.enter().append("rect")
        .attr("class", "barc-bar")
        .attr("x", 1)
        .attr("transform", d => ("translate(" + x_foc(d.x0) + "," + y_foc(d.length) + ")"))
        .attr("width", d => (x_foc(d.x1) - x_foc(d.x0)))
        .attr("height", d => (height_foc - y_foc(d.length)));
    foc_bars.exit().remove();

    // *** Context (brushing)
    let ctx_bars = ctx_sel.select("g.ctx-bars");
    ctx_bars = ctx_bars.selectAll(".barc-bar")
        .data(bins);
    ctx_bars
        .attr("transform", d => ("translate(" + x_ctx(d.x0) + "," + y_ctx(d.length) + ")"))
        .attr("width", d => (x_ctx(d.x1) - x_ctx(d.x0)))
        .attr("height", d => (height_ctx - y_ctx(d.length)));
    ctx_bars.enter().append("rect")
        .attr("class", "barc-bar")
        .attr("x", 1)
        .attr("transform", d => ("translate(" + x_ctx(d.x0) + "," + y_ctx(d.length) + ")"))
        .attr("width", d => (x_ctx(d.x1) - x_ctx(d.x0)))
        .attr("height", d => (height_ctx - y_ctx(d.length)));
    ctx_bars.exit().remove();
}

function brushed_barc(x_ctx, x_foc, y_foc, foc_sel, height_foc) {
    let s = d3.event.selection || x_ctx.range();
    x_foc.domain(s.map(x_ctx.invert, x_ctx));
    foc_sel.select("g.foc-bars").selectAll("rect")
        .attr("transform", d => ("translate(" + x_foc(d.x0) + "," + y_foc(d.length) + ")"))
        .attr("width", d => (x_foc(d.x1) - x_foc(d.x0)))
        .attr("height", d => (height_foc - y_foc(d.length)));
    foc_sel.select(".axis--x").call(d3.axisBottom(x_foc));
};

function updateBarGraphOnYearSelection(bins, x_foc, y_foc, height_foc, x_ctx, y_ctx, height_ctx) {
    let barc_svg = d3.select("#svg-barc"),
        foc_sel = barc_svg.select("g.focus"),
        foc_bars = foc_sel.select("g.foc-bars"),
        ctx_sel = barc_svg.select("g.context"),
        ctx_bars = ctx_sel.select("g.ctx-bars");

    // *** Focus (bar chart) - Year Selection
    let foc_bars_year = foc_bars.selectAll(".barc-bar-year")
        .data(bins);
    foc_bars_year
        .attr("transform", d => ("translate(" + x_foc(d.x0) + "," + y_foc(d.length) + ")"))
        .attr("width", d => (x_foc(d.x1) - x_foc(d.x0)))
        .attr("height", d => (height_foc - y_foc(d.length)));
    foc_bars_year.enter().append("rect")
        .attr("class", "barc-bar-year")
        .attr("x", 1)
        .attr("transform", d => ("translate(" + x_foc(d.x0) + "," + y_foc(d.length) + ")"))
        .attr("width", d => (x_foc(d.x1) - x_foc(d.x0)))
        .attr("height", d => (height_foc - y_foc(d.length)));
    foc_bars_year.exit().remove();

    // *** Context (brushing) - Year Selection
    let ctx_bars_year = ctx_bars.selectAll(".barc-bar-year")
        .data(bins);
    ctx_bars_year
        .attr("transform", d => ("translate(" + x_ctx(d.x0) + "," + y_ctx(d.length) + ")"))
        .attr("width", d => (x_ctx(d.x1) - x_ctx(d.x0)))
        .attr("height", d => (height_ctx - y_ctx(d.length)));
    ctx_bars_year.enter().append("rect")
        .attr("class", "barc-bar-year")
        .attr("x", 1)
        .attr("transform", d => ("translate(" + x_ctx(d.x0) + "," + y_ctx(d.length) + ")"))
        .attr("width", d => (x_ctx(d.x1) - x_ctx(d.x0)))
        .attr("height", d => (height_ctx - y_ctx(d.length)));
    ctx_bars_year.exit().remove();
}