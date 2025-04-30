// Global variable to track the current artist (for time range filtering)
let currentArtistName = "";

/***********************
 * Update Time Controls for the Selected Artist
 ***********************/
function updateTimeControls(artistData, artistName) {
  const dates = artistData.map((d) => new Date(d.ts));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  const formatDate = (d) => d.toISOString().split("T")[0];

  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");

  startDateInput.value = formatDate(minDate);
  endDateInput.value = formatDate(maxDate);
  startDateInput.min = formatDate(minDate);
  startDateInput.max = formatDate(maxDate);
  endDateInput.min = formatDate(minDate);
  endDateInput.max = formatDate(maxDate);

  const yearSelect = document.getElementById("yearSelect");
  yearSelect.innerHTML = "";

  // Populate year dropdown
  const uniqueYears = Array.from(
    new Set(artistData.map((d) => new Date(d.ts).getFullYear()))
  ).sort((a, b) => a - b);

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.text = "All Years";
  yearSelect.appendChild(defaultOption);

  uniqueYears.forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.text = year;
    yearSelect.appendChild(option);
  });

  // Auto-update charts when date range changes
  function handleDateChange() {
    const start = new Date(startDateInput.value);
    const end = new Date(endDateInput.value);
    if (isNaN(start) || isNaN(end)) return;

    const filteredData = window.allParsedData.filter((d) => {
      const date = new Date(d.ts);
      return date >= start && date <= end;
    });

    updateAllCharts(filteredData, artistName);
  }

  startDateInput.addEventListener("change", handleDateChange);
  endDateInput.addEventListener("change", handleDateChange);

  // When a year is selected, update date inputs and charts
  yearSelect.addEventListener("change", function () {
    const selectedYear = parseInt(this.value);
    let start, end;

    if (!isNaN(selectedYear)) {
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 11, 31, 23, 59, 59);
    } else {
      start = minDate;
      end = maxDate;
    }

    startDateInput.value = formatDate(start);
    endDateInput.value = formatDate(end);

    handleDateChange();
  });

  // Optional reset range button
  const resetButton = document.getElementById("resetRangeBtn");
  if (resetButton) {
    resetButton.addEventListener("click", function () {
      yearSelect.value = "";
      startDateInput.value = formatDate(minDate);
      endDateInput.value = formatDate(maxDate);
      handleDateChange();
    });
  }
}


/***********************
 * Linegraph of peak listenings
 ***********************/
function updatePeakListening(data, artistName) {
  // Filter data for the artist
  const artistData = data.filter(
    (d) =>
      d.master_metadata_album_artist_name &&
      d.master_metadata_album_artist_name.toLowerCase() ===
        artistName.toLowerCase()
  );

  // Remove any existing chart
  const container = d3.select("#peakListening");
  container.selectAll("svg").remove();

  // Add instructions above chart
  container.selectAll("p.peak-instructions").remove();
  container
    .append("p")
    .attr("class", "peak-instructions")
    .style("margin-bottom", "4px")
    .style("font-size", "0.85rem")
    .style("color", "#555")
    .text("Click and drag to select a time range. Double-click to reset.");

  if (!artistData.length) {
    container.selectAll("p.peak-message").remove();
    container
      .append("p")
      .attr("class", "peak-message")
      .text("No listening data available for this artist.");
    return;
  } else {
    container.selectAll("p.peak-message").remove();
  }

  // Determine date range
  const parseDate = (d) => new Date(d.ts);
  const dates = artistData.map(parseDate);
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  const diffDays = (maxDate - minDate) / (1000 * 3600 * 24);

  // Decide on grouping strategy based on diffDays
  let groupFn, xFormat;
  if (diffDays < 7) {
    // 1) No grouping (one point per record)
    // We basically treat each record as its own x-value
    // so we can see day-to-day (or minute-to-minute) changes
    // if your data is that granular.
    groupFn = (d) => parseDate(d); // no grouping
    xFormat = d3.timeFormat("%b %d, %H:%M"); // e.g. "May 02, 13:45"
  } else if (diffDays <= 60) {
    groupFn = (d) => d3.timeDay(parseDate(d));
  } else {
    groupFn = (d) => d3.timeWeek(parseDate(d));
  }

  xFormat = (d) => {
    if (d.getMonth() === 0 && d.getDate() === 1) {
      return d3.timeFormat("%b %e, '%y")(d); // e.g. Jan 1, '23
    } else {
      return d3.timeFormat("%b %e")(d); // e.g. Apr 5
    }
  };
  // Aggregate data by chosen grouping
  const grouped = d3.rollups(
    artistData,
    (v) => d3.sum(v, (d) => +d.ms_played / 60000),
    groupFn
  );

  // Sort groups by date
  grouped.sort((a, b) => a[0] - b[0]);

  // If we did "no grouping," we effectively have one data point per record.
  // If we grouped by day or week, we have sums for that day/week.

  // Dimensions
  const margin = { top: 20, right: 30, bottom: 20, left: 50 },
    width = 800 - margin.left - margin.right,
    height = 150 - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${
        height + margin.top + margin.bottom
      }`
    )
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(grouped, (d) => d[0]))
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(grouped, (d) => d[1])])
    .nice()
    .range([height, 0]);

  // Define line generator
  const line = d3
    .line()
    .x((d) => xScale(d[0]))
    .y((d) => yScale(d[1]))
    .curve(d3.curveLinear);

  // Append axes
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).ticks(6).tickFormat(xFormat))
    .append("text")
    .attr("fill", "#000")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .text("Time");

  svg
    .append("g")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("y", -40)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .text("Minutes Played");

  // Draw the line
  // Area under the line
  const area = d3
    .area()
    .x((d) => xScale(d[0]))
    .y0(height)
    .y1((d) => yScale(d[1]))
    .curve(d3.curveMonotoneX);

  svg
    .append("path")
    .datum(grouped)
    .attr("fill", "#4caf4f")
    .attr("fill-opacity", 0.2)
    .attr("d", area);

  // Line itself
  svg
    .append("path")
    .datum(grouped)
    .attr("fill", "none")
    .attr("stroke", "#4caf4f")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Circle for peak
  const peak = grouped.reduce((a, b) => (a[1] > b[1] ? a : b));
  svg
    .append("circle")
    .attr("cx", xScale(peak[0]))
    .attr("cy", yScale(peak[1]))
    .attr("r", 5)
    .attr("fill", "#388e3c");

  // Label for peak
  svg
    .append("text")
    .attr("x", xScale(peak[0]))
    .attr("y", yScale(peak[1]) - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "0.8rem")
    .style("fill", "#2e7d32")
    .text(`${peak[1].toFixed(1)} min`);

  // Remove the code that adds circles for data points.
  // (If you need tooltips, consider using mouse events on the line itself.)

  // Add the brush.
  const brush = d3
    .brushX()
    .extent([
      [0, 0],
      [width, height],
    ])
    .on("end", brushed);

  svg.append("g").attr("class", "brush").call(brush);

  const tooltip = container
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("padding", "6px 8px")
    .style("border-radius", "4px")
    .style("font-size", "0.8rem")
    .style("pointer-events", "none")
    .style("box-shadow", "0 1px 4px rgba(0,0,0,0.2)");

  // Brush event handler.
  function brushed({ selection }) {
    if (!selection) return; // Ignore if no selection.
    const [x0, x1] = selection;
    const date0 = xScale.invert(x0);
    const date1 = xScale.invert(x1);
    // Update the date range controls (assumes they exist in your DOM).
    document.getElementById("startDate").value = date0
      .toISOString()
      .split("T")[0];
    document.getElementById("endDate").value = date1
      .toISOString()
      .split("T")[0];
    // Optionally, you can trigger an update of all charts using the new date range.
    //For example:
    const filteredData = window.allParsedData.filter((d) => {
      const date = new Date(d.ts);
      return date >= date0 && date <= date1;
    });
    updateAllCharts(filteredData, artistName);

    // Clear the brush selection.
    d3.select(this).call(brush.move, null);
  }
}

function wrapText(text, width) {
  text.each(function () {
    const textEl = d3.select(this);
    const words = textEl.text().split(/\s+/).reverse();
    let word;
    let line = [];
    let lineNumber = 0;
    const lineHeight = 1.1; // ems
    const y = textEl.attr("y");
    const x = textEl.attr("x");
    const dy = parseFloat(textEl.attr("dy")) || 0;

    textEl.text(null); // Clear existing text
    let tspan = textEl
      .append("tspan")
      .attr("x", x)
      .attr("y", y)
      .attr("dy", dy + "em");

    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = textEl
          .append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    }
  });
}

/***********************
 * Drill-Down: Song Distribution as a Radar Chart
 ***********************/
// CLEANED UP: updateAlbumDistribution (only shows the chart, no headers or reset buttons)
function updateAlbumDistribution(artistData) {
  // Filter based on drill-down state
  let filtered = artistData;
  if (drillDownState.selectedYear) {
    filtered = filtered.filter(
      (d) => new Date(d.ts).getFullYear() === drillDownState.selectedYear
    );
  }
  if (drillDownState.selectedAlbum) {
    filtered = filtered.filter(
      (d) =>
        d.master_metadata_album_album_name.toLowerCase() ===
        drillDownState.selectedAlbum.toLowerCase()
    );
  }

  if (filtered.length === 0) {
    d3.select("#albumDist").html(
      "<p class='empty-message'>No song data available.</p>"
    );
    return;
  }

  // Aggregate data by track
  const songData = d3
    .rollups(
      filtered,
      (v) => d3.sum(v, (d) => +d.ms_played / 60000),
      (d) => d.master_metadata_track_name
    )
    .map(([track, minutes]) => ({ track, minutes }));

  // Clear existing chart
  const chartContainer = d3.select("#albumDist");
  chartContainer.selectAll("*").remove();

  // CHOOSE CHART BASED ON TRACK COUNT
  if (songData.length <= 2) {
    // Bar Chart
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = 500 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = chartContainer
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(songData.map((d) => d.track))
      .range([0, width])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(songData, (d) => d.minutes)])
      .nice()
      .range([height, 0]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "middle")
      .style("font-size", "10px");

    svg.append("g").call(d3.axisLeft(y));

    svg
      .selectAll("rect")
      .data(songData)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.track))
      .attr("y", (d) => y(d.minutes))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.minutes))
      .attr("fill", "#4caf4f")
      .append("title")
      .text((d) => `${d.track}: ${d.minutes.toFixed(1)} minutes`);
  } else {
    // Radar Chart
    const size = 125; // Match sunburst height
    const radius = size / 2 - 20; // Leave some margin inside the canvas
    const angleSlice = (2 * Math.PI) / songData.length;
    const maxValue = d3.max(songData, (d) => d.minutes);
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, maxValue]);

    const chartWrapper = chartContainer
      .append("div")
      .style("display", "flex")
      .style("justify-content", "center")
      .style("align-items", "center")
      .style("overflow", "visible");

    const svg = chartWrapper
      .append("svg")
      .attr("viewBox", `0 0 ${size} ${size}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "350px") // match sunburst
      .append("g")
      .attr("transform", `translate(${size / 2},${size / 2 - 20})`);

    // Concentric circles
    for (let level = 1; level <= 5; level++) {
      svg
        .append("circle")
        .attr("r", radius * (level / 5))
        .attr("fill", "none")
        .attr("stroke", "#ccc");
    }

    // Axes and labels
    songData.forEach((d, i) => {
      const angle = i * angleSlice - Math.PI / 2;

      svg
        .append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", rScale(maxValue) * Math.cos(angle))
        .attr("y2", rScale(maxValue) * Math.sin(angle))
        .attr("stroke", "#ccc");

      const label = svg
        .append("text")
        .attr("x", (radius + 5) * Math.cos(angle))
        .attr("y", (radius + 5) * Math.sin(angle))
        .attr("dy", "0.35em")
        .attr("text-anchor", Math.cos(angle) > 0 ? "start" : "end")
        .style("font-size", "4px") // 👈 smaller font
        .text(d.track);

      wrapText(label, 50, 2);
    });

    // Radar shape
    const radarLine = d3
      .lineRadial()
      .radius((d) => rScale(d.minutes))
      .angle((d, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    svg
      .append("path")
      .datum(songData)
      .attr("d", radarLine)
      .attr("fill", "#4caf4f")
      .attr("fill-opacity", 0.3)
      .attr("stroke", "#4caf4f")
      .attr("stroke-width", 2);

    // Dots on radar
    svg
      .selectAll(".radarCircle")
      .data(songData)
      .enter()
      .append("circle")
      .attr("r", 2.0)
      .attr(
        "cx",
        (d, i) => rScale(d.minutes) * Math.cos(i * angleSlice - Math.PI / 2)
      )
      .attr(
        "cy",
        (d, i) => rScale(d.minutes) * Math.sin(i * angleSlice - Math.PI / 2)
      )
      .attr("fill", "#4caf4f")
      .append("title")
      .text((d) => `${d.track}: ${d.minutes.toFixed(1)} minutes`);
  }
}

/***********************
 * Artist Info with Animated Transitions
 ***********************/
function updateArtistInfo(data, artistName) {
  const placeholderImg = "https://via.placeholder.com/150";
  const artistData = data.filter(
    (d) =>
      d.master_metadata_album_artist_name &&
      d.master_metadata_album_artist_name.toLowerCase() ===
        artistName.toLowerCase()
  );
  if (!artistData.length) return;

  currentArtistName = artistName;
  updateTimeControls(artistData, artistName);

  const totalPlays = artistData.length;
  const totalMinutes = d3.sum(artistData, (d) => +d.ms_played) / 60000;
  const firstListenDate = new Date(d3.min(artistData, (d) => new Date(d.ts)));
  const listensByYear = d3.rollups(
    artistData,
    (v) => d3.sum(v, (d) => +d.ms_played / 60000),
    (d) => new Date(d.ts).getFullYear()
  );
  const [peakYear, peakMinutes] = listensByYear.reduce(
    (a, b) => (a[1] > b[1] ? a : b),
    [null, 0]
  );
  const topSongEntry = d3
    .rollups(
      artistData,
      (v) => d3.sum(v, (d) => +d.ms_played / 60000),
      (d) => d.master_metadata_track_name
    )
    .reduce((a, b) => (a[1] > b[1] ? a : b), [null, 0]);
  const topSong = topSongEntry[0];
  const topSongMinutes = topSongEntry[1];

  const overallRankings = d3
    .rollups(
      data,
      (v) => d3.sum(v, (d) => +d.ms_played),
      (d) => d.master_metadata_album_artist_name
    )
    .sort((a, b) => b[1] - a[1]);
  const overallRank =
    overallRankings.findIndex(
      ([artist]) => artist.toLowerCase() === artistName.toLowerCase()
    ) + 1;

  const yearRankings = d3.rollups(
    data,
    (v) =>
      d3.rollups(
        v,
        (vv) => d3.sum(vv, (d) => +d.ms_played),
        (d) => d.master_metadata_album_artist_name
      ),
    (d) => new Date(d.ts).getFullYear()
  );
  const topYears = [];
  yearRankings.forEach(([year, artistArr]) => {
    artistArr.sort((a, b) => b[1] - a[1]);
    const rank =
      artistArr.findIndex(
        ([artist]) => artist.toLowerCase() === artistName.toLowerCase()
      ) + 1;
    if (rank > 0 && rank <= 5) {
      topYears.push({
        year,
        rank,
        totalMinutes:
          artistArr.find(
            ([artist]) => artist.toLowerCase() === artistName.toLowerCase()
          )[1] / 60000,
      });
    }
  });

  const trackForImg = artistData.find(
    (d) =>
      d.master_metadata_track_name === topSong &&
      d.spotify_track_uri &&
      d.spotify_track_uri.includes("spotify:track:")
  );
  let artistImageUrl = placeholderImg;
  if (trackForImg) {
    const trackId = trackForImg.spotify_track_uri.split(":")[2];
    const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
    fetch(oEmbedUrl)
      .then((res) => res.json())
      .then((embedData) => {
        artistImageUrl = embedData.thumbnail_url || artistImageUrl;
        renderArtistInfo();
      })
      .catch(() => renderArtistInfo());
  } else {
    renderArtistInfo();
  }

  function renderArtistInfo() {
    const html = `
            <div class="artist-info-box transition">
              <img src="${artistImageUrl}" alt="${artistName}" class="artist-img" />
              <div class="artist_info_container">
                <h2>${artistName}</h2>
                <div class="artists_info_text">
                  <div class="info-left">
                    ${
                      totalPlays
                        ? `<p><strong>Total Plays:</strong> ${totalPlays}</p>`
                        : ""
                    }
                    ${
                      totalMinutes
                        ? `<p><strong>Total Minutes:</strong> ${totalMinutes.toFixed(
                            1
                          )}</p>`
                        : ""
                    }
                    ${
                      firstListenDate
                        ? `<p><strong>First Listened:</strong> ${firstListenDate.toLocaleDateString()}</p>`
                        : ""
                    }
                    ${
                      peakYear
                        ? `<p><strong>Peak Listening Year:</strong> ${peakYear} (${peakMinutes.toFixed(
                            1
                          )} minutes)</p>`
                        : ""
                    }
                    ${
                      topSong
                        ? `<p><strong>Top Song:</strong> ${topSong} (${topSongMinutes.toFixed(
                            1
                          )} minutes)</p>`
                        : ""
                    }
                  </div>
                  <div class="info-right">
                    ${
                      overallRank
                        ? `<p><strong>Overall Rank:</strong> #${overallRank} among all artists</p>`
                        : ""
                    }
                    ${
                      topYears.length
                        ? `<p><strong>Top 5 Years:</strong></p>
                           <ul class="top-years-list">
                            ${topYears
                              .map(
                                (d) =>
                                  `<li>${d.year}: Ranked #${
                                    d.rank
                                  } (${d.totalMinutes.toFixed(1)} minutes)</li>`
                              )
                              .join("")}
                          </ul>`
                        : ""
                    }
                  </div>
                </div>
              </div>
            </div>
          `;
    d3.select("#artistInfo")
      .html("")
      .style("opacity", 0)
      .html(html)
      .transition()
      .duration(500)
      .style("opacity", 1);
  }
}

/***********************
 * Total Bar Plot with Year Drill-Down
 ***********************/
function updateBarChart(data, artistName) {
  const artistData = data.filter(
    (d) =>
      d.master_metadata_album_artist_name &&
      d.master_metadata_album_artist_name.toLowerCase() ===
        artistName.toLowerCase()
  );
  if (!artistData.length) {
    d3.select("#barChart").html(
      "<p class='empty-message'>No listening data found for this artist.</p>"
    );
    return;
  }

  const yearData = d3
    .rollups(
      artistData,
      (v) => d3.sum(v, (d) => +d.ms_played / 60000),
      (d) => new Date(d.ts).getFullYear()
    )
    .map(([year, totalMinutes]) => ({ year: +year, totalMinutes }));
  yearData.sort((a, b) => a.year - b.year);

  d3.select("#barChart").select("svg").remove();
  const margin = { top: 30, right: 30, bottom: 50, left: 80 },
    width = 400 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;
  const svg = d3
    .select("#barChart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleBand()
    .domain(yearData.map((d) => d.year))
    .range([0, width])
    .padding(0.2);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(yearData, (d) => d.totalMinutes)])
    .nice()
    .range([height, 0]);
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").call(d3.axisLeft(y));
  svg
    .append("text")
    .attr("x", width)
    .attr("y", height + 40)
    .attr("text-anchor", "end")
    .text("Year");
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -60)
    .attr("x", -height / 2)
    .attr("dy", "1em")
    .attr("text-anchor", "middle")
    .text("Total Minutes Played");

  const bars = svg
    .selectAll("rect")
    .data(yearData)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.year))
    .attr("y", height)
    .attr("width", x.bandwidth())
    .attr("height", 0)
    .attr("fill", "#ff7f0e")
    .on("click", (event, d) => {
      drillDownState.selectedYear = d.year;
      updateAlbumDistribution(artistData);
    });
  bars
    .append("title")
    .text((d) => `${d.year}: ${d.totalMinutes.toFixed(1)} minutes`);
  bars
    .transition()
    .duration(800)
    .attr("y", (d) => y(d.totalMinutes))
    .attr("height", (d) => height - y(d.totalMinutes));
}

/***********************
 * Scatter Plot with Enhanced Interactions
 ***********************/
// updateScatterPlot updates the scatter plot and sets up the dot click handler.
// updateScatterPlot updates the scatter plot and sets up the dot click handler.
// Global variable to store the currently selected track name.
let selectedTrackName = null;

/**
 * updateScatterPlot creates/updates the scatter plot.
 * It also re-applies (or updates) the info box if one is already open,
 * so that when you change the time frame the stats for the selected track update.
 */
// Updated version: Y-axis now shows consistency (% of distinct months with plays within selected time range), X-axis shows max minutes in a year
function updateScatterPlot(data, artistName) {
  const scatterContainer = d3.select("#scatterChart");

  let flexContainer = scatterContainer.select("div.chartAndInfo");

  if (flexContainer.empty()) {
    flexContainer = scatterContainer
      .append("div")
      .attr("class", "chartAndInfo")
      .style("display", "flex")
      .style("flex-direction", "row");
  }

  let chartDiv = flexContainer.select("div.chart_svg");
  if (chartDiv.empty()) {
    chartDiv = flexContainer.append("div").attr("class", "chart_svg");
  }

  const margin = { top: 20, right: 20, bottom: 50, left: 50 },
    innerWidth = 500 - margin.left - margin.right,
    innerHeight = 300 - margin.top - margin.bottom;

  let svgEl = chartDiv.select("svg");
  if (svgEl.empty()) {
    svgEl = chartDiv
      .append("svg")
      .attr("viewBox", "0 0 550 350")
      .style("width", "550px")
      .style("height", "350px");
    svgEl = svgEl
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  } else {
    svgEl = svgEl.select("g");
  }

  const artistData = data.filter(
    (d) =>
      d.master_metadata_album_artist_name &&
      d.master_metadata_album_artist_name.toLowerCase() ===
        artistName.toLowerCase()
  );

  // Get global start and end from the filtered data
  const listenedMonths = new Set(
    data
      .filter(
        (d) =>
          d.master_metadata_album_artist_name &&
          d.master_metadata_album_artist_name.toLowerCase() ===
            artistName.toLowerCase()
      )
      .map((d) => {
        const date = new Date(d.ts);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      })
  );

  // Step 2: Use the size of that set as the total months for consistency calculations
  const totalMonths = listenedMonths.size;

  const trackStats = d3
    .rollups(
      artistData,
      (v) => {
        const yearMap = d3.rollup(
          v,
          (vv) => d3.sum(vv, (d) => +d.ms_played / 60000),
          (d) => new Date(d.ts).getFullYear()
        );

        const uniqueMonthKeys = new Set(
          v.map((d) => {
            const date = new Date(d.ts);
            return `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}`;
          })
        );

        const monthsWithListening = uniqueMonthKeys.size;
        const consistency =
          totalMonths > 0 ? monthsWithListening / totalMonths : 0;

        return {
          maxMinutesInYear: d3.max(yearMap.values()),
          consistency,
        };
      },
      (d) => d.master_metadata_track_name
    )
    .map(([track, stats]) => {
      const trackForImg = artistData.find(
        (d) => d.master_metadata_track_name === track
      );
      return {
        track,
        spotify_track_uri: trackForImg?.spotify_track_uri,
        ...stats,
      };
    });

  const x = d3
    .scaleLinear()
    .domain([0, d3.max(trackStats, (d) => d.maxMinutesInYear)])
    .nice()
    .range([0, innerWidth]);

  const y = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

  const color = d3
    .scaleLinear()
    .domain([0, 0.5, 1])
    .range(["#e53935", "#fdd835", "#43a047"]);

  svgEl.selectAll(".x-axis, .y-axis, .axis-label").remove();

  svgEl
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  svgEl
    .append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

  svgEl
    .append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "end")
    .style("font-size", "10px")
    .text("Max Minutes in a Single Year");

  svgEl
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -40)
    .attr("x", -5)
    .attr("text-anchor", "end")
    .style("font-size", "9px")
    .text("Consistency Across Months (% of Months Played)");

  let tooltip = d3.select("body").select(".tooltip");
  if (tooltip.empty()) {
    tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "4px 8px")
      .style("background", "rgba(0, 0, 0, 0.7)")
      .style("color", "#fff")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0);
  }

  svgEl
    .selectAll("circle")
    .data(trackStats, (d) => d.track)
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("cx", (d) => x(d.maxMinutesInYear))
          .attr("cy", (d) => y(d.consistency))
          .attr("r", 4)
          .attr("fill", (d) => color(d.consistency))
          .attr("opacity", 0.8)
          .style("cursor", "pointer")
          .on("click", (event, d) => {
            const rawData = artistData.filter(
              (e) => e.master_metadata_track_name === d.track
            );
            updateSongDistPlot({ ...d, rawData });
          })
          .on("mouseover", (event, d) => {
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip
              .html(
                `<strong style="color: var(--white-color)">${d.track}</strong><br/>` +
                  `Max (year): ${d.maxMinutesInYear.toFixed(1)} min<br/>` +
                  `Consistency: ${(d.consistency * 100).toFixed(1)}%`
              )
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 28 + "px");
          })
          .on("mousemove", (event) => {
            tooltip
              .style("left", event.pageX + 10 + "px")
              .style("top", event.pageY - 28 + "px");
          })
          .on("mouseout", () => {
            tooltip.transition().duration(500).style("opacity", 0);
          }),
      (update) =>
        update.call((u) =>
          u
            .transition()
            .duration(800)
            .attr("cx", (d) => x(d.maxMinutesInYear))
            .attr("cy", (d) => y(d.consistency))
            .attr("r", 4)
            .attr("fill", (d) => color(d.consistency))
        ),
      (exit) => exit.remove()
    );

  const xThreshold = d3.quantile(
    trackStats.map((d) => d.maxMinutesInYear).sort(d3.ascending),
    0.99
  );
  const yThreshold = 0.99;

  const outliers = trackStats.filter(
    (d) => d.maxMinutesInYear > xThreshold || d.consistency > yThreshold
  );

  // Simple collision detection to avoid label overlaps
  const placedLabels = [];

  function isTooClose(x1, y1) {
    const minDistance = 18; // pixels
    return placedLabels.some(([x2, y2]) => {
      const dx = x1 - x2;
      const dy = y1 - y2;
      return Math.sqrt(dx * dx + dy * dy) < minDistance;
    });
  }

  svgEl
    .selectAll(".label")
    .data(
      outliers.filter((d) => {
        const px = x(d.maxMinutesInYear);
        const py = y(d.consistency);
        if (isTooClose(px, py)) return false;
        placedLabels.push([px, py]);
        return true;
      }),
      (d) => d.track
    )
    .join(
      (enter) =>
        enter
          .append("text")
          .attr("class", "label")
          .attr("x", (d) => x(d.maxMinutesInYear) + 8)
          .attr("y", (d) => y(d.consistency))
          .attr("dy", "0.35em")
          .attr("text-anchor", "start")
          .text((d) => d.track)
          .style("font-size", "10px")
          .style("fill", "#333")
          .style("opacity", 0)
          .each(function () {
            wrapText(d3.select(this), 50);
          })
          .call((enter) =>
            enter.transition().duration(800).style("opacity", 1)
          ),
      (update) =>
        update
          .text((d) => d.track)
          .attr("x", (d) => x(d.maxMinutesInYear) + 8)
          .attr("y", (d) => y(d.consistency))
          .attr("dy", "0.35em")
          .attr("text-anchor", "start")
          .each(function () {
            wrapText(d3.select(this), 50);
          })
          .call((update) => update.transition().duration(800)),
      (exit) => exit.transition().duration(800).style("opacity", 0).remove()
    );

  if (selectedTrackName) {
    const updatedTrack = trackStats.find((t) => t.track === selectedTrackName);
    if (updatedTrack) {
      const rawData = artistData.filter(
        (e) => e.master_metadata_track_name === updatedTrack.track
      );
      updateSongDistPlot({ ...updatedTrack, rawData });
    }
  }
}

function updateSongDistPlot(trackData) {
  const flexContainer = d3.select("#scatterChart").select("div.chartAndInfo");
  const svgEl = d3.select("#scatterChart").select("svg").select("g");

  flexContainer.selectAll("div.infoDiv").remove();

  const infoDiv = flexContainer
    .append("div")
    .attr("class", "infoDiv")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("justify-content", "space-between")
    .style("margin-top", "10px")
    .style("flex", "1");

  infoDiv
    .html("<p>Loading details…</p>")
    .style("text-align", "center")
    .style("color", "#555")
    .style("font-style", "italic");

  let artistImageUrl = "";

  function renderDetails() {
    infoDiv.html("");

    const infoContent = infoDiv
      .append("div")
      .attr("class", "infoContent")
      .style("display", "flex")
      .style("flex-direction", "row")
      .style("align-items", "start")
      .style("justify-content", "space-between")
      .style("width", "100%");

    const headerContent = infoContent
      .append("div")
      .attr("class", "headerContent")
      .style("flex", "1")
      .style("display", "flex")
      .style("flex-direction", "row");

    if (artistImageUrl) {
      headerContent
        .insert("img", ":first-child")
        .attr("src", artistImageUrl)
        .attr("alt", "Spotify Track Image")
        .style("width", "20%")
        .style("display", "block")
        .style("border-radius", "var(--border-radius)")
        .style("height", "auto");
    }

    headerContent
      .append("h3")
      .style("margin-left", "var(--spacing)")
      .text(trackData.track);

    infoContent
      .append("button")
      .attr("class", "button")
      .text("X")
      .style("cursor", "pointer")
      .on("click", () => {
        selectedTrackName = null;
        flexContainer.selectAll("div.infoDiv").remove();
      });

    const plotContainer = infoDiv
      .append("div")
      .attr("class", "songPlotContainer")
      .style("padding", "var(--spacing)")
      .style("background", "rgba(76, 175, 79, 0.1)")
      .style("border-radius", "var(--border-radius-small)")
      .style("border", "1px solid rgb(221, 221, 221)")
      .style("font-size", "var(--font-small-size)");

    drawSongPlot(plotContainer, trackData);
  }

  function drawSongPlot(container, trackData) {
    container.html("");

    const width = 250,
      height = 100,
      margin = { top: 5, right: 20, bottom: 32, left: 40 },
      cellSize = 15;

    // Toggle buttons for switching views
    const toggleWrapper = container.append("div").style("margin-bottom", "8px");
    toggleWrapper.html(`
        <label style="font-size:12px;margin-right:10px;">
          <input type="radio" name="viewMode" value="line" checked> Line Graph
        </label>
        <label style="font-size:12px;">
          <input type="radio" name="viewMode" value="heatmap"> Heatmap
        </label>
      `);

    const plotDiv = container.append("div");

    const drawLine = () => {
      plotDiv.html("");

      const width = 240;
      const height = 85;
      const margin = { top: 5, right: 10, bottom: 15, left: 15 };

      const svg = plotDiv
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto");

      const group = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const extent = d3.extent(trackData.rawData, (d) => new Date(d.ts));
      const totalDays = (extent[1] - extent[0]) / (1000 * 60 * 60 * 24);

      let binFn = d3.timeMonth;
      if (totalDays <= 30) binFn = d3.timeDay;
      else if (totalDays <= 180) binFn = d3.timeWeek;

      const grouped = d3
        .rollups(
          trackData.rawData,
          (v) => d3.sum(v, (d) => +d.ms_played / 60000),
          (d) => binFn(new Date(d.ts))
        )
        .map(([date, minutes]) => ({ date, minutes }));

      grouped.sort((a, b) => a.date - b.date);

      const x = d3
        .scaleTime()
        .domain(d3.extent(grouped, (d) => d.date))
        .range([0, innerWidth]);
      const y = d3
        .scaleLinear()
        .domain([0, d3.max(grouped, (d) => d.minutes)])
        .nice()
        .range([innerHeight, 0]);

      group
        .append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(5)
            .tickFormat((d) => {
              const date = new Date(d);
              return date.getDate() === 1 && date.getMonth() === 0
                ? `Jan 1 '${date.getFullYear().toString().slice(-2)}`
                : d3.timeFormat("%b %d")(d);
            })
        )
        .selectAll("text")
        .style("font-size", "5px");

      group
        .append("g")
        .call(d3.axisLeft(y).ticks(4))
        .selectAll("text")
        .style("font-size", "5px");

      const area = d3
        .area()
        .x((d) => x(d.date))
        .y0(innerHeight)
        .y1((d) => y(d.minutes));

      group
        .append("path")
        .datum(grouped)
        .attr("fill", "rgba(255,255,255,0.6)") // whitish area
        .attr("d", area);

      const line = d3
        .line()
        .x((d) => x(d.date))
        .y((d) => y(d.minutes));
      group
        .append("path")
        .datum(grouped)
        .attr("fill", "none")
        .attr("stroke", "#4caf50")
        .attr("stroke-width", 2)
        .attr("d", line);

      // Tooltip
      let tooltip = d3.select("body").select(".tooltip");
      if (tooltip.empty()) {
        tooltip = d3
          .select("body")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "#333")
          .style("color", "#fff")
          .style("padding", "4px 8px")
          .style("border-radius", "4px")
          .style("font-size", "8px")
          .style("pointer-events", "none")
          .style("opacity", 0);
      }

      const bisectDate = d3.bisector((d) => d.date).left;
      group
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", function (event) {
          const [mx] = d3.pointer(event);
          const hoveredDate = x.invert(mx);
          const i = bisectDate(grouped, hoveredDate);
          const d0 = grouped[i - 1],
            d1 = grouped[i];
          const d =
            !d1 || hoveredDate - d0.date < d1.date - hoveredDate ? d0 : d1;

          tooltip
            .html(
              `<p>${d3.timeFormat("%b %d, %Y")(d.date)}</p>${d.minutes.toFixed(
                1
              )} min`
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 28}px`)
            .style("opacity", 1);
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));
    };

    const drawHeatmap = () => {
      plotDiv.html("");

      const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
      trackData.rawData.forEach((d) => {
        const date = new Date(d.ts);
        matrix[date.getDay()][date.getHours()] += +d.ms_played / 60000;
      });

      const maxVal = d3.max(matrix.flat());
      const color = d3
        .scaleSequential(d3.interpolateYlGnBu)
        .domain([0, maxVal]);

      const svgHeight = cellSize * 7 + margin.top + margin.bottom + 12;
      const svg = plotDiv
        .append("svg")
        .attr("width", cellSize * 24 + margin.left + margin.right)
        .attr("height", svgHeight);

      const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      dayLabels.forEach((label, i) => {
        g.append("text")
          .attr("x", -5)
          .attr("y", i * cellSize + cellSize / 1.5)
          .attr("text-anchor", "end")
          .style("font-size", "8px")
          .text(label);
      });

      // Time period sectioning (background bands)
      const timeLabels = [
        { label: "Night", range: [0, 5], color: "#e0f7fa" },
        { label: "Morning", range: [6, 11], color: "#e8f5e9" },
        { label: "Noon", range: [12, 13], color: "#fffde7" },
        { label: "Afternoon", range: [14, 17], color: "#fff3e0" },
        { label: "Evening", range: [18, 23], color: "#ede7f6" },
      ];
      const labelY = 7 * cellSize + 12;

      timeLabels.forEach(({ label, range, color: bgColor }) => {
        const startX = range[0] * cellSize;
        const widthX = (range[1] - range[0] + 1) * cellSize;

        g.append("rect")
          .attr("x", startX)
          .attr("y", -margin.top)
          .attr("width", widthX)
          .attr("height", cellSize * 7)
          .style("fill", bgColor)
          .style("opacity", 0.3);

        g.append("text")
          .attr("x", startX + widthX / 2)
          .attr("y", labelY)
          .attr("text-anchor", "middle")
          .style("font-size", "8px")
          .style("fill", "#333")
          .text(label);
      });

      const tooltip = d3.select("body").select(".tooltip");
      if (tooltip.empty()) {
        d3.select("body")
          .append("div")
          .attr("class", "tooltip")
          .style("position", "absolute")
          .style("background", "#333")
          .style("color", "#fff")
          .style("padding", "4px 8px")
          .style("border-radius", "4px")
          .style("font-size", "10px")
          .style("pointer-events", "none")
          .style("opacity", 0);
      }

      const workingTooltip = d3.select("body").select(".tooltip");

      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          g.append("rect")
            .attr("x", h * cellSize)
            .attr("y", d * cellSize)
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("fill", color(matrix[d][h]))
            .on("mouseover", function (event) {
              workingTooltip
                .style("opacity", 1)
                .html(
                  `${dayLabels[d]}, ${h}:00<br><p>${matrix[d][h].toFixed(
                    1
                  )} minutes</p>`
                )
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`)
                .style("color", "var(--white-color)");
            })
            .on("mouseout", () => workingTooltip.style("opacity", 0));
        }
      }

      timeLabels.forEach(({ range }) => {
        const xPos = range[0] * cellSize;
        g.append("line")
          .attr("x1", xPos)
          .attr("x2", xPos)
          .attr("y1", 0)
          .attr("y2", cellSize * 7)
          .attr("stroke", "#000")
          .attr("stroke-dasharray", "2,2")
          .attr("stroke-width", 1);
      });

      // Legend (color gradient)
      const legendHeight = 8;
      const legendWidth = 150;
      const legendGroup = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${svgHeight - 20})`);

      const gradientId = "legendGradient";
      const defs = svg.append("defs");
      const gradient = defs
        .append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%");
      for (let i = 0; i <= 100; i++) {
        gradient
          .append("stop")
          .attr("offset", `${i}%`)
          .attr("stop-color", color((maxVal * i) / 100));
      }

      legendGroup
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", `url(#${gradientId})`);

      const legendScale = d3
        .scaleLinear()
        .domain([0, maxVal])
        .range([0, legendWidth]);

      const legendAxis = d3
        .axisBottom(legendScale)
        .ticks(4)
        .tickSize(3)
        .tickFormat((d) => `${d.toFixed(0)} min`);

      legendGroup
        .append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", "8px");
    };

    drawLine(); // Initial load

    // Add logic to both radio buttons
    container.selectAll("input[name='viewMode']").on("change", function () {
      const mode = this.value;
      if (mode === "heatmap") drawHeatmap();
      else drawLine();
    });
  }

  if (trackData.spotify_track_uri) {
    const trackId = trackData.spotify_track_uri.split(":")[2];
    const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
    fetch(oEmbedUrl)
      .then((res) => res.json())
      .then((embedData) => {
        artistImageUrl = embedData.thumbnail_url || "";
        renderDetails();
      })
      .catch(() => renderDetails());
  } else {
    renderDetails();
  }
}

/***********************
 * Sunburst Chart with Drill-Down for Song Distribution
 ***********************/
// Optional: Call this function if you want a header above your sunburst chart.
function renderSunburstHeader() {
  // This header is separate from the chart and info box.
  const chartContainer = d3.select("#sunburstChart");
  // Remove previous header if it exists.
  chartContainer.select("h2.sunburstHeader").remove();
  chartContainer
    .insert("h2", ":first-child")
    .attr("class", "sunburstHeader")
    .text("Album Distribution (Sunburst Chart)");
}

// updateSunburstChart creates the sunburst and sets up click events.
// Global state object

// Global state object
const drillDownState = { selectedAlbum: null };
const colorScale = d3.scaleOrdinal(d3.schemeSet2);

function hashStringToIndex(str, range) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit int
  }
  return Math.abs(hash) % range;
}

// 🔹 Global: define once
const albumColorMap = new Map();

function generateDistinctColors(count) {
  const baseHues = d3.shuffle(
    Array.from({ length: count }, (_, i) => {
      const segment = i % 3;
      if (segment === 0) return 90 + Math.random() * 60; // Green: 90–150
      if (segment === 1) return 180 + Math.random() * 70; // Blue: 180–250
      return 260 + Math.random() * 40; // Purple: 260–300
    })
  );

  return baseHues.map((hue, i) => {
    const saturation = i % 2 === 0 ? 55 : 75; // moderately vibrant
    const lightness = i % 3 === 0 ? 65 : i % 3 === 1 ? 55 : 45; // avoid too dark
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  });
}

// 🔹 Your main function
function updateSunburstChart(data, artistName) {
  const artistData = data.filter(
    (d) =>
      d.master_metadata_album_artist_name &&
      d.master_metadata_album_artist_name.toLowerCase() ===
        artistName.toLowerCase() &&
      d.master_metadata_album_album_name
  );

  const chartContainer = d3.select("#sunburstChart");

  // Create or reuse the flex container
  let flexContainer = chartContainer.select("div.sunburstFlex");
  if (flexContainer.empty()) {
    flexContainer = chartContainer
      .append("div")
      .attr("class", "sunburstFlex")
      .style("display", "flex")
      .style("flex-direction", "row")
      .style("align-items", "flex-start")
      .style("gap", "calc(var(--spacing) * 10)");

    flexContainer.append("div").attr("class", "sunburstSVG").style("order", 0);
    flexContainer
      .append("div")
      .attr("class", "albumDetailBox")
      .style("order", 1)
      .style("border-radius", "var(--border-radius-small)")
      .style("padding", "var(--spacing)")
      .style("display", "none")
      .style("overflow", "visible !important;");
  } else {
    flexContainer.select("div.sunburstSVG").html("");
  }

  const svgContainer = flexContainer
    .select("div.sunburstSVG")
    .style("display", "flex")
    .style("height", "400px")
    .style("align-items", "center");

  const detailBox = flexContainer
    .select("div.albumDetailBox")
    .style("display", "block");

  // Group tracks under albums
  const albumNodes = d3
    .groups(artistData, (d) => d.master_metadata_album_album_name)
    .map(([album, records]) => {
      const tracks = d3.groups(records, (d) => d.master_metadata_track_name);
      return {
        name: album,
        records,
        children: tracks.map(([track, trackRecords]) => ({
          name: track,
          value: d3.sum(trackRecords, (d) => +d.ms_played / 60000),
        })),
      };
    });

  const hierarchy = {
    name: artistName,
    children: albumNodes,
  };

  const width = 300,
    radius = width / 2;

  const partition = d3.partition().size([2 * Math.PI, radius]);
  const root = d3.hierarchy(hierarchy).sum((d) => d.value);
  partition(root);

  // 🔸 Assign unique persistent colors for new albums
  const allAlbumNames = (root.children || []).map((d) => d.data.name);
  const newAlbumNames = allAlbumNames.filter(
    (name) => !albumColorMap.has(name)
  );
  const newColors = generateDistinctColors(newAlbumNames.length);
  newAlbumNames.forEach((name, i) => {
    albumColorMap.set(name, newColors[i]);
  });

  const margin = 50; // 👈 add space around the edges
  const svgWidth = width + margin * 2;
  const svgHeight = width + margin * 2;

  const svg = svgContainer
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g")
    .attr("transform", `translate(${svgWidth / 2}, ${svgHeight / 2})`);

  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .innerRadius((d) => d.y0)
    .outerRadius((d) => d.y1);

  const paths = svg
    .selectAll("path")
    .data(root.descendants().filter((d) => d.depth))
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", (d) => {
      let albumNode = d;
      while (albumNode.depth > 1) albumNode = albumNode.parent;
      let baseColor = d3.color(albumColorMap.get(albumNode.data.name));

      // Make base album color more vibrant
      baseColor = d3.hsl(baseColor);
      if (d.depth === 1) {
        return baseColor.toString(); // Use vibrant color for album arc
      }

      // Add subtle optimacy (less saturation, slightly lighter/darker)
      const shade = d3.hsl(baseColor);
      shade.s *= 0.5 + 0.7; // reduce saturation slightly
      shade.l += 0.25 * 0.7; // adjust lightness ±10%

      return shade.toString();
    })
    .attr("stroke", "#fff")
    .attr("cursor", "pointer")
    .on("mouseover", function (event, d) {
      const percentage = ((d.value / root.value) * 100).toFixed(2);
      d3.select(this).transition().duration(200).attr("opacity", 0.7);
      d3.select("#sunburstTooltip")
        .interrupt()
        .style("opacity", 1)
        .html(
          `<strong>${d.data.name}</strong><br/>${d.value.toFixed(
            1
          )} minutes<br/>(${percentage}%)`
        )
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mousemove", (event) => {
      d3.select("#sunburstTooltip")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(200).attr("opacity", 1);
      d3.select("#sunburstTooltip")
        .transition()
        .duration(200)
        .style("opacity", 0);
    })
    .on("click", function (event, d) {
      if (d.depth === 1) {
        drillDownState.selectedAlbum = d.data.name;

        paths
          .transition()
          .duration(200)
          .attr("fill", (p) => {
            if (p.depth === 1 && p.data.name === drillDownState.selectedAlbum) {
              return albumColorMap.get(p.data.name);
            }
            if (
              p.depth > 1 &&
              p
                .ancestors()
                .some(
                  (a) =>
                    a.depth === 1 &&
                    a.data.name === drillDownState.selectedAlbum
                )
            ) {
              let albumNode = p.ancestors().find((a) => a.depth === 1);
              return albumColorMap.get(albumNode.data.name);
            }
            return "#f5f5f5";
          })
          .attr("stroke", (p) =>
            p.depth === 1 && p.data.name === drillDownState.selectedAlbum
              ? "#000"
              : "#fff"
          )
          .attr("stroke-width", (p) =>
            p.depth === 1 && p.data.name === drillDownState.selectedAlbum
              ? 4
              : 1
          );

        updateAlbumInfo(d.data.name, artistData, detailBox);
      }
    });

  // Arched labels along the outer edge for top 2–3 albums (≥20%)
  const totalValue = root.value;
  const topAlbums = (root.children || [])
    .map((d) => ({
      node: d,
      percentage: d.value / totalValue,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  const defs = svg.append("defs");

  topAlbums.forEach(({ node }) => {
    const name = node.data.name;
    const safeId = name.replace(/[^a-zA-Z0-9_-]/g, "-"); // replace any unsafe character
    const pathId1 = `arcLine1-${safeId}`;
    const pathId2 = `arcLine2-${safeId}`;

    const midAngle = (node.x0 + node.x1) * 0.65;
    const isLeftSide = midAngle > Math.PI;

    // Determine arc angles
    const startAngle = node.x0;
    const endAngle = node.x1;

    // Radius offsets for each line
    const baseRadius = radius + 6;
    const line1Radius = baseRadius;
    const line2Radius = baseRadius + 13;

    // Create two arc paths (one per line)
    const arcLine1 = d3
      .arc()
      .innerRadius(line1Radius)
      .outerRadius(line1Radius)
      .startAngle(startAngle)
      .endAngle(endAngle);

    const arcLine2 = d3
      .arc()
      .innerRadius(line2Radius)
      .outerRadius(line2Radius)
      .startAngle(startAngle)
      .endAngle(endAngle);

    // Append arc paths to defs
    defs
      .append("path")
      .attr("id", pathId1)
      .attr("d", arcLine1())
      .attr("fill", "none");

    defs
      .append("path")
      .attr("id", pathId2)
      .attr("d", arcLine2())
      .attr("fill", "none");

    // Calculate how much text fits (based on arc length)
    const arcLength = defs.select(`#${pathId1}`).node().getTotalLength();
    const maxCharsPerLine = Math.floor(arcLength / 8); // ~8px per character

    // Smart split into two lines
    function splitTextToTwoLines(text, maxPerLine) {
      const words = text.split(" ");
      let line1 = "",
        line2 = "";
      let current = "";

      for (let i = 0; i < words.length; i++) {
        if ((current + " " + words[i]).trim().length <= maxPerLine) {
          current = (current + " " + words[i]).trim();
        } else {
          line1 = current;
          line2 = words.slice(i).join(" ");
          break;
        }
      }

      if (!line1) {
        line1 = text.slice(0, maxPerLine);
        line2 = text.slice(maxPerLine);
      }

      return [line1.trim(), line2.trim()];
    }

    const [line1, line2] = splitTextToTwoLines(name, maxCharsPerLine / 2);

    // Function to create text along arc with correct flipping
    function addTextPath(lineText, pathId, dyOffset, isLeftSide) {
      const textGroup = svg.append("g");

      if (isLeftSide) {
        // Rotate text group 180° around the arc center
      }

      textGroup
        .append("text")
        .append("textPath")
        .attr("href", `#${pathId}`)
        .style("font-size", "11px")
        .style("fill", "#000")
        .style("pointer-events", "none")
        .attr("dy", dyOffset)
        .attr("dominant-baseline", "middle")
        .text(lineText);
    }

    addTextPath(line2, pathId1, "-0.6em", isLeftSide); // top line
    addTextPath(line1, pathId2, "0.6em", isLeftSide); // bottom line
  });

  // 🔹 Reselect previously selected album if still present
  if (
    drillDownState.selectedAlbum &&
    allAlbumNames.includes(drillDownState.selectedAlbum)
  ) {
    paths
      .transition()
      .duration(0)
      .attr("fill", (p) => {
        if (p.depth === 1 && p.data.name === drillDownState.selectedAlbum) {
          return albumColorMap.get(p.data.name);
        }
        if (
          p.depth > 1 &&
          p
            .ancestors()
            .some(
              (a) =>
                a.depth === 1 && a.data.name === drillDownState.selectedAlbum
            )
        ) {
          let albumNode = p.ancestors().find((a) => a.depth === 1);
          return albumColorMap.get(albumNode.data.name);
        }
        return "#f5f5f5";
      })
      .attr("stroke", (p) =>
        p.depth === 1 && p.data.name === drillDownState.selectedAlbum
          ? "#000"
          : "#fff"
      )
      .attr("stroke-width", (p) =>
        p.depth === 1 && p.data.name === drillDownState.selectedAlbum ? 4 : 1
      );

    updateAlbumInfo(drillDownState.selectedAlbum, artistData, detailBox);
  } else {
    drillDownState.selectedAlbum = null;
  }
}

function updateAlbumInfo(selectedAlbum, artistData, detailBox) {
  const infoContainer = detailBox;
  infoContainer.style("display", "block");
  infoContainer.html(
    "<p style='text-align:center; color:#555; font-style:italic;'>Loading album details…</p>"
  );

  const filtered = artistData.filter(
    (d) =>
      d.master_metadata_album_album_name &&
      d.master_metadata_album_album_name.toLowerCase() ===
        selectedAlbum.toLowerCase()
  );

  if (filtered.length === 0) {
    infoContainer.html(
      "<p class='empty-message'>No details available for the selected album.</p>"
    );
    return;
  }

  const dates = filtered.map((d) => new Date(d.ts));
  const minDate = new Date(Math.min(...dates));
  const totalAlbumPlays = filtered.length;
  const totalAlbumMinutes = d3.sum(filtered, (d) => +d.ms_played / 60000);

  const listensByYear = d3
    .rollups(
      filtered,
      (v) => d3.sum(v, (d) => +d.ms_played / 60000),
      (d) => new Date(d.ts).getFullYear()
    )
    .sort((a, b) => b[1] - a[1]);

  const peakYear = listensByYear.length ? listensByYear[0][0] : "N/A";
  const peakYearMinutes = listensByYear.length ? listensByYear[0][1] : 0;

  const songData = d3
    .rollups(
      filtered,
      (v) => d3.sum(v, (d) => +d.ms_played / 60000),
      (d) => d.master_metadata_track_name
    )
    .map(([track, minutes]) => ({ track, minutes }));

  const firstTrackWithURI = filtered.find(
    (d) => d.spotify_track_uri && d.spotify_track_uri.includes("spotify:track:")
  );

  let albumImageUrl = "";

  function renderAlbumHeaderAndChart() {
    infoContainer.html("");

    const infoContent = infoContainer
      .append("div")
      .attr("class", "infoContent")
      .style("display", "flex")
      .style("flex-direction", "row")
      .style("align-items", "start")
      .style("justify-content", "space-between")
      .style("width", "100%");

    const headerContent = infoContent
      .append("div")
      .attr("class", "headerContent")
      .style("flex", "1")
      .style("display", "flex")
      .style("flex-direction", "row");

    if (albumImageUrl) {
      headerContent
        .append("img")
        .attr("src", albumImageUrl)
        .attr("alt", "Album Artwork")
        .style("width", "20%")
        .style("margin-right", "var(--spacing)")
        .style("border-radius", "var(--border-radius)")
        .style("height", "auto");
    }

    headerContent
      .append("h3")
      .style("margin-left", albumImageUrl ? "var(--spacing)" : "0")
      .text(selectedAlbum);

    infoContent
      .append("button")
      .attr("class", "button")
      .text("X")
      .style("cursor", "pointer")
      .on("click", () => {
        drillDownState.selectedAlbum = null;
        infoContainer.html("").style("display", "none");

        // Reselect all paths and reset color/stroke
        const sunburstPaths = d3
          .select("#sunburstChart")
          .select("div.sunburstSVG")
          .select("svg")
          .selectAll("path");

        d3.select("#sunburstChart")
          .select("div.sunburstSVG")
          .select("svg")
          .selectAll("path")
          .filter(function (d) {
            return d;
          })
          .transition()
          .duration(200)
          .attr("fill", (d) => {
            let current = d;
            while (current.depth > 1) current = current.parent;
            const albumName = current.data.name;
            if (!albumColorMap.has(albumName)) {
              const index = hashStringToIndex(
                albumName,
                colorScale.range().length
              );
              albumColorMap.set(albumName, colorScale(index));
            }
            return albumColorMap.get(albumName);
          })
          .attr("stroke", "#fff")
          .attr("stroke-width", 1);
      });

    // Append chart area below header
    const chartDiv = infoContainer
      .append("div")
      .attr("class", "albumChartDiv")
      .style("margin-top", "var(--spacing)");

    // Use existing logic from `updateAlbumDistribution`
    const dummyArtistData = filtered.map((d) => ({
      ...d,
      master_metadata_album_album_name: selectedAlbum,
    }));

    drillDownState.selectedAlbum = selectedAlbum;
    drillDownState.selectedYear = null;

    // Temporarily set albumDist chart to this container
    d3.select("#albumDist").remove(); // Remove original chart
    chartDiv.attr("id", "albumDist"); // Redirect render target

    updateAlbumDistribution(dummyArtistData); // This will render into our new div
  }

  if (firstTrackWithURI) {
    const trackId = firstTrackWithURI.spotify_track_uri.split(":")[2];
    const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
    fetch(oEmbedUrl)
      .then((res) => res.json())
      .then((embedData) => {
        albumImageUrl = embedData.thumbnail_url || "";
        renderAlbumHeaderAndChart();
      })
      .catch(() => renderAlbumHeaderAndChart());
  } else {
    renderAlbumHeaderAndChart();
  }
}

/***********************
 * Mood & Behavior Sankey with Hover Highlighting
 ***********************/
function updateMoodSankey(data, artistName) {
  const artistData = data.filter(
    (d) =>
      d.master_metadata_album_artist_name &&
      d.master_metadata_album_artist_name.toLowerCase() ===
        artistName.toLowerCase() &&
      d.reason_start &&
      d.reason_end
  );
  if (!artistData.length) {
    d3.select("#moodSankey").html(
      "<p class='empty-message'>No mood or behavior data found for this artist.</p>"
    );
    return;
  }
  const reasonExplanations = {
    clickrow: "User clicked a track row in the UI",
    backbtn: "User pressed the back button",
    playbtn: "User pressed the play button",
    appload: "App loaded or started playing automatically",
    fwdbtn: "User pressed the forward button",
    remote: "Track changed via a remote or external device",
    trackdone: "Track finished playing automatically",
    trackerror: "An error occurred while playing the track",
    endplay: "User ended the play session",
    logout: "User logged out",
    unknown: "Unknown or unclassified reason",
  };
  const reasons = new Set();
  artistData.forEach((d) => {
    reasons.add(d.reason_start);
    reasons.add(d.reason_end);
  });
  const reasonsArray = Array.from(reasons).sort();
  const nodes = reasonsArray.map((r) => ({ name: r }));
  const nodeIndex = {};
  nodes.forEach((n, i) => {
    nodeIndex[n.name] = i;
  });
  const links = d3
    .rollups(
      artistData,
      (v) => v.length,
      (d) => d.reason_start + "||" + d.reason_end
    )
    .map(([key, value]) => {
      const parts = key.split("||");
      return {
        source: nodeIndex[parts[0]],
        target: nodeIndex[parts[1]],
        value,
      };
    })
    .filter((link) => link.source !== link.target && link.source < link.target);
  const maxCombo = links.reduce((max, d) => (d.value > max.value ? d : max), {
    value: 0,
  });

  const container = d3.select("#moodSankey");
  // Ensure container has relative positioning
  container.style("position", "relative");
  container.selectAll(".sankey-wrapper").remove();

  const layout = container
    .append("div")
    .attr("class", "sankey-wrapper")
    .style("display", "flex")
    .style("gap", "20px")
    .style("justify-content", "space-around")
    .style("margin-top", "var(--spacing)")
    .style("margin-bottom", "var(--spacing)");

  const width = 400,
    height = 400;
  const svg = layout.append("svg").attr("width", width).attr("height", height);

  // Create tooltip once
  const tooltip = container
    .append("div")
    .attr("class", "sankey-tooltip")
    .style("position", "absolute")
    .style("z-index", 10)
    .style("pointer-events", "none")
    .style("background", "#fff")
    .style("border", "1px solid #ccc")
    .style("padding", "8px")
    .style("font-size", "var(--font-small-size)")
    .style("border-radius", "4px")
    .style("box-shadow", "0 0 6px rgba(0,0,0,0.1)")
    .style("opacity", 0);

  const sankey = d3
    .sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .extent([
      [1, 1],
      [width - 1, height - 6],
    ]);

  const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
    nodes: nodes.map((d) => Object.assign({}, d)),
    links: links.map((d) => Object.assign({}, d)),
  });

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const linkSelection = svg
    .append("g")
    .selectAll("path")
    .data(sankeyLinks)
    .enter()
    .append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (d) => color(d.source.name))
    .attr("stroke-width", (d) => Math.max(1, d.width))
    .attr("fill", "none")
    .attr("opacity", 0.5);

  const node = svg
    .append("g")
    .selectAll("g")
    .data(sankeyNodes)
    .enter()
    .append("g")
    .on("mouseover", function (event, d) {
      // Show linked nodes
      linkSelection.attr("opacity", (link) =>
        link.source.name === d.name || link.target.name === d.name ? 1 : 0.1
      );

      // Use d3.pointer to compute positions relative to the container
      const [x, y] = d3.pointer(event, container.node());
      tooltip
        .style("display", "block") // Ensure tooltip is displayed
        .html(
          `<strong>${d.name}</strong><br/>${reasonExplanations[d.name] || ""}`
        )
        .style("left", x + 10 + "px")
        .style("top", y + 10 + "px")
        .transition()
        .duration(200)
        .style("opacity", 1);
    })
    .on("mousemove", function (event) {
      const [x, y] = d3.pointer(event, container.node());
      tooltip.style("left", x + 10 + "px").style("top", y + 10 + "px");
    })
    .on("mouseout", function () {
      linkSelection.attr("opacity", 0.5);
      tooltip
        .transition()
        .duration(200)
        .style("opacity", 0)
        .on("end", function () {
          d3.select(this).style("display", "none");
        });
    });

  node
    .append("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("fill", (d) => color(d.name))
    .attr("stroke", "#000");

  node
    .append("text")
    .attr("x", (d) => d.x0 - 6)
    .attr("y", (d) => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .text((d) => d.name)
    .filter((d) => d.x0 < width / 2)
    .attr("x", (d) => d.x1 + 6)
    .attr("text-anchor", "start");

  // Calculate insights
  const startCounts = d3.rollup(
    artistData,
    (v) => v.length,
    (d) => d.reason_start
  );
  const endCounts = d3.rollup(
    artistData,
    (v) => v.length,
    (d) => d.reason_end
  );
  const mostCommonStart = Array.from(startCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const mostCommonEnd = Array.from(endCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0];
  const totalTransitions = d3.sum(links, (d) => d.value);
  const getReasonName = (r) => reasonExplanations[r] || r;

  const rightPanel = layout
    .append("div")
    .attr("class", "info-panel")
    .style("width", "50%")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "var(--spacing)");

  const infoBox = rightPanel
    .append("div")
    .attr("class", "info-box")
    .style("font-size", "var(--font-small-size)")
    .style("background", "rgba(76, 175, 79, 0.1)")
    .style("padding", "var(--spacing)")
    .style("border", "1px solid #ddd")
    .style("border-radius", "var(--border-radius-small)");

  console.log("All transitions:", artistData.length);
  console.log("Filtered Sankey transitions:", links.length);
  infoBox.html(`
    <p>This Sankey diagram visualizes how songs begin and end during your sessions with <strong>${artistName}</strong>.</p>
    <p>Each <strong>node</strong> represents a reason a track was started or stopped, and each <strong>link</strong> shows how frequently transitions occurred between those reasons.</p>
    <ul>
      <li><strong>Total transitions recorded:</strong> ${totalTransitions} — this counts how many times songs moved from one reason to another (e.g., play button → track finished)</li>
      <li><strong>Most common starting reason:</strong> <em>${getReasonName(
        mostCommonStart[0]
      )}</em> (${mostCommonStart[1]} times)</li>
      <li><strong>Most common ending reason:</strong> <em>${getReasonName(
        mostCommonEnd[0]
      )}</em> (${mostCommonEnd[1]} times)</li>
      <li><strong>Most frequent transition:</strong> <em>${getReasonName(
        sankeyNodes[maxCombo.source]?.name
      )}</em> → <em>${getReasonName(
    sankeyNodes[maxCombo.target]?.name
  )}</em> (${maxCombo.value} plays)</li>
    </ul>
    <p>This may reveal listening habits — for example, frequent use of the forward button might indicate skipping, while “trackdone” suggests more passive listening.</p>
  `);
}

/***********************
 * Update All Charts for Selected Artist
 ***********************/
function updateAllCharts(data, artistName) {
  // Reset drill down state
  drillDownState.selectedYear = null;
  const chartContainer = d3.select("#albumDist");
  chartContainer.html("");
  chartContainer.append("h2").text("Album Details");

  if (chartContainer.select("#albumPlaceholder").empty()) {
    chartContainer
      .append("p")
      .attr("id", "albumPlaceholder")
      .style("text-align", "center")
      .style("font-style", "italic")
      .style("color", "#555")
      .style("margin-bottom", "10px")
      .text("Select an album to see more details");
  }
  // Do not update the artist info here to prevent refreshing the info box
  updatePeakListening(data, artistName);
  updateScatterPlot(data, artistName);
  updateBarChart(data, artistName);
  updateSunburstChart(data, artistName);
  updateMoodSankey(data, artistName);
}

/***********************
 * Initialize Search and Load Data
 ***********************/
function initArtistSearch(data) {
  const artistSet = new Set();
  data.forEach((d) => {
    if (d.master_metadata_album_artist_name) {
      artistSet.add(d.master_metadata_album_artist_name);
    }
  });
  const artists = Array.from(artistSet).sort();
  const input = document.getElementById("artistSearchInput");
  const dropdown = document.getElementById("artistDropdown");

  let currentIndex = -1;
  let filteredArtists = [];

  function updateSelection(index) {
    const items = dropdown.querySelectorAll("li");
    items.forEach((li, i) => {
      li.classList.toggle("highlight", i === index);
      if (i === index) {
        li.scrollIntoView({ block: "nearest" }); // 👈 ensures visibility
      }
    });
  }

  function showDropdown() {
    const query = input.value.toLowerCase();
    dropdown.innerHTML = "";
    currentIndex = -1;
    if (query === "") {
      dropdown.style.display = "none";
      return;
    }
    filteredArtists = artists.filter((artist) =>
      artist.toLowerCase().includes(query)
    );
    if (filteredArtists.length > 0) {
      filteredArtists.forEach((artist) => {
        const li = document.createElement("li");
        li.textContent = artist;
        li.addEventListener("click", () => {
          input.value = artist;
          dropdown.innerHTML = "";
          dropdown.style.display = "none";
          updateArtistInfo(data, artist);
          updateAllCharts(data, artist);
        });
        dropdown.appendChild(li);
      });
      dropdown.style.display = "block";
    } else {
      dropdown.style.display = "none";
    }
  }

  input.addEventListener("input", showDropdown);

  input.addEventListener("keydown", (event) => {
    const items = dropdown.querySelectorAll("li");
    if (event.key === "ArrowDown") {
      if (filteredArtists.length > 0) {
        currentIndex = (currentIndex + 1) % filteredArtists.length;
        updateSelection(currentIndex);
      }
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      if (filteredArtists.length > 0) {
        currentIndex =
          (currentIndex - 1 + filteredArtists.length) % filteredArtists.length;
        updateSelection(currentIndex);
      }
      event.preventDefault();
    } else if (event.key === "Enter") {
      if (currentIndex >= 0 && currentIndex < filteredArtists.length) {
        input.value = filteredArtists[currentIndex];
      }
      dropdown.style.display = "none";
      const artist = input.value.trim();
      updateArtistInfo(data, artist);
      updateAllCharts(data, artist);
    }
  });

  document.addEventListener("click", (event) => {
    if (!input.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.style.display = "none";
    }
  });

  document.getElementById("artistSearchBtn").addEventListener("click", () => {
    const artist = input.value.trim();
    updateArtistInfo(data, artist);
    updateAllCharts(data, artist);
  });
}


/***********************
 * Event Listener for Applying Date Range
 ***********************/
document.getElementById("applyRangeBtn").addEventListener("click", () => {
  const startDate = new Date(document.getElementById("startDate").value);
  const endDate = new Date(document.getElementById("endDate").value);
  if (isNaN(startDate) || isNaN(endDate)) return;
  const filteredData = window.allParsedData.filter((d) => {
    const date = new Date(d.ts);
    return date >= startDate && date <= endDate;
  });
  updateAllCharts(filteredData, currentArtistName);
});

// Toggle the Song Distribution (Scatter Plot) container
document.getElementById("toggleSong").addEventListener("change", function () {
  const scatterChart = document.getElementById("scatterChart");
  if (this.checked) {
    scatterChart.style.display = "block";
  } else {
    scatterChart.style.display = "none";
  }
});

// Toggle the Album Distribution (Sunburst Chart) container
document.getElementById("toggleAlbum").addEventListener("change", function () {
  const sunburstChart = document.getElementById("sunburstChart");
  if (this.checked) {
    sunburstChart.style.display = "block";
  } else {
    sunburstChart.style.display = "none";
  }
});

// Load CSV and initialize
fetch("data/astrid_data.csv")
  .then((response) => response.text())
  .then((csvText) => {
    const parsedData = d3.csvParse(csvText);
    window.allParsedData = parsedData;
    initArtistSearch(parsedData);
    const topArtist = parsedData
      .map((d) => d.master_metadata_album_artist_name)
      .filter(Boolean)
      .reduce((acc, artist) => {
        acc[artist] = (acc[artist] || 0) + 1;
        return acc;
      }, {});
    const mostPlayedArtist = Object.entries(topArtist).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
    if (mostPlayedArtist) {
      updateArtistInfo(parsedData, mostPlayedArtist);
      updateAllCharts(parsedData, mostPlayedArtist);
      document.getElementById("artistSearchInput").value = mostPlayedArtist;
    }
  })
  .catch((error) => {
    console.error("Error loading CSV data:", error);
    d3.select("#lineChart").html(
      "<p class='empty-message'>Failed to load data.</p>"
    );
  });
