function distance(lon1, lat1, lon2, lat2) {
    var p = 0.017453292519943295; // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p) / 2 +
        c(lat1 * p) * c(lat2 * p) *
        (1 - c((lon2 - lon1) * p)) / 2;

    return 12742 * Math.asin(Math.sqrt(a));
}

function drawScatterPlot(selection, w, h, x_data, y_data, x_label, y_label) {
    let zip = rows => rows[0].map((_, c) => rows.map(row => row[c])),
        margin_foc = {
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
        x_data_extent = d3.extent(x_data),
        y_data_extent = d3.extent(y_data),
        y_data_extent_spaced = [y_data_extent[0] - 0.3, y_data_extent[1] + 0.3],
        x_foc = d3.scaleTime().domain(x_data_extent).range([0, width_foc]),
        y_foc = d3.scaleLinear().domain(y_data_extent_spaced).range([height_foc, 0]),
        x_ctx = d3.scaleTime().domain(x_foc.domain()).range([0, width_ctx]),
        y_ctx = d3.scaleLinear().domain(y_foc.domain()).range([height_ctx, 0]),
        foc_sel = selection.select("g.focus"),
        ctx_sel = selection.select("g.context");

    if (foc_sel.empty()) {
        // *** Focus (scatter plot)
        foc_sel = selection.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + margin_foc.left + "," + margin_foc.top + ")");

        foc_sel.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height_foc + ")")
        foc_sel.append("text")
            .attr("class", "axis--x-label")
            .attr("transform", "translate(" + (width_foc / 2) + " ," + (height_foc + margin_foc.bottom - 7) + ")")
            .style("text-anchor", "middle")
        foc_sel.append("g")
            .attr("class", "axis axis--y")
        foc_sel.append("text")
            .attr("class", "axis--y-label")
            .attr("y", -3)
            .attr("x", 3)
            .style("text-anchor", "start")
        foc_sel.append("g")
            .attr("class", "foc-dots")
            .attr('clip-path', 'url(#sca-plot-clip)');

        // *** Context (brushing)
        let foc_tot_h = margin_foc.top + (0.8 * rem_h) + margin_foc.bottom;
        ctx_sel = selection.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + margin_ctx.left + "," + (foc_tot_h + margin_ctx.top) + ")");
        ctx_sel.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height_ctx + ")")
        ctx_sel.append("g")
            .attr("class", "ctx-dots");

        // *** Brushing
        foc_sel.append("defs").append("clipPath")
            .attr("id", "sca-plot-clip")
            .append("rect")
            .attr("width", width_foc)
            .attr("height", height_foc);

        ctx_sel.append("g")
            .attr("class", "brush")
    }

    // *** Brush
    let brush = d3.brushX()
        .extent([
            [0, 0],
            [width_ctx, height_ctx]
        ])
        .on("brush", () => {
            brushed(x_ctx, x_foc, y_foc, foc_sel);
        })
        .on("end", () => {
            // Dispatch event to map
            let targets = [document.querySelector("#svg-map")];
            targets.forEach(target => {
                target.dispatchEvent(new CustomEvent('scaplotbrushing', {
                    detail: x_foc.domain()
                }));
            });
        });

    // *** Adjusting brushing
    ctx_sel.select(".brush").call(brush).call(brush.move, x_ctx.range());

    // *** Adjusting axes
    foc_sel.select(".axis--x").call(d3.axisBottom(x_foc).tickArguments([8, d3.timeFormat("%d/%m")]));
    foc_sel.select(".axis--y").call(d3.axisLeft(y_foc));
    ctx_sel.select(".axis--x").call(d3.axisBottom(x_ctx).tickArguments([8, d3.timeFormat("%d/%m")]));
    foc_sel.select(".axis--x-label").text(x_label);
    foc_sel.select(".axis--y-label").text(y_label);

    // *** Focus (scatter plot)
    let foc_points = foc_sel.select("g.foc-dots");
    foc_points = foc_points.selectAll(".sca-plot-dot")
        .data(zip([x_data, y_data]));
    foc_points
        .attr("cx", d => x_foc(d[0]))
        .attr("cy", d => y_foc(d[1]));
    foc_points.enter().append("circle")
        .attr("class", "sca-plot-dot")
        .attr("r", 1.5)
        .attr("cx", d => x_foc(d[0]))
        .attr("cy", d => y_foc(d[1]));
    foc_points.exit().remove();

    // *** Context (brushing)
    let ctx_points = ctx_sel.select("g.ctx-dots");
    ctx_points = ctx_points.selectAll(".sca-plot-dot")
        .data(zip([x_data, y_data]));
    ctx_points
        .attr("cx", d => x_ctx(d[0]))
        .attr("cy", d => y_ctx(d[1]));
    ctx_points.enter().append("circle")
        .attr("class", "sca-plot-dot")
        .attr("r", 1)
        .attr("cx", d => x_ctx(d[0]))
        .attr("cy", d => y_ctx(d[1]));
    ctx_points.exit().remove();
}

function brushed(x_ctx, x_foc, y_foc, foc_sel) {
    let s = d3.event.selection || x_ctx.range();
    x_foc.domain(s.map(x_ctx.invert, x_ctx));
    foc_sel.selectAll("circle")
        .attr("cx", d => x_foc(d[0]))
        .attr("cy", d => y_foc(d[1]));
    foc_sel.select(".axis--x").call(d3.axisBottom(x_foc).tickArguments([8, d3.timeFormat("%d/%m")]));
};