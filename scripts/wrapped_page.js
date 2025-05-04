

console.log("wrapped_page.js loaded");

const USE_TEXT_MODE = false;

const leftPadding = 40;
const topPadding = 20;
const noDataColor = "#ebedf0";
const chartMargin = { top: 30, right: 30, bottom: 60, left: 70 };
const topListChartMargin = { top: 10, right: 50, bottom: 20, left: 120 };
const barHeight = 20;

const wrappedYearSelect = document.getElementById("wrappedYearSelect");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const applyRangeBtn = document.getElementById("applyRangeBtn");
const mainChartDiv = document.getElementById("calendar");
const topArtistsContainer = document.getElementById("top-artists-chart");
const tooltipDiv = d3.select("#tooltip");
const topTracksContainer = document.getElementById("top-tracks-chart");
const timeOfDayDiv = document.getElementById("time-of-day-chart");
const dayOfWeekDiv = document.getElementById("day-of-week-chart");
const filterInfoSpan = document.getElementById("current-filter-info");
const streamgraphContainer = document.getElementById("streamgraph-chart"); // Ensure exists if used
const forceGraphContainer = document.getElementById("force-graph-chart");
const forceGraphSlider = document.getElementById("forceGraphSlider");
const forceGraphSliderValueSpan = document.getElementById("forceGraphSliderValue");

console.log("DOM elements selected");

const formatDay = d3.timeFormat("%Y-%m-%d");
const formatDate = d3.timeFormat("%a, %b %d, %Y");
const formatMonth = d3.timeFormat("%b");
const formatFullMonthYear = d3.timeFormat("%B %Y");
const formatTime = (mins) => {
    if (mins === undefined || mins === null || isNaN(mins)) return "N/A";
    if (mins < 1 && mins > 0) return `< 1 min`;
    if (mins <= 0) return `0 min`;
    if (mins < 60) return `${Math.round(mins)} min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = Math.round(mins % 60);
    return `${hours}h ${remainingMins}m`;
};
const formatDateForInput = d3.timeFormat("%Y-%m-%d");
const dayOfWeekNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function truncateText(text, maxLength) {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
}

let allParsedData = [];
let requiredColumns = {
    track_name: true, artist: true, album: true, img: true, platform: true, skipped: true, shuffle: true,
    episode_name: true, episode_show_name: true, audiobook_title: true, audiobook_chapter_title: true,
    reason_start: true, reason_end: true, conn_country: true,
};
let currentViewData = []; 
let svgInstance = null;
let currentForceGraphTopN = 5;
let overallMinDate = null;
let overallMaxDate = null;
let lineGraphBrush = null; // The brush behavior
let lineGraphXScale = null; // The current X scale of the line graph




// --- Data Processing (Runs once on load) ---
(async function loadData() {
    console.log("loadData started");
    try {
        const rawData = await d3.csv("data/astrid_data.csv");
        console.log(`CSV data fetched (${rawData.length} rows)`);

        // Parse and filter data
        const mappedData = rawData.map((d) => ({
            ts: new Date(d.ts), // Directly parse
            ms_played: +d.ms_played, // Convert to number
            platform: d.platform || "Unknown",
            conn_country: d.conn_country || "Unknown",
            artist: d.master_metadata_album_artist_name || "Unknown Artist",
            track: d.master_metadata_track_name || "Unknown Track",
            album: d.master_metadata_album_album_name || "Unknown Album",
            // Include other fields used by charts
            episode_name: d.episode_name || null,
            episode_show_name: d.episode_show_name || null,
            skipped: ["true", "1", true].includes(String(d.skipped).toLowerCase()),
            shuffle: ["true", "1", true].includes(String(d.shuffle).toLowerCase()),
            spotify_track_uri: d.spotify_track_uri || null,
        }));

        allParsedData = mappedData.filter((d, index) => {
            const isTsValid = d.ts instanceof Date && !isNaN(d.ts);
            const isMsPlayedValid = typeof d.ms_played === 'number' && !isNaN(d.ms_played) && d.ms_played >= 0;
            const isValid = isTsValid && isMsPlayedValid;

            return isValid; // Keep only valid records
        });

        // Sort data chronologically
        allParsedData.sort((a, b) => a.ts - b.ts);
        console.log(`Loaded and parsed ${allParsedData.length} valid records.`);

        // Handle no valid data found
        if (allParsedData.length === 0) {
            console.error("No valid data found after parsing.");
            if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">No valid data found.</p>`;
            if (filterInfoSpan) filterInfoSpan.textContent = "No data loaded";
            [topArtistsContainer, topTracksContainer, timeOfDayDiv, dayOfWeekDiv, streamgraphContainer, forceGraphContainer].forEach(el => { if (el) el.innerHTML = `<p class="empty-message">No data.</p>`; });
            [wrappedYearSelect, startDateInput, endDateInput, applyRangeBtn, forceGraphSlider].forEach(el => { if (el) el.disabled = true; });
            return;
        }

        // Determine overall date range and available years
        overallMinDate = d3.min(allParsedData, d => d.ts);
        overallMaxDate = d3.max(allParsedData, d => d.ts);
        const years = [...new Set(allParsedData.map(d => d.ts.getFullYear()))].sort((a, b) => a - b);
        console.log("Available years:", years);
        console.log("Overall date range:", overallMinDate, "to", overallMaxDate);

        // Populate year selector dropdown
        if (wrappedYearSelect) {
            wrappedYearSelect.innerHTML = ''; // Clear existing options
            const allTimeOption = document.createElement("option"); allTimeOption.value = "all"; allTimeOption.textContent = "All Time"; wrappedYearSelect.appendChild(allTimeOption);
            years.forEach((y) => { const opt = document.createElement("option"); opt.value = y; opt.textContent = y; wrappedYearSelect.appendChild(opt); });
            wrappedYearSelect.value = "all"; // Default to "All Time"
        } else { console.error("Cannot find #wrappedYearSelect."); }

        // Set initial date input values to overall range
        if (startDateInput && endDateInput && overallMinDate && overallMaxDate) {
            const minDateStr = formatDateForInput(overallMinDate); const maxDateStr = formatDateForInput(overallMaxDate);
            startDateInput.value = minDateStr; endDateInput.value = maxDateStr;
            startDateInput.min = minDateStr; startDateInput.max = maxDateStr;
            endDateInput.min = minDateStr; endDateInput.max = maxDateStr;
            console.log(`Set initial date range inputs: ${minDateStr} to ${maxDateStr}`);
        } else { console.error("Could not set initial date input values."); }

        // Setup force graph slider initial value display
        if (forceGraphSlider && forceGraphSliderValueSpan) {
            currentForceGraphTopN = parseInt(forceGraphSlider.value, 10);
            forceGraphSliderValueSpan.textContent = currentForceGraphTopN;
        } else { console.warn("Force graph slider elements not found."); }

        // Trigger the first rendering of the dashboard
        console.log("Triggering initial visualization...");
        await updateVisualization(allParsedData); // Use await as updateVisualization is async
        console.log("Initial visualization complete.");

    } catch (error) {
        console.error("Error in loadData:", error);
        if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">Error loading data.</p>`;
        if (filterInfoSpan) filterInfoSpan.textContent = 'Error loading data';
        [topArtistsContainer, topTracksContainer, timeOfDayDiv, dayOfWeekDiv, streamgraphContainer, forceGraphContainer].forEach(el => { if (el) el.innerHTML = `<p class="error-message">Error loading data.</p>`; });
        [wrappedYearSelect, startDateInput, endDateInput, applyRangeBtn, forceGraphSlider].forEach(el => { if (el) el.disabled = true; });
    } finally {
        console.log("Setting up event listeners...");
        setupEventListeners(); // Ensure listeners are attached
        console.log("loadData finished.");
    }
})(); // Immediately invoke the async loadData function

// --- Tooltip Logic ---
const showTooltip = (event, content) => {
    tooltipDiv.style("opacity", 1).html(content)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
};
const moveTooltip = (event) => {
    tooltipDiv.style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
};
const hideTooltip = () => {
    tooltipDiv.style("opacity", 0);
};

// --- Filter Info Label Update ---
// Shows the date range currently displayed in the line graph
function updateFilterInfoLabel(startDate, endDate) {
    if (!filterInfoSpan) return;
    if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
        filterInfoSpan.textContent = `${formatDate(startDate)} → ${formatDate(endDate)}`;
    } else {
        filterInfoSpan.textContent = "No data loaded or selected"; // Fallback
    }
}

// --- Plotting Functions ---

// Draws the main line graph for a given data subset and display date range (domain)
function drawLineGraph(dataToDisplay, displayStartDate, displayEndDate) {
    console.log(`drawLineGraph called for range: ${displayStartDate ? formatDate(displayStartDate) : 'N/A'} to ${displayEndDate ? formatDate(displayEndDate) : 'N/A'}`);
    mainChartDiv.innerHTML = ""; svgInstance = null; lineGraphXScale = null; // Clear previous

    // --- Data Preparation ---
    // Ensure dataToDisplay is valid array
    if (!Array.isArray(dataToDisplay)) {
        console.error("drawLineGraph: dataToDisplay is not an array.");
        return; // Or handle appropriately
    }
    const listeningData = dataToDisplay.filter(d => d.ms_played > 0);

    // Ensure display dates are valid Date objects
    const validDisplayStartDate = displayStartDate instanceof Date && !isNaN(displayStartDate) ? d3.timeDay.floor(displayStartDate) : null;
    const validDisplayEndDate = displayEndDate instanceof Date && !isNaN(displayEndDate) ? d3.timeDay.floor(displayEndDate) : null;

    // Handle cases where the range is invalid or no listening data exists
    if (!validDisplayStartDate || !validDisplayEndDate || validDisplayStartDate > validDisplayEndDate) {
        console.error("drawLineGraph: Invalid display date range.", validDisplayStartDate, validDisplayEndDate);
        if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">Invalid date range for display.</p>`;
        updateFilterInfoLabel(validDisplayStartDate, validDisplayEndDate); // Show the range even if invalid
        return;
    }
     if (listeningData.length === 0 && dataToDisplay.length > 0) {
        console.log("drawLineGraph: No listening data (ms_played > 0) for the provided data subset.");
        // Still draw the axes and brush area, but no line/area
    } else if (dataToDisplay.length === 0) {
         console.log("drawLineGraph: No data at all provided to display.");
         if (mainChartDiv) mainChartDiv.innerHTML = `<p class="empty-message">No data for this period.</p>`;
         updateFilterInfoLabel(validDisplayStartDate, validDisplayEndDate);
         return
    }


    // Aggregate listening time by day *only* from the data subset passed in
    const dailyDataMap = d3.rollup(listeningData, v => d3.sum(v, d => d.ms_played / 60000), d => d3.timeDay.floor(d.ts));

    // Create data points *only* for the days within the specified display range
    const daysInDisplayRange = d3.timeDays(validDisplayStartDate, d3.timeDay.offset(validDisplayEndDate, 1));
    const processedDisplayData = daysInDisplayRange.map(day => ({
        date: day,
        value: dailyDataMap.get(day) || 0 // Get value from the map (or 0 if no data for that day)
    }));

    // --- Chart Setup ---
    const containerWidth = mainChartDiv.clientWidth > 0 ? mainChartDiv.clientWidth : 600;
    const chartHeight = 300;
    const width = containerWidth - chartMargin.left - chartMargin.right;
    const height = chartHeight - chartMargin.top - chartMargin.bottom;

    if (width <= 0 || height <= 0) {
        console.error("drawLineGraph: Container too small.");
        if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">Container too small.</p>`;
        return;
    }

    const svg = d3.select(mainChartDiv).append("svg").attr("width", containerWidth).attr("height", chartHeight).attr("viewBox", `0 0 ${containerWidth} ${chartHeight}`).attr("preserveAspectRatio", "xMinYMid meet");
    svgInstance = svg; // Store SVG reference globally
    const chartGroup = svg.append("g").attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);

    // --- Scales ---
    // X Scale: Domain is the specific range we want to display (zoom level)
    const xScale = d3.scaleTime().domain([validDisplayStartDate, validDisplayEndDate]).range([0, width]);
    lineGraphXScale = xScale; // Store the current X scale globally

    // Y Scale: Domain calculated based *only* on the data visible in the current display range
    const yMax = d3.max(processedDisplayData, d => d.value) || 1; // Use 1 if max is 0 or negative (shouldn't be)
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]).nice();

    // --- Axes ---
    const xAxis = d3.axisBottom(xScale).ticks(width / 80).tickSizeOuter(0).tickFormat(d3.timeFormat("%b %d %Y"));
    const xAxisGroup = chartGroup.append("g").attr("class", "axis axis--x").attr("transform", `translate(0, ${height})`).call(xAxis);
    xAxisGroup.selectAll("text").style("text-anchor", "end").attr("dx", "-.8em").attr("dy", ".15em").attr("transform", "rotate(-65)");
    chartGroup.append("text").attr("class", "axis-label").attr("transform", `translate(${width / 2}, ${height + chartMargin.bottom - 5})`).style("text-anchor", "middle").text("Date");
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatTime);
    chartGroup.append("g").attr("class", "axis axis--y").call(yAxis).call(g => g.select(".domain").remove()).call(g => g.selectAll(".tick line").remove());
    chartGroup.append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", 0 - chartMargin.left + 15).attr("x", 0 - (height / 2)).attr("dy", "1em").style("text-anchor", "middle").text("Total Listening Time per Day");

    // --- Area and Line Generators ---
    const areaGen = d3.area().x(d => xScale(d.date)).y0(height).y1(d => yScale(d.value)).curve(d3.curveMonotoneX);
    const lineGen = d3.line().x(d => xScale(d.date)).y(d => yScale(d.value))
        // Define line only where data exists and is within the x-domain (important for zoom)
        .defined(d => d.value > 0 && d.date >= validDisplayStartDate && d.date <= validDisplayEndDate)
        .curve(d3.curveMonotoneX);

    // Add a clip path to prevent lines/area exceeding axes
    chartGroup.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    // Group for clipped content
    const mainContentGroup = chartGroup.append("g")
        .attr("clip-path", "url(#clip)");

    // Draw Area and Line paths within the clipped group only if there's data
    if (listeningData.length > 0) {
        mainContentGroup.append("path").datum(processedDisplayData).attr("class", "area").attr("fill", "#1DB954").attr("fill-opacity", 0.4).attr("d", areaGen);
        mainContentGroup.append("path").datum(processedDisplayData).attr("class", "line").attr("fill", "none").attr("stroke", "#1DB954").attr("stroke-width", 1.5).attr("d", lineGen);
    }

    // --- Tooltip Interaction Setup ---
    const focus = chartGroup.append("g").attr("class", "focus").style("display", "none");
    focus.append("line").attr("class", "focus-line y").attr("stroke", "#666").attr("stroke-width", 1).attr("stroke-dasharray", "3,3").attr("y1", 0).attr("y2", height);
    focus.append("circle").attr("class", "focus-circle").attr("r", 4).attr("fill", "#1DB954").attr("stroke", "white");
    // Overlay for tooltip mouse events (ADD BEFORE BRUSH)
    chartGroup.append("rect").attr("class", "tooltip-overlay") // Use specific class
        .attr("width", width).attr("height", height).style("fill", "none").style("pointer-events", "all")
        .on("mouseover", () => focus.style("display", null))
        .on("mouseout", () => { focus.style("display", "none"); hideTooltip(); })
        .on("mousemove", mousemove); // Define mousemove below

    const bisectDate = d3.bisector(d => d.date).left;
    function mousemove(event) {
        if (!lineGraphXScale || processedDisplayData.length === 0) return;
        const pointer = d3.pointer(event, this);
        const x0 = lineGraphXScale.invert(pointer[0]);
        const i = bisectDate(processedDisplayData, x0, 1);
        const d0 = processedDisplayData[i - 1]; const d1 = processedDisplayData[i];
        const d = (!d0 || !d1 || (x0 - d0.date > d1.date - x0)) ? d1 : d0;
        if (d) {
            focus.style("display", null);
            focus.select(".focus-line.y").attr("transform", `translate(${lineGraphXScale(d.date)}, 0)`);
            focus.select(".focus-circle").attr("transform", `translate(${lineGraphXScale(d.date)}, ${yScale(d.value)})`);
            showTooltip(event, `${formatDate(d.date)}<br><b>Listened: ${formatTime(d.value)}</b>`);
        } else { focus.style("display", "none"); hideTooltip(); }
    }

    async function brushed({ selection, sourceEvent }) { 
        if (!sourceEvent) return;

        console.log("--- BRUSHED FUNCTION ENTERED (User Event) ---");
        console.log("Brush event selection:", selection);

        // If brush is cleared by user clicking outside selection
        if (!selection) {
            console.log("Brush cleared by user click.");
            // Check if we are already zoomed out
            const currentDomain = lineGraphXScale.domain();
            const [viewStartDate, viewEndDate] = d3.extent(currentViewData, d => d.ts);

            // Only reset zoom if not already showing the full view
            if (currentDomain && viewStartDate && viewEndDate &&
               (currentDomain[0].getTime() !== viewStartDate.getTime() || currentDomain[1].getTime() !== viewEndDate.getTime()))
            {
                console.log("Resetting zoom to full view range:", viewStartDate, viewEndDate);
                // Redraw the line graph zoomed out
                drawLineGraph(currentViewData, viewStartDate, viewEndDate);
                // Update dependent charts with full view data
                console.log("Calling handleBrushUpdate with full view data");
                await handleBrushUpdate(currentViewData);
                // Update label to reflect the full view range
                updateFilterInfoLabel(viewStartDate, viewEndDate);
            } else {
                console.log("Brush cleared, but already displaying full view range. No redraw needed.");
            }
            return; // Exit handler
        }

        // If a selection was made by the user
        const [x0, x1] = selection; // Pixel coordinates
        console.log("Brush selection (pixels):", x0, x1);

        if (!lineGraphXScale) { console.error("brushed: lineGraphXScale is null!"); return; }

        // Convert pixel coordinates to dates
        const date0 = lineGraphXScale.invert(x0); // Keep precise time initially
        const date1 = lineGraphXScale.invert(x1);
        // Floor dates for filtering and domain setting
        const flooredDate0 = d3.timeDay.floor(date0);
        const flooredDate1 = d3.timeDay.floor(date1);
        console.log("Calculated dates (floored):", flooredDate0, flooredDate1);


        if (!flooredDate0 || !flooredDate1 || isNaN(flooredDate0) || isNaN(flooredDate1) || flooredDate0.getTime() >= flooredDate1.getTime()) {
            console.warn("Invalid date range from brush (start >= end or NaN). Clearing brush.");
            // Clear the brush visual WITHOUT triggering the 'brushed' handler again
             d3.select(this).call(lineGraphBrush.move, null);
            return;
        }

        console.log(`Brush selected range: ${formatDate(flooredDate0)} to ${formatDate(flooredDate1)}`);


        console.log("Redrawing graph zoomed to selection...");
        drawLineGraph(currentViewData, flooredDate0, flooredDate1);

        const filterStart = flooredDate0;
        const filterEnd = d3.timeDay.offset(flooredDate1, 1);
        const filteredForDependents = currentViewData.filter(d => d.ts >= filterStart && d.ts < filterEnd);
        console.log(`Filtered data for dependent charts count: ${filteredForDependents.length}`);

        console.log("Calling handleBrushUpdate with filtered data...");
        await handleBrushUpdate(filteredForDependents);
        console.log("handleBrushUpdate finished.");

        if(startDateInput) startDateInput.value = formatDateForInput(flooredDate0);
        if(endDateInput) endDateInput.value = formatDateForInput(flooredDate1);
        if (wrappedYearSelect) wrappedYearSelect.value = ""; 
        updateFilterInfoLabel(flooredDate0, flooredDate1); 

        console.log("Brush visual remains to show zoom range (handled by redraw).");
    }

    lineGraphBrush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", brushed); 

    const brushGroup = chartGroup.append("g")
        .attr("class", "brush") 
        .call(lineGraphBrush);
    console.log("Brush applied AFTER tooltip overlay. Brush Group Element:", brushGroup.node());

    updateFilterInfoLabel(validDisplayStartDate, validDisplayEndDate);

    console.log("drawLineGraph finished");
} 



async function updateTopArtistsAsText(data) { 
  const placeholderImg = "https://via.placeholder.com/80";
  const targetUl = document.getElementById("top-artists-chart");
  if (!targetUl) return;

  targetUl.innerHTML = "";

  if (!data || data.length === 0) {
    targetUl.innerHTML = `<li class="empty-message">No data.</li>`;
    return;
  }

  const artistData = d3
    .rollups(
      data.filter(
        (d) => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0
      ),
      (v) => d3.sum(v, (d) => d.ms_played / 60000),
      (d) => d.artist
    )
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(0, 5); 

  if (artistData.length === 0) {
    targetUl.innerHTML = `<li class="empty-message">No artist data.</li>`;
    return;
  }

  const imageFetchPromises = artistData.map(async ([artist, totalMinutes], index) => {
    const artistTracks = data.filter(
      (d) =>
        d.artist &&
        d.artist.toLowerCase() === artist.toLowerCase() &&
        d.spotify_track_uri &&
        d.spotify_track_uri.includes("spotify:track:")
    );
    const trackWithUri = artistTracks[0];
    let imgUrl = placeholderImg; 

    if (trackWithUri) {
      try {
        const trackId = trackWithUri.spotify_track_uri.split(":")[2];
        const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
        const res = await fetch(oEmbedUrl);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const embedData = await res.json();
        imgUrl = embedData?.thumbnail_url || placeholderImg;
      } catch (error) {
        console.warn(`oEmbed fetch failed for ${artist}:`, error);
      }
    }
    return { artist, totalMinutes, index, imgUrl };
  });

  try {
    const results = await Promise.all(imageFetchPromises);


    targetUl.innerHTML = "";
    if (results.length === 0) { 
         targetUl.innerHTML = `<li class="empty-message">No artist data after fetch.</li>`;
         return;
    }

    results.forEach(result => {
      const li = document.createElement("li");
      li.style.listStyle = "none";
      li.style.display = "flex";
      li.style.flexDirection = "row";
      li.style.marginBottom = "var(--spacing)";
      li.style.alignItems = "center";

      li.innerHTML = `
        <img src="${result.imgUrl}" alt="${result.artist}" class="artist-img" style="margin-right: var(--spacing);" />
        <span class="artist-name">${result.index + 1}. ${result.artist}</span>
        <span class="artist-time">(${formatTime(result.totalMinutes)})</span>
      `;
      targetUl.appendChild(li);
    });

  } catch (error) {
      console.error("Error rendering top artists list:", error);
      targetUl.innerHTML = `<li class="error-message">Error loading artist images.</li>`;
  }
}

async function updateTopTracksAsText(data) { 
  const targetDiv = document.getElementById("top-tracks-chart");
  if (!targetDiv) return;

  targetDiv.innerHTML = "";

  if (!requiredColumns.track_name) {
    targetDiv.innerHTML = `<p class="error-message">Track data missing.</p>`;
    return;
  }
  if (!data || data.length === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No data.</p>`;
    return;
  }

  const trackData = d3
    .rollups(
      data.filter(
        (d) =>
          d.track &&
          d.track !== "Unknown Track" &&
          d.track !== "N/A" &&
          d.ms_played > 0
      ),
      (v) => d3.sum(v, (d) => d.ms_played / 60000),
      (d) => `${d.track} • ${d.artist}`
    )
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(0, 5); 

  if (trackData.length === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No track data.</p>`;
    return;
  }

  const placeholderImg = "https://via.placeholder.com/80";

  const imageFetchPromises = trackData.map(async ([trackArtist, totalMinutes], index) => {
    const parts = trackArtist.split(" • ");
    const trackName = parts[0]?.trim() || "Unknown Track";
    const artistName = parts[1]?.trim() || "Unknown Artist";

    const trackMatch = data.find(
      (d) =>
        d.track === trackName &&
        d.artist === artistName &&
        d.spotify_track_uri?.includes("spotify:track:")
    );

    let imgUrl = placeholderImg; 

    if (trackMatch && trackMatch.spotify_track_uri) {
       try {
         const trackId = trackMatch.spotify_track_uri.split(":")[2];
         const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
         const res = await fetch(oEmbedUrl);
         if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
         const embedData = await res.json();
         imgUrl = embedData?.thumbnail_url || placeholderImg;
       } catch (error) {
          console.warn(`oEmbed fetch failed for ${trackName}:`, error);
       }
    }
    return { trackName, artistName, totalMinutes, index, imgUrl };
  });


  try {
    const results = await Promise.all(imageFetchPromises);


    targetDiv.innerHTML = "";
     if (results.length === 0) { 
         targetDiv.innerHTML = `<p class="empty-message">No track data after fetch.</p>`;
         return;
    }

    results.forEach(result => {
      const li = document.createElement("li");
      li.style.listStyle = "none";
      li.style.display = "flex";
      li.style.flexDirection = "row";
      li.style.alignItems = "center";
      li.style.marginBottom = "var(--spacing)";

      li.innerHTML = `
        <img src="${result.imgUrl}" alt="${result.trackName}" class="artist-img" style="margin-right: var(--spacing);" />
        <span class="track-info" style="flex-grow: 1;">
          <span class="track-name" style="display: block; font-weight: bold;">${result.index + 1}. ${truncateText(result.trackName, 25)}</span>
          <span class="track-artist" style="display: block; font-size: 0.9em; color: #555;">${truncateText(result.artistName, 30)}</span>
        </span>
        <span class="track-time" style="margin-left: auto; padding-left: 10px; white-space: nowrap;"> (${formatTime(result.totalMinutes)})</span>
      `;
      if (result.trackName.length > 25) li.querySelector('.track-name').title = result.trackName;
      if (result.artistName.length > 30) li.querySelector('.track-artist').title = result.artistName;

      targetDiv.appendChild(li);
    });

  } catch (error) {
      console.error("Error rendering top tracks list:", error);
      targetDiv.innerHTML = `<p class="error-message">Error loading track images.</p>`;
  }
}

function updateTimeOfDayChart(data) {
    const targetDiv = document.getElementById('time-of-day-chart'); if (!targetDiv) return; targetDiv.innerHTML = ""; if (!data || data.length === 0) { targetDiv.innerHTML = `<p class="empty-message">No data.</p>`; return; }
    const hourData = d3.rollups(data.filter(d => d.ms_played > 0), v => d3.sum(v, d => d.ms_played / 60000), d => d.ts.getHours()); const hourMap = new Map(hourData); const completeHourData = d3.range(24).map(h => [h, hourMap.get(h) || 0]);
    const containerWidth = targetDiv.parentElement?.clientWidth || 400; const chartWidth = containerWidth > 0 ? containerWidth : 400; const chartHeight = 250; const width = chartWidth - chartMargin.left - chartMargin.right; const height = chartHeight - chartMargin.top - chartMargin.bottom; if (width <= 0 || height <= 0) { targetDiv.innerHTML = `<p class="error-message">Container too small.</p>`; return; }
    const svg = d3.select(targetDiv).append("svg").attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`).attr("preserveAspectRatio", "xMinYMid meet").append("g").attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);
    const x = d3.scaleBand().range([0, width]).domain(d3.range(24)).padding(0.2); const y = d3.scaleLinear().domain([0, d3.max(completeHourData, d => d[1]) || 1]).range([height, 0]).nice();
    svg.append("g").attr("class", "axis axis--x").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x).tickValues(d3.range(0, 24, 3)).tickFormat(d => `${d}:00`)).append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", chartMargin.bottom - 15).attr("text-anchor", "middle").text("Hour of Day");
    svg.append("g").attr("class", "axis axis--y").call(d3.axisLeft(y).ticks(5).tickFormat(d => formatTime(d))).append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", 0 - chartMargin.left).attr("x", 0 - (height / 2)).attr("dy", "1em").attr("text-anchor", "middle").text("Total Listening Time");
    svg.selectAll(".bar").data(completeHourData).enter().append("rect").attr("class", "bar time-of-day-bar").attr("x", d => x(d[0])).attr("width", x.bandwidth()).attr("y", height).attr("height", 0).attr("fill", "#fd7e14").on("mouseover", (event, d) => showTooltip(event, `<b>Hour ${d[0]}</b><br>${formatTime(d[1])}`)).on("mousemove", moveTooltip).on("mouseout", hideTooltip).transition().duration(500).attr("y", d => y(d[1])).attr("height", d => Math.max(0, height - y(d[1])));
}
function updateDayOfWeekChartAsText(data) {
    const targetDiv = document.getElementById("day-of-week-chart"); if (!targetDiv) return; targetDiv.innerHTML = ""; if (!data || data.length === 0) { targetDiv.innerHTML = `<p class="empty-message" style="color: var(--dark-green-color);">No data.</p>`; return; }
    const dayData = d3.rollups(data.filter((d) => d.ms_played > 0), (v) => d3.sum(v, (d) => d.ms_played / 60000), (d) => d.ts.getDay()); const dayMap = new Map(dayData); const sortedDays = Array.from(dayMap.entries()).sort((a, b) => d3.descending(a[1], b[1])); const totalMinutes = d3.sum(dayMap.values()); if (totalMinutes <= 0) { targetDiv.innerHTML = `<p class="empty-message">No activity by day.</p>`; return; } const peakDayIndex = sortedDays.length > 0 ? sortedDays[0][0] : -1; const peakMinutes = sortedDays.length > 0 ? sortedDays[0][1] : 0;
    let textContent = `<h4 style="color: var(--spotify-color); margin-bottom: 5px;">Listening by Day</h4>`; textContent += `<p style="margin-top: 0; margin-bottom: 5px;">Total: <strong>${formatTime(totalMinutes)}</strong></p>`; if(peakDayIndex !== -1) { textContent += `<p style="margin-top: 0; margin-bottom: 10px;">Most active: <strong style="color: var(--dark-green-color);">${dayOfWeekNames[peakDayIndex]}</strong> (${formatTime(peakMinutes)}).</p>`; } textContent += `<ol style="padding-left: 1.2rem; margin: 0; font-size: 0.9em; line-height: 1.4;">`; const dayOrder = [1, 2, 3, 4, 5, 6, 0]; /* Mon-Sun */ for (const dayIndex of dayOrder) { const minutes = dayMap.get(dayIndex) || 0; textContent += `<li style="margin-bottom: 2px;"><strong>${dayOfWeekNames[dayIndex]}</strong>: ${formatTime(minutes)}</li>`; } textContent += `</ol>`; targetDiv.innerHTML = textContent;
 }
// async function drawStreamgraph(filteredData, containerId) {}


async function drawForceGraph2(filteredData, containerId, topN = currentForceGraphTopN) {
  const container = document.getElementById(containerId); if (!container) return; container.innerHTML = "";
  if (forceGraphSliderValueSpan) forceGraphSliderValueSpan.textContent = topN;

  if (!filteredData || filteredData.length < 2) { container.innerHTML = '<p class="empty-message">Not enough data.</p>'; return; }
  const musicData = filteredData.filter(d => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0 && !d.episode_name).sort((a, b) => a.ts - b.ts);
  if (musicData.length < 2) { container.innerHTML = '<p class="empty-message">Not enough music plays.</p>'; return; }

  const artistCounts = d3.rollup(musicData, v => v.length, d => d.artist);
  const topArtistsSet = new Set(Array.from(artistCounts.entries()).sort(([, countA], [, countB]) => countB - countA).slice(0, topN).map(([artist]) => artist));
  if (topArtistsSet.size < 2) { container.innerHTML = `<p class="empty-message">Fewer than 2 top artists.</p>`; return; }

  const transitions = new Map();
  for (let i = 0; i < musicData.length - 1; i++) { const sourceArtist = musicData[i].artist; const targetArtist = musicData[i + 1].artist; if (topArtistsSet.has(sourceArtist) && topArtistsSet.has(targetArtist) && sourceArtist !== targetArtist) { const key = `${sourceArtist}:::${targetArtist}`; transitions.set(key, (transitions.get(key) || 0) + 1); } }
  if (transitions.size === 0) { container.innerHTML = '<p class="empty-message">No transitions between top artists.</p>'; return; }

  const nodes = Array.from(topArtistsSet).map(artist => ({ id: artist, playCount: artistCounts.get(artist) || 0 }));
  const links = Array.from(transitions.entries()).map(([key, count]) => { const [source, target] = key.split(":::"); return { source: source, target: target, value: count }; });

  // --- Chart Setup ---
  const margin = { top: 10, right: 10, bottom: 10, left: 10 }; const containerWidth = container.clientWidth || 600; const containerHeight = 400; const width = containerWidth - margin.left - margin.right; const height = containerHeight - margin.top - margin.bottom;
  if (width <= 0 || height <= 0) { container.innerHTML = '<p class="error-message">Container too small.</p>'; return; }
  const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`).attr("preserveAspectRatio", "xMinYMid meet").style("max-width", "100%").style("height", "auto");
  const mainGroup = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`); const zoomableGroup = mainGroup.append("g");
  mainGroup.append("rect").attr("width", width).attr("height", height).attr("fill", "none").attr("pointer-events", "all");
  zoomableGroup.append("defs").append("marker").attr("id", "arrowhead").attr("viewBox", "-0 -5 10 10").attr("refX", 15).attr("refY", 0).attr("orient", "auto").attr("markerWidth", 6).attr("markerHeight", 6).attr("xoverflow", "visible").append("svg:path").attr("d", "M 0,-5 L 10 ,0 L 0,5").attr("fill", "#999").style("stroke", "none");

  // --- Scales ---
  const minRadius = 5, maxRadius = 15; const playCountExtent = d3.extent(nodes, d => d.playCount); const nodeRadiusScale = d3.scaleSqrt().domain([playCountExtent[0] || 0, playCountExtent[1] || 1]).range([minRadius, maxRadius]);
  const nodeColorScale = d3.scaleSequential(d3.interpolateViridis).domain([playCountExtent[1] || 1, 0]);
  const maxStrokeWidth = 6; const linkWidthScale = d3.scaleLinear().domain([0, d3.max(links, d => d.value) || 1]).range([1, maxStrokeWidth]);

  // --- Simulation ---
  const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(90).strength(link => 1 / Math.min(link.source.playCount || 1, link.target.playCount || 1)))
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => nodeRadiusScale(d.playCount) + 6).strength(0.8));

  const linkedByIndex = {}; links.forEach(d => { const sourceId = typeof d.source === 'object' ? d.source.id : d.source; const targetId = typeof d.target === 'object' ? d.target.id : d.target; linkedByIndex[`${sourceId},${targetId}`] = 1; });
  function areNeighbors(a, b) { return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id; }

  // --- Draw Elements ---
  const link = zoomableGroup.append("g").attr("class", "force-links").attr("stroke", "#999").attr("stroke-opacity", 0.5).selectAll("line").data(links).join("line").attr("stroke-width", d => linkWidthScale(d.value)).attr("marker-end", "url(#arrowhead)");
  link.append("title").text(d => `${d.source.id || d.source} → ${d.target.id || d.target}\n${d.value} transitions`);
  const node = zoomableGroup.append("g").attr("class", "force-nodes").attr("stroke", "#fff").attr("stroke-width", 1.5).selectAll("circle").data(nodes).join("circle").attr("r", d => nodeRadiusScale(d.playCount)).attr("fill", d => nodeColorScale(d.playCount)).call(drag(simulation));
  node.append("title").text(d => `${d.id}\n${d.playCount} plays`);
  const labels = zoomableGroup.append("g").attr("class", "force-labels").attr("font-family", "sans-serif").attr("font-size", 10).attr("fill", "#333").attr("stroke", "white").attr("stroke-width", 0.3).attr("paint-order", "stroke").attr("pointer-events", "none").selectAll("text").data(nodes).join("text").attr("dx", d => nodeRadiusScale(d.playCount) + 4).attr("dy", "0.35em").text(d => d.id);

  // --- Interaction ---
  node.on("mouseover", highlight).on("mouseout", unhighlight); // link.on("mouseover", highlightLink).on("mouseout", unhighlightLink);
  function highlight(event, d_hovered) { const opacity = 0.15; node.style("opacity", n => areNeighbors(d_hovered, n) ? 1 : opacity); node.style("stroke", n => n === d_hovered ? 'black' : '#fff'); node.style("stroke-width", n => n === d_hovered ? 2.5 : 1.5); link.style("stroke-opacity", l => (l.source === d_hovered || l.target === d_hovered) ? 0.9 : opacity * 0.5); link.style("stroke", l => (l.source === d_hovered || l.target === d_hovered) ? '#555' : '#999'); labels.style("opacity", n => areNeighbors(d_hovered, n) ? 1 : opacity); }
  function unhighlight() { node.style("opacity", 1).style("stroke", '#fff').style("stroke-width", 1.5); link.style("stroke-opacity", 0.5).style("stroke", '#999'); labels.style("opacity", 1); }
  function highlightLink(event, d_hovered) { /* ... */ } function unhighlightLink(event, d_hovered) { /* ... */ }

  simulation.on("tick", () => { link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y); node.attr("cx", d => d.x).attr("cy", d => d.y); labels.attr("x", d => d.x).attr("y", d => d.y); });
  function zoomed(event) { zoomableGroup.attr("transform", event.transform); }
  const zoom = d3.zoom().scaleExtent([0.2, 8]).extent([[0, 0], [width, height]]).translateExtent([[0, 0], [width, height]]).on("zoom", zoomed);
  svg.call(zoom); svg.on("dblclick.zoom", null);
  function drag(simulation) { function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; d3.select(this).raise(); } function dragged(event, d) { d.fx = event.x; d.fy = event.y; } function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; } return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended); }

  const descEl = container.nextElementSibling; if (descEl && descEl.classList.contains('chart-description')) { descEl.innerHTML = `Transitions between top ${nodes.length} artists (max ${topN} shown). Hover/Pan/Zoom.`; }
}


async function handleBrushUpdate(filteredChartData) {
    console.log(`handleBrushUpdate called with ${filteredChartData.length} records.`);
    const dataToUpdate = filteredChartData || [];
    try {
        await Promise.all([
            updateTopArtistsAsText(dataToUpdate),
            updateTopTracksAsText(dataToUpdate),
            // drawStreamgraph(dataToUpdate, "streamgraph-chart"), 
            drawForceGraph2(dataToUpdate, "force-graph-chart", currentForceGraphTopN)
        ]);
        updateTimeOfDayChart(dataToUpdate);
        updateDayOfWeekChartAsText(dataToUpdate);
        console.log("handleBrushUpdate finished successfully.");
    } catch (error) {
        console.error("Error during handleBrushUpdate:", error);
    }
}


async function updateVisualization(filteredData) {
    console.log(`updateVisualization called`);
    const chartsToClear = [ topArtistsContainer, topTracksContainer, timeOfDayDiv, dayOfWeekDiv, streamgraphContainer, forceGraphContainer ];
    chartsToClear.forEach((el) => { if (el) el.innerHTML = ""; }); 
    if (mainChartDiv) mainChartDiv.innerHTML = ""; 

    currentViewData = filteredData || []; 

    if (!currentViewData || currentViewData.length === 0) {
        if (mainChartDiv) mainChartDiv.innerHTML = `<p class="empty-message">No data found for the selected period.</p>`;
        chartsToClear.forEach((el) => { if (el) el.innerHTML = `<p class="empty-message">No data.</p>`; });
        updateFilterInfoLabel(null, null);
        return;
    }

    const [viewStartDate, viewEndDate] = d3.extent(currentViewData, (d) => d.ts);
    if (!viewStartDate || !viewEndDate || isNaN(viewStartDate) || isNaN(viewEndDate)) {
        console.error("updateVisualization: Invalid date range in data.");
        if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">Invalid date range in data.</p>`;
        updateFilterInfoLabel(null, null);
        return;
    }

    console.log(`Rendering view for: ${formatDate(viewStartDate)} to ${formatDate(viewEndDate)}`);


    drawLineGraph(currentViewData, viewStartDate, viewEndDate);

    console.log("Calling handleBrushUpdate for initial/reset view...");
    await handleBrushUpdate(currentViewData);
    console.log("handleBrushUpdate for initial/reset view finished.");

    updateFilterInfoLabel(viewStartDate, viewEndDate);
    console.log(`updateVisualization finished`);
}


function setupEventListeners() {
    console.log("setupEventListeners called");
    if (wrappedYearSelect) {
        wrappedYearSelect.onchange = async () => {
            console.log("Year select changed:", wrappedYearSelect.value);
            const selectedValue = wrappedYearSelect.value;
            let dataToRender = [];
            if (selectedValue === "all") {
                if (startDateInput && endDateInput && overallMinDate && overallMaxDate) { startDateInput.value = formatDateForInput(overallMinDate); endDateInput.value = formatDateForInput(overallMaxDate); }
                console.log("Updating view for 'All Time'"); dataToRender = allParsedData;
            } else if (selectedValue) {
                const selectedYear = +selectedValue; if (isNaN(selectedYear)) { console.warn("Invalid year"); dataToRender = []; } else { const yearStart = new Date(selectedYear, 0, 1); const yearEnd = new Date(selectedYear, 11, 31); const effectiveStartDate = (!overallMinDate || yearStart < overallMinDate) ? overallMinDate : yearStart; const effectiveEndDate = (!overallMaxDate || yearEnd > overallMaxDate) ? overallMaxDate : yearEnd; const effectiveEndFilter = d3.timeDay.offset(effectiveEndDate, 1); dataToRender = allParsedData.filter(d => d.ts >= effectiveStartDate && d.ts < effectiveEndFilter); if (startDateInput) startDateInput.value = formatDateForInput(effectiveStartDate); if (endDateInput) endDateInput.value = formatDateForInput(effectiveEndDate); console.log(`Updating view for year ${selectedYear}`); }
            } else { console.warn("Year selection cleared."); }
            await updateVisualization(dataToRender); 
        };
    } else { console.error("#wrappedYearSelect not found."); }

    if (applyRangeBtn) {
        applyRangeBtn.onclick = async () => {
            console.log("Apply Range button clicked");
            const startStr = startDateInput.value; const endStr = endDateInput.value;
            if (!startStr || !endStr) { alert("Please select both start and end dates."); return; }
            let start = d3.timeDay.floor(new Date(startStr + "T00:00:00")); let end = d3.timeDay.floor(new Date(endStr + "T00:00:00"));
            if (isNaN(start) || isNaN(end)) { alert("Invalid date format."); return; }
            if (start > end) { alert("Start date must be before or the same as the end date."); return; }
            start = (!overallMinDate || start < overallMinDate) ? overallMinDate : start; end = (!overallMaxDate || end > overallMaxDate) ? overallMaxDate : end;
            startDateInput.value = formatDateForInput(start); endDateInput.value = formatDateForInput(end);
            const filterEnd = d3.timeDay.offset(end, 1);
            if (wrappedYearSelect) wrappedYearSelect.value = "";
            const filteredByRange = allParsedData.filter(d => d.ts >= start && d.ts < filterEnd);
            console.log(`Updating view for range ${formatDate(start)} to ${formatDate(end)}`);
            await updateVisualization(filteredByRange);
        };
    } else { console.error("#applyRangeBtn not found."); }

    if (forceGraphSlider && forceGraphSliderValueSpan) {
        forceGraphSlider.addEventListener('input', () => { forceGraphSliderValueSpan.textContent = forceGraphSlider.value; });
        forceGraphSlider.addEventListener('change', async () => { 
            currentForceGraphTopN = parseInt(forceGraphSlider.value, 10); forceGraphSliderValueSpan.textContent = currentForceGraphTopN; console.log(`Force Graph TopN changed to: ${currentForceGraphTopN}`);
            let dataForForceGraph;
            const currentDomain = lineGraphXScale?.domain(); 

            if(currentDomain && currentDomain.length === 2) {
                const [currentStart, currentEnd] = currentDomain;
                const filterStart = d3.timeDay.floor(currentStart);
                const filterEnd = d3.timeDay.offset(d3.timeDay.floor(currentEnd), 1);
                dataForForceGraph = currentViewData.filter(d => d.ts >= filterStart && d.ts < filterEnd);
                 console.log(`Updating Force Graph based on current graph zoom (${dataForForceGraph.length} records)`);
            } else { 
                dataForForceGraph = currentViewData;
                console.log(`Updating Force Graph based on main view data (${dataForForceGraph.length} records)`);
            }
            const fgContainer = document.getElementById('force-graph-chart');
            if (dataForForceGraph && dataForForceGraph.length > 0) {
                await drawForceGraph2(dataForForceGraph, 'force-graph-chart', currentForceGraphTopN); 
            } else {
               console.log("Slider changed, but no data for force graph.");
               if(fgContainer) fgContainer.innerHTML = '<p class="empty-message">Select data to see transitions.</p>';
            }
        });
    } else { console.warn("Force graph slider elements not found."); }

    console.log("Event listeners attached.");
}

