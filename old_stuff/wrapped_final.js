
// // --- Configuration ---
// // NOTE: TEXT_MODE is not fully implemented/tested in this version.
// // Stick to USE_TEXT_MODE = false for visual plots.
// const USE_TEXT_MODE = false; // SET TO true FOR TEXT, false FOR PLOTS
// // --- End Configuration ---

// const cellSize = 9; // Smaller cells for multi-year view
// const cellPadding = 1; // Smaller padding
// const leftPadding = 40; // Space for day/year labels
// const topPadding = 20; // Space above month labels within a year block
// const yearLabelPadding = 25; // Extra space above each year for the label
// const spaceBetweenYears = 30; // Vertical space between year blocks
// const noDataColor = "#ebedf0";
// const calendarColorScale = d3.scaleSequential(d3.interpolateBlues);
// const chartMargin = { top: 20, right: 20, bottom: 60, left: 70 }; // General chart margins
// const topListChartMargin = { top: 10, right: 50, bottom: 20, left: 120 }; // Margins for top list bar charts
// const barHeight = 20; // Height for bars in top list charts

// // --- Handle Configuration (Only relevant for plot mode & single year view) ---
// const handleWidth = 3;
// const handleColor = "#e63946";
// const handleGrabAreaWidth = 10;
// const highlightColor = "rgba(108, 117, 125, 0.2)";

// // --- DOM Elements ---
// const wrappedYearSelect = document.getElementById("wrappedYearSelect");
// console.log("Found #wrappedYearSelect element:", wrappedYearSelect);
// const startDateInput = document.getElementById("startDate");
// const endDateInput = document.getElementById("endDate");
// const applyRangeBtn = document.getElementById("applyRangeBtn");
// const calendarDiv = document.getElementById("calendar");
// const legendDiv = document.getElementById("legend");
// const topArtistsContainer = document.getElementById("top-artists-chart"); // Target the DIV now
// const tooltipDiv = d3.select("#tooltip");
// const topTracksContainer = document.getElementById("top-tracks-chart"); // Target the DIV
// const timeOfDayDiv = document.getElementById("time-of-day-chart");
// const dayOfWeekDiv = document.getElementById("day-of-week-chart");
// const filterInfoSpan = document.getElementById("current-filter-info");
// const streamgraphContainer = document.getElementById("streamgraph-chart"); // Added
// const forceGraphContainer = document.getElementById("force-graph-chart"); // Added
// const forceGraphSlider = document.getElementById("forceGraphSlider");
// const forceGraphSliderValueSpan = document.getElementById("forceGraphSliderValue");

// // --- Helper Functions ---
// const formatDay = d3.timeFormat("%Y-%m-%d");
// const formatDate = d3.timeFormat("%a, %b %d, %Y");
// const formatMonth = d3.timeFormat("%b");
// const formatFullMonthYear = d3.timeFormat("%B %Y");
// const formatTime = (mins) => {
//   if (mins === undefined || mins === null || isNaN(mins)) return "N/A";
//   if (mins < 1 && mins > 0) return `< 1 min`;
//   if (mins <= 0) return `0 min`;
//   if (mins < 60) return `${Math.round(mins)} min`;
//   const hours = Math.floor(mins / 60);
//   const remainingMins = Math.round(mins % 60);
//   return `${hours}h ${remainingMins}m`;
// };
// const formatDateForInput = d3.timeFormat("%Y-%m-%d");
// const dayOfWeekNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// function truncateText(text, maxLength) {
//   if (!text) return "";
//   return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
// }

// // --- Global variables ---
// let allParsedData = [];
// let requiredColumns = {
//   track_name: true, // Assume true for simplicity, original check is good practice
//   artist: true, album: true, img: true, platform: true, skipped: true,
//   shuffle: true, episode_name: true, episode_show_name: true,
//   audiobook_title: true, audiobook_chapter_title: true,
//   reason_start: true, reason_end: true, conn_country: true,
// };
// let currentViewData = []; // Data filtered by year/range from controls
// let selectedStartDate = null; // Start date of brush/handle selection (plot mode, single year)
// let selectedEndDate = null; // End date of brush/handle selection (plot mode, single year)
// // Plot-mode specific globals
// let svgInstance = null; // Main calendar SVG instance
// let allDaysInCalendar = []; // Used only by single-year handle drag logic
// let calendarStartDay = null; // Start day of the grid (for single-year handle logic)
// let cellWidthWithPadding = cellSize + cellPadding; // Calculated width+padding
// let currentCalendarHeight = 0; // Height of the single-year grid (for handle logic)
// let currentForceGraphTopN = 5; // Default for force graph slider, matches HTML slider value
// let overallMinDate = null; // Store overall min date
// let overallMaxDate = null; // Store overall max date


// // --- Data Processing (Runs once) ---
// (async function loadData() {
//   try {
//     const rawData = await d3.csv("data/astrid_data.csv");

//     // Detect available columns
//     const columns = new Set(rawData.columns);
//     const columnMapping = {
//       track_name: "master_metadata_track_name", artist: "master_metadata_album_artist_name",
//       album: "master_metadata_album_album_name", img: "spotify_track_uri", // Use URI for img lookup later
//       platform: "platform", skipped: "skipped", shuffle: "shuffle", episode_name: "episode_name",
//       episode_show_name: "episode_show_name", audiobook_title: "audiobook_title",
//       audiobook_chapter_title: "audiobook_chapter_title", reason_start: "reason_start",
//       reason_end: "reason_end", conn_country: "conn_country",
//     };
//     Object.keys(columnMapping).forEach((key) => {
//       requiredColumns[key] = columns.has(columnMapping[key]);
//     });

//     allParsedData = rawData
//       .map((d) => ({
//         ts: new Date(d.ts), ms_played: +d.ms_played,
//         platform: d.platform || "Unknown", conn_country: d.conn_country || "Unknown",
//         artist: d.master_metadata_album_artist_name || "Unknown Artist",
//         track: requiredColumns.track_name ? (d.master_metadata_track_name || "Unknown Track") : "N/A",
//         album: d.master_metadata_album_album_name || "Unknown Album",
//         episode_name: d.episode_name || null, episode_show_name: d.episode_show_name || null,
//         audiobook_title: d.audiobook_title || null, audiobook_chapter_title: d.audiobook_chapter_title || null,
//         skipped: ["true", "1", true].includes(String(d.skipped).toLowerCase()),
//         shuffle: ["true", "1", true].includes(String(d.shuffle).toLowerCase()),
//         reason_start: d.reason_start || "N/A", reason_end: d.reason_end || "N/A",
//         spotify_track_uri: d.spotify_track_uri || null,
//       }))
//       .filter(
//         (d) =>
//           d.ts instanceof Date && !isNaN(d.ts) &&
//           typeof d.ms_played === "number" && !isNaN(d.ms_played) && d.ms_played >= 0
//       );

//     // Sort data once after parsing
//     allParsedData.sort((a, b) => a.ts - b.ts);

//     console.log(`Loaded and parsed ${allParsedData.length} valid records.`);

//     // Handle no valid data found
//     if (allParsedData.length === 0) {
//         if (calendarDiv) calendarDiv.innerHTML = `<p class="error-message">No valid data found.</p>`;
//         if (filterInfoSpan) filterInfoSpan.textContent = "No data loaded";
//         [topArtistsContainer, topTracksContainer, timeOfDayDiv, dayOfWeekDiv, streamgraphContainer, forceGraphContainer]
//             .forEach(el => { if (el) el.innerHTML = `<p class="empty-message">No data.</p>`; });
//         [wrappedYearSelect, startDateInput, endDateInput, applyRangeBtn, forceGraphSlider]
//             .forEach(el => { if (el) el.disabled = true; });
//         return; // Stop execution
//     }

//     // --- Determine Overall Date Range ---
//     overallMinDate = d3.min(allParsedData, (d) => d.ts);
//     overallMaxDate = d3.max(allParsedData, (d) => d.ts);
//     const years = [...new Set(allParsedData.map((d) => d.ts.getFullYear()))].sort((a, b) => a - b);
//     console.log("Available years:", years);
//     console.log("Overall date range:", overallMinDate, "to", overallMaxDate);

//     // --- Populate Year Select ---
//     if (wrappedYearSelect) {
//       // Add "All Time" Option FIRST
//       const allTimeOption = document.createElement("option");
//       allTimeOption.value = "all";
//       allTimeOption.textContent = "All Time";
//       wrappedYearSelect.appendChild(allTimeOption);

//       years.forEach((y) => {
//         const opt = document.createElement("option");
//         opt.value = y;
//         opt.textContent = y;
//         wrappedYearSelect.appendChild(opt);
//       });
//       wrappedYearSelect.value = "all"; // Set default selection to "All Time"
//     } else {
//       console.error("Cannot find #wrappedYearSelect.");
//     }

//     // --- Set Date Inputs to Overall Range ---
//     if (startDateInput && endDateInput && overallMinDate && overallMaxDate) {
//       const minDateStr = formatDateForInput(overallMinDate);
//       const maxDateStr = formatDateForInput(overallMaxDate);
//       startDateInput.value = minDateStr;
//       endDateInput.value = maxDateStr;
//       startDateInput.min = minDateStr; // Set bounds for picker
//       startDateInput.max = maxDateStr;
//       endDateInput.min = minDateStr;
//       endDateInput.max = maxDateStr;
//       console.log(`Set initial date range inputs: ${minDateStr} to ${maxDateStr}`);
//     } else {
//        console.error("Could not set initial date input values or missing overall date range.");
//     }

//     // --- Setup Force Graph Slider ---
//     // Set initial display value (assuming default value is set in HTML)
//     if (forceGraphSlider && forceGraphSliderValueSpan) {
//         currentForceGraphTopN = parseInt(forceGraphSlider.value, 10); // Read initial value
//         forceGraphSliderValueSpan.textContent = currentForceGraphTopN;
//     } else {
//         console.warn("Force graph slider or value display not found.");
//     }

//     // --- Initial Load ---
//     // Directly call updateVisualization with the full dataset
//     console.log("Triggering initial visualization with full data range...");
//     updateVisualization(allParsedData);

//     // --- Attach Event Listeners AFTER initial setup ---
//     // Call setupEventListeners() at the end of the try block or in a finally block
//   } catch (error) {
//     console.error("Error loading or processing data:", error);
//      if (calendarDiv) calendarDiv.innerHTML = `<p class="error-message">Error loading data.</p>`;
//      if (filterInfoSpan) filterInfoSpan.textContent = 'Error loading data';
//      [topArtistsContainer, topTracksContainer, timeOfDayDiv, dayOfWeekDiv, streamgraphContainer, forceGraphContainer]
//         .forEach(el => { if (el) el.innerHTML = `<p class="error-message">Error loading data.</p>`; });
//      [wrappedYearSelect, startDateInput, endDateInput, applyRangeBtn, forceGraphSlider]
//         .forEach(el => { if (el) el.disabled = true; });
//   } finally {
//       // Ensure event listeners are attached even if there was an error during setup (though controls might be disabled)
//       setupEventListeners();
//   }
// })(); // Immediately invoke the async function

// // --- Tooltip Logic ---
// const showTooltip = (event, content) => {
//   tooltipDiv
//     .style("opacity", 1)
//     .html(content)
//     .style("left", event.pageX + 10 + "px")
//     .style("top", event.pageY - 20 + "px");
// };
// const moveTooltip = (event) => {
//   tooltipDiv
//     .style("left", event.pageX + 10 + "px")
//     .style("top", event.pageY - 20 + "px");
// };
// const hideTooltip = () => {
//   tooltipDiv.style("opacity", 0);
// };

// // --- Calendar Dragging Helper Functions (Plot Mode - Single Year Only) ---
// function getXFromDate(date, firstDayOfGrid, columnWidth) {
//   if (!date || !firstDayOfGrid || isNaN(date) || isNaN(firstDayOfGrid) || !columnWidth || columnWidth <= 0) return NaN;
//   const startOfWeekGrid = d3.timeWeek.floor(firstDayOfGrid);
//   const startOfWeekDate = d3.timeWeek.floor(date);
//   if (startOfWeekDate < startOfWeekGrid) return 0; // Clamp to start
//   const weekIndex = d3.timeWeek.count(startOfWeekGrid, startOfWeekDate);
//   return weekIndex * columnWidth;
// }
// function getDateFromX(xPos, daysArray, firstDayOfGrid, columnWidth) {
//     // This logic needs the daysArray for the *specific year* being dragged over.
//     if (!daysArray || daysArray.length === 0 || !firstDayOfGrid || !columnWidth || columnWidth <= 0 || xPos < -columnWidth / 2) return null;
//     const firstDayInArray = daysArray[0]; const lastDayInArray = daysArray[daysArray.length - 1];
//     const startOfWeekGrid = d3.timeWeek.floor(firstDayOfGrid); // Use the grid start provided
//     const maxWeekIndex = d3.timeWeek.count(startOfWeekGrid, d3.timeWeek.floor(lastDayInArray));
//     const calculatedIndex = Math.floor((xPos + columnWidth / 2) / columnWidth);
//     const weekIndex = Math.max(0, Math.min(calculatedIndex, maxWeekIndex)); // Clamp index
//     const targetWeekStartDate = d3.timeWeek.offset(startOfWeekGrid, weekIndex); // Correctly calculate target week start
//     let foundDate = daysArray.find(d => d3.timeWeek.floor(d).getTime() === targetWeekStartDate.getTime());
//     if (!foundDate) { if (targetWeekStartDate <= firstDayInArray) return firstDayInArray; if (targetWeekStartDate >= d3.timeWeek.floor(lastDayInArray)) return lastDayInArray; foundDate = daysArray.slice().reverse().find(d => d < targetWeekStartDate); return foundDate || lastDayInArray; }
//     return foundDate;
// }

// // --- Filter Info Label Update ---
// function updateFilterInfoLabel(startDate, endDate) {
//   if (!filterInfoSpan) return;
//   if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
//     filterInfoSpan.textContent = `${formatDate(startDate)} → ${formatDate(endDate)}`;
//   } else {
//       // If no valid selection, try showing the range of the current view data
//       if (currentViewData && currentViewData.length > 0) {
//         const [minD, maxD] = d3.extent(currentViewData, (d) => d.ts);
//         if (minD && maxD && !isNaN(minD) && !isNaN(maxD)) {
//           filterInfoSpan.textContent = `${formatDate(minD)} → ${formatDate(maxD)} (Current View)`;
//         } else {
//           filterInfoSpan.textContent = "Select a period"; // Fallback if view data invalid
//         }
//       } else {
//            filterInfoSpan.textContent = "No data loaded or selected"; // Fallback if no data at all
//       }
//   }
// }

// // --- Plotting Functions ---

// // Multi-Year Calendar Plot (Draws calendar, handles single/multi-year logic internally)
// function drawCalendar2(data, initialStartDate, initialEndDate) {
//     calendarDiv.innerHTML = ""; legendDiv.innerHTML = "";
//     svgInstance = null; allDaysInCalendar = []; calendarStartDay = null; currentCalendarHeight = 0;

//     const listeningData = data.filter(d => d.ms_played > 0);
//     if (listeningData.length === 0) {
//         if (calendarDiv) calendarDiv.innerHTML = `<p class="empty-message">No listening data.</p>`;
//         updateFilterInfoLabel(initialStartDate, initialEndDate);
//         drawLegend(legendDiv, calendarColorScale, 0); // Draw empty legend
//         return;
//     }

//     const dailyData = d3.rollups(listeningData, v => d3.sum(v, d => d.ms_played / 60000), d => formatDay(d.ts));
//     const valueMap = new Map(dailyData); const maxMinutesOverall = d3.max(valueMap.values()) || 0;
//     calendarColorScale.domain([0, maxMinutesOverall || 1]); // Use || 1 for safety

//     // Ensure dates are valid Date objects
//     const dataStartDate = initialStartDate instanceof Date && !isNaN(initialStartDate) ? initialStartDate : null;
//     const dataEndDate = initialEndDate instanceof Date && !isNaN(initialEndDate) ? initialEndDate : null;

//     if (!dataStartDate || !dataEndDate || dataStartDate > dataEndDate) {
//         console.error("drawCalendar2: Invalid initial date range.", dataStartDate, dataEndDate);
//         if (calendarDiv) calendarDiv.innerHTML = `<p class="error-message">Invalid date range provided.</p>`;
//         return;
//     }

//     const startYear = dataStartDate.getFullYear(); const endYear = dataEndDate.getFullYear();
//     const years = d3.range(startYear, endYear + 1); // Years in the selected range
//     const multiYear = years.length > 1; // Check if multiple years are displayed

//     // Calculate dimensions
//     cellWidthWithPadding = cellSize + cellPadding;
//     const singleYearWidth = (53 * cellWidthWithPadding) + leftPadding + 20; // Approx 53 weeks + labels
//     const singleYearGridHeight = (7 * cellWidthWithPadding); // Height of the 7 day rows
//     const singleYearTotalHeight = singleYearGridHeight + topPadding + yearLabelPadding; // Height including labels above grid
//     const totalWidth = singleYearWidth;
//     const totalHeight = (years.length * singleYearTotalHeight) + ((years.length - 1) * spaceBetweenYears); // Add space between years

//     const svg = d3.select("#calendar").append("svg").attr("width", totalWidth).attr("height", totalHeight);
//     svgInstance = svg; // Store reference

//     // Draw Day Labels only once if multiple years
//     if (multiYear) {
//        const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
//        svg.append("g")
//            .attr("transform", `translate(${leftPadding - 15}, ${yearLabelPadding + topPadding})`) // Position left of the first year's grid
//            .selectAll(".day-label")
//            .data(d3.range(7))
//            .enter().append("text")
//              .attr("class", "day-label")
//              .attr("x", -5)
//              .attr("y", d => d * cellWidthWithPadding + cellWidthWithPadding / 2)
//              .attr("dy", "0.35em")
//              .style("text-anchor", "middle")
//              .text(d => dayLabels[d]);
//     }

//     years.forEach((year, yearIndex) => { // Loop through each year
//         const yearGroupY = yearIndex * (singleYearTotalHeight + spaceBetweenYears);
//         const yearGroup = svg.append("g")
//             .attr("class", `year-group year-${year}`)
//             .attr("transform", `translate(0, ${yearGroupY})`); // Position year group vertically

//         const yearStartDate = new Date(year, 0, 1); const yearEndDate = new Date(year, 11, 31);
//         // Clamp the actual start/end for this year's data to the overall selection
//         const currentYearActualStart = d3.max([yearStartDate, dataStartDate]);
//         const currentYearActualEnd = d3.min([yearEndDate, dataEndDate]);

//         const daysInYearRange = d3.timeDays(currentYearActualStart, d3.timeDay.offset(currentYearActualEnd, 1));
//         if (daysInYearRange.length === 0) return; // Skip if no days in range for this year

//         const firstDayOfYearGrid = d3.timeWeek.floor(yearStartDate); // Grid always starts relative to Jan 1st's week
//         const monthsInYear = d3.timeMonths(
//              d3.max([yearStartDate, d3.timeMonth.floor(currentYearActualStart)]), // Start from the first month with data
//              d3.timeMonth.offset(currentYearActualEnd, 1) // Go up to the month after the last data point
//         );

//         // Year Label
//         yearGroup.append("text").attr("class", "year-label")
//             .attr("x", leftPadding).attr("y", yearLabelPadding - 5) // Position above month labels
//             .text(year);

//         // Month Labels
//         const monthLabelGroup = yearGroup.append("g")
//             .attr("transform", `translate(${leftPadding}, ${yearLabelPadding + topPadding - 10})`); // Position above grid

//         monthLabelGroup.selectAll(".month-label").data(monthsInYear).enter().append("text")
//             .attr("class", "month-label")
//             .attr("x", d => d3.timeWeek.count(firstDayOfYearGrid, d3.timeWeek.floor(d)) * cellWidthWithPadding)
//             .attr("y", 0)
//             .text(formatMonth);

//         // Day Cells Grid
//         const cellGroup = yearGroup.append("g")
//             .attr("transform", `translate(${leftPadding}, ${yearLabelPadding + topPadding})`); // Position the grid

//         cellGroup.selectAll(".day-cell").data(daysInYearRange).enter().append("rect")
//             .attr("class", "day-cell")
//             .attr("width", cellSize).attr("height", cellSize).attr("rx", 2).attr("ry", 2)
//             .attr("x", d => d3.timeWeek.count(firstDayOfYearGrid, d) * cellWidthWithPadding)
//             .attr("y", d => d.getDay() * cellWidthWithPadding)
//             .attr("fill", d => { const dayStr = formatDay(d); const value = valueMap.get(dayStr); return (value === undefined || value <= 0) ? noDataColor : calendarColorScale(value); })
//             .attr("stroke", "#fff").attr("stroke-width", 0.5)
//             .on("mouseover", (event, d) => {
//                  const key = formatDay(d); const valueMins = valueMap.get(key) || 0;
//                  showTooltip(event, `${formatDate(d)}<br><b>Listened: ${formatTime(valueMins)}</b>`);
//                  d3.select(event.currentTarget).attr("stroke", "#333").attr("stroke-width", 1.5);
//               })
//             .on("mousemove", moveTooltip).on("mouseout", (event) => {
//                 hideTooltip(); d3.select(event.currentTarget).attr("stroke", "#fff").attr("stroke-width", 0.5);
//             });

//         // --- Single Year Setup for Dragging ---
//         if (!multiYear) {
//              currentCalendarHeight = singleYearGridHeight;
//              calendarStartDay = firstDayOfYearGrid; // Store grid start for this specific year
//              allDaysInCalendar = daysInYearRange; // Store days for this specific year
//              // Draw Day Labels specifically for this year if it's the only one
//              const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
//              yearGroup.append("g")
//                  .attr("transform", `translate(${leftPadding - 15}, ${yearLabelPadding + topPadding})`) // Position left of grid
//                  .selectAll(".day-label")
//                  .data(d3.range(7))
//                  .enter().append("text")
//                  .attr("class", "day-label")
//                  .attr("x", -5).attr("y", d => d * cellWidthWithPadding + cellWidthWithPadding / 2)
//                  .attr("dy", "0.35em").style("text-anchor", "middle").text(d => dayLabels[d]);
//         }
//     });

//     // Draw Legend and update label
//     drawLegend(legendDiv, calendarColorScale, maxMinutesOverall);
//     updateFilterInfoLabel(dataStartDate, dataEndDate);

//     // Set initial selection state (important for subsequent filtering)
//     selectedStartDate = dataStartDate;
//     selectedEndDate = dataEndDate;

//     // Draw handles ONLY if it's a single-year view
//     if (!multiYear) {
//         console.log("Drawing handles for single year view.");
//         drawHandles(selectedStartDate, selectedEndDate);
//     } else {
//         console.log("Multi-year view: Handles disabled.");
//         // Ensure no old handles/highlight remain if switching from single to multi
//         svgInstance?.selectAll(".start-handle-group, .end-handle-group, .highlight-rect").remove();
//     }
//     // Initial highlight update (will remove rect in multi-year)
//     updateHighlightRect();
// }

// // Drag Handle Drawing & Events (Only drawn/used in single-year plot mode)
// function drawHandles(startDate, endDate) {
//     // Check if we are in single year mode and have necessary info
//     if (!svgInstance || !calendarStartDay || !startDate || !endDate || isNaN(startDate) || isNaN(endDate) || currentCalendarHeight <= 0) {
//          console.warn("Conditions not met for drawing handles."); return;
//     }
//     const year = startDate.getFullYear();
//     // Target the specific year group where handles should be drawn
//     const yearGroup = svgInstance.select(`.year-group.year-${year}`);
//     if (yearGroup.empty()) { console.error(`Cannot find year group .year-${year} to draw handles.`); return; }

//     // Calculate X positions relative to the year's grid start
//     const startX = getXFromDate(startDate, calendarStartDay, cellWidthWithPadding);
//     const endHandleDateForPositioning = d3.timeDay.offset(endDate, 1);
//     const safeEndPosDate = endHandleDateForPositioning <= startDate ? d3.timeDay.offset(startDate, 1) : endHandleDateForPositioning;
//     let endX = getXFromDate(safeEndPosDate, calendarStartDay, cellWidthWithPadding);
//     if (isNaN(endX)) endX = getXFromDate(endDate, calendarStartDay, cellWidthWithPadding) + cellWidthWithPadding;
//     endX = Math.max(endX, startX + handleWidth);

//     if (isNaN(startX) || isNaN(endX)) { console.error("drawHandles: NaN X position!", { startX, endX }); return; }

//     // Base Y position for handles (aligned with the grid within the year group)
//     const handleBaseY = topPadding + yearLabelPadding;

//     // --- Start Handle ---
//     let startHandleGroup = yearGroup.select(".start-handle-group");
//     if (startHandleGroup.empty()) {
//         startHandleGroup = yearGroup.append("g").attr("class", "start-handle-group");
//         startHandleGroup.append("line").attr("class", "drag-handle start-handle").attr("y1", -cellPadding).attr("stroke", handleColor).attr("stroke-width", handleWidth).attr("stroke-linecap", "round");
//         startHandleGroup.append("line").attr("class", "drag-grab-area").attr("y1", -cellPadding).attr("stroke", "transparent").attr("stroke-width", handleGrabAreaWidth).style("cursor", "ew-resize");
//     }
//     startHandleGroup.attr("transform", `translate(${startX}, ${handleBaseY})`).selectAll("line").attr("y2", currentCalendarHeight + cellPadding);
//     // Use plot-specific drag end handler
//     startHandleGroup.raise().on('.drag', null).call(d3.drag().on("start", handleDragStart).on("drag", (event) => handleDrag(event, "start")).on("end", handleDragEndPlot));

//     // --- End Handle ---
//     let endHandleGroup = yearGroup.select(".end-handle-group");
//      if (endHandleGroup.empty()) {
//         endHandleGroup = yearGroup.append("g").attr("class", "end-handle-group");
//         endHandleGroup.append("line").attr("class", "drag-handle end-handle").attr("y1", -cellPadding).attr("stroke", handleColor).attr("stroke-width", handleWidth).attr("stroke-linecap", "round");
//         endHandleGroup.append("line").attr("class", "drag-grab-area").attr("y1", -cellPadding).attr("stroke", "transparent").attr("stroke-width", handleGrabAreaWidth).style("cursor", "ew-resize");
//      }
//      endHandleGroup.attr("transform", `translate(${endX}, ${handleBaseY})`).selectAll("line").attr("y2", currentCalendarHeight + cellPadding);
//      // Use plot-specific drag end handler
//      endHandleGroup.raise().on('.drag', null).call(d3.drag().on("start", handleDragStart).on("drag", (event) => handleDrag(event, "end")).on("end", handleDragEndPlot));

//      updateHighlightRect(); // Update highlight based on handle positions
// }
// function handleDragStart(event) {
//     if (!svgInstance) return;
//     d3.select(this).raise().select(".drag-handle").attr("stroke", "black").attr("stroke-opacity", 0.7);
//     // Target highlight rect within the correct year group
//     const year = selectedStartDate?.getFullYear();
//     if(year) svgInstance.select(`.year-group.year-${year} .highlight-rect`)?.raise();
//     svgInstance.selectAll(".start-handle-group, .end-handle-group").raise();
// }
// function handleDrag(event, handleType) {
//     // Ensure we have necessary info for single-year dragging
//     if (!svgInstance || !calendarStartDay || !allDaysInCalendar || allDaysInCalendar.length === 0 || !selectedStartDate || !selectedEndDate || currentCalendarHeight <= 0) return;

//     const year = selectedStartDate.getFullYear(); // Get the year being dragged
//     const yearGroup = svgInstance.select(`.year-group.year-${year}`);
//     if (yearGroup.empty()) { console.error("Cannot find year group for drag."); return; }

//     // Calculate target date based on X position within the year group's coordinate system
//     // We need the event's coordinates relative to the yearGroup's <g> element.
//     // d3.pointer(event) gives coordinates relative to the listener element (the handle group).
//     // A safer approach is often d3.pointer(event, svg.node()) to get coords relative to SVG,
//     // then adjust for the yearGroup's transform, but event.x often works if transform is simple.
//     // Let's assume event.x is roughly correct relative to the year group's grid start for now.
//     const currentX = event.x;

//     let targetDate = getDateFromX(currentX, allDaysInCalendar, calendarStartDay, cellWidthWithPadding);
//     if (!targetDate || isNaN(targetDate)) return;

//     // Clamp target date to the bounds of the *single year's data* being viewed
//     const minDate = allDaysInCalendar[0]; const maxDate = allDaysInCalendar[allDaysInCalendar.length - 1];
//     targetDate = targetDate < minDate ? minDate : (targetDate > maxDate ? maxDate : targetDate);

//     let snappedX; let newStartDate = selectedStartDate; let newEndDate = selectedEndDate; let groupToMove;
//     const handleBaseY = topPadding + yearLabelPadding; // Y offset for handles

//     if (handleType === "start") {
//         targetDate = d3.min([targetDate, selectedEndDate]); newStartDate = targetDate;
//         snappedX = getXFromDate(newStartDate, calendarStartDay, cellWidthWithPadding); groupToMove = yearGroup.select(".start-handle-group");
//         if (!isNaN(snappedX)) groupToMove.attr("transform", `translate(${snappedX}, ${handleBaseY})`); else console.error("handleDrag (Start): Invalid snappedX.");
//     } else { // End handle
//         targetDate = d3.max([targetDate, selectedStartDate]); newEndDate = targetDate;
//         const endHandleDateForPositioning = d3.timeDay.offset(newEndDate, 1); const safeEndPosDate = endHandleDateForPositioning <= newStartDate ? d3.timeDay.offset(newStartDate, 1) : endHandleDateForPositioning;
//         snappedX = getXFromDate(safeEndPosDate, calendarStartDay, cellWidthWithPadding); if (isNaN(snappedX)) snappedX = getXFromDate(newEndDate, calendarStartDay, cellWidthWithPadding) + cellWidthWithPadding;
//         const startXForCompare = getXFromDate(newStartDate, calendarStartDay, cellWidthWithPadding); if (!isNaN(startXForCompare) && !isNaN(snappedX)) snappedX = Math.max(snappedX, startXForCompare + handleWidth); else if(isNaN(snappedX)) return;
//         groupToMove = yearGroup.select(".end-handle-group"); if (!isNaN(snappedX)) groupToMove.attr("transform", `translate(${snappedX}, ${handleBaseY})`); else console.error("handleDrag (End): Invalid snappedX.");
//     }
//     selectedStartDate = newStartDate; selectedEndDate = newEndDate; updateHighlightRect(); updateFilterInfoLabel(selectedStartDate, selectedEndDate);
// }
// // --- Plot Mode Drag End Handler --- (Defined Globally)
// function handleDragEndPlot(event) {
//   if (USE_TEXT_MODE) return; // Do nothing if in text mode

//   // Style handle back
//   if (svgInstance) {
//     d3.select(this)
//       .select(".drag-handle")
//       .attr("stroke", handleColor)
//       .attr("stroke-opacity", 1.0);
//   }

//   // Update date inputs (useful feedback)
//   if (startDateInput && selectedStartDate)
//     startDateInput.value = formatDateForInput(selectedStartDate);
//   if (endDateInput && selectedEndDate)
//     endDateInput.value = formatDateForInput(selectedEndDate);

//   // Filter data for the dragged selection and update dependent plots
//   filterDataAndUpdateCharts(selectedStartDate, selectedEndDate);
// }
// // Assign the correct drag end handler (needed for d3.drag().on('end', ...))
// const handleDragEnd = handleDragEndPlot;

// function updateHighlightRect() {
//     // Remove highlight in multi-year view or if conditions not met
//     const multiYear = !selectedStartDate || !selectedEndDate || selectedStartDate.getFullYear() !== selectedEndDate.getFullYear();
//     if (multiYear || !svgInstance || !selectedStartDate || !selectedEndDate || !calendarStartDay || isNaN(selectedStartDate) || isNaN(selectedEndDate) || currentCalendarHeight <= 0) {
//         svgInstance?.selectAll(".highlight-rect").remove();
//         return;
//     }

//     // Target the correct year group for the highlight
//     const year = selectedStartDate.getFullYear();
//     const yearGroup = svgInstance.select(`.year-group.year-${year}`);
//     if (yearGroup.empty()) { console.warn("Cannot find year group for highlight."); svgInstance?.selectAll(".highlight-rect").remove(); return; }

//     let highlightRect = yearGroup.select(".highlight-rect");
//     if (highlightRect.empty()) {
//         highlightRect = yearGroup.insert("rect", ":first-child") // Insert behind cells
//             .attr("class", "highlight-rect")
//             .attr("fill", highlightColor)
//             .attr("pointer-events", "none");
//     }

//     // Calculate X positions relative to the year's grid start
//     const startX = getXFromDate(selectedStartDate, calendarStartDay, cellWidthWithPadding);
//     const endHandleDateForPositioning = d3.timeDay.offset(selectedEndDate, 1);
//     const safeEndPosDate = endHandleDateForPositioning <= selectedStartDate ? d3.timeDay.offset(selectedStartDate, 1) : endHandleDateForPositioning;
//     let endX = getXFromDate(safeEndPosDate, calendarStartDay, cellWidthWithPadding);
//     if (isNaN(endX)) endX = getXFromDate(selectedEndDate, calendarStartDay, cellWidthWithPadding) + cellWidthWithPadding;
//     endX = Math.max(endX, startX);

//     if (isNaN(startX) || isNaN(endX) || isNaN(currentCalendarHeight)) {
//         console.warn("updateHighlightRect: Invalid dimensions.", {startX, endX, currentCalendarHeight});
//         highlightRect.remove();
//         return;
//     }

//     // Update rectangle position and size relative to the year group's grid
//     const gridOffsetY = topPadding + yearLabelPadding; // Y offset of the grid within the year group
//     highlightRect
//         .attr("x", startX)
//         .attr("y", gridOffsetY) // Position relative to the grid start
//         .attr("width", Math.max(0, endX - startX))
//         .attr("height", currentCalendarHeight);
// }
// function drawLegend(container, scale, maxValue) {
//      container.innerHTML = ""; if (maxValue === undefined) return;
//     const legendWidth = 200, legendHeight = 20, legendMargin = { top: 0, right: 10, bottom: 15, left: 10 }, barHeight = 8;
//     const legendSvg = d3.select(container).append("svg").attr("width", legendWidth).attr("height", legendHeight + legendMargin.top + legendMargin.bottom); const legendDefs = legendSvg.append("defs"); const linearGradient = legendDefs.append("linearGradient").attr("id", "calendar-gradient"); const numStops = 10;
//     // Handle case where maxValue is 0 or scale has no interpolator
//     const hasData = maxValue > 0;
//     const interpolator = (!hasData || typeof scale.interpolator !== 'function') ? (() => noDataColor) : scale.interpolator();
//     linearGradient.selectAll("stop").data(d3.range(numStops + 1)).enter().append("stop").attr("offset", d => `${(d / numStops) * 100}%`).attr("stop-color", d => interpolator(d / numStops));
//     legendSvg.append("rect").attr("x", legendMargin.left).attr("y", legendMargin.top).attr("width", legendWidth - legendMargin.left - legendMargin.right).attr("height", barHeight).style("fill", !hasData ? noDataColor : "url(#calendar-gradient)").attr("rx", 2).attr("ry", 2);
//     legendSvg.append("text").attr("class", "legend-label").attr("x", legendMargin.left).attr("y", legendMargin.top + barHeight + 10).attr("text-anchor", "start").text("Less"); legendSvg.append("text").attr("class", "legend-label").attr("x", legendWidth - legendMargin.right).attr("y", legendMargin.top + barHeight + 10).attr("text-anchor", "end").text("More");
// }


// // Top Artists Bar Chart
// // function updateTopArtistsChart(data) {
// //     const containerId = 'top-artists-chart'; const container = document.getElementById(containerId); if (!container) return; container.innerHTML = "";
// //     if (!data || data.length === 0) { container.innerHTML = `<p class="empty-message">No artist data.</p>`; return; }
// //     const artistData = d3.rollups(data.filter(d => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0), v => d3.sum(v, d => d.ms_played / 60000), d => d.artist).sort((a, b) => d3.descending(a[1], b[1])).slice(0, 5);
// //     if (artistData.length === 0) { container.innerHTML = `<p class="empty-message">No artist data found in selection.</p>`; return; } // More specific message

// //     const margin = topListChartMargin; const calculatedHeight = artistData.length * (barHeight + 5) + margin.top + margin.bottom; const containerWidth = container.clientWidth > 0 ? container.clientWidth : 300; const width = containerWidth - margin.left - margin.right; const height = calculatedHeight - margin.top - margin.bottom; if (width <= 0 || height <= 0) { container.innerHTML = '<p class="error-message">Container too small.</p>'; return; }

// //     const svg = d3.select(container).append("svg").attr("width", containerWidth).attr("height", calculatedHeight).append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
// //     const yScale = d3.scaleBand().domain(artistData.map(d => d[0])).range([0, height]).padding(0.2); const maxTime = d3.max(artistData, d => d[1]); const xScale = d3.scaleLinear().domain([0, maxTime || 1]).range([0, width]).nice();
// //     // Y Axis (Artist Names)
// //     const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(10);
// //     svg.append("g").attr("class", "axis axis--y artist-axis").call(yAxis)
// //         .selectAll(".tick text") // Select the text elements
// //         .text(d => truncateText(d, 18)) // Apply truncation
// //         .append("title").text(d => d); // Add full name tooltip
// //     svg.selectAll(".axis--y path.domain").remove(); // Remove the axis line

// //     // Bars
// //     svg.selectAll(".bar").data(artistData).join("rect").attr("class", "bar artist-bar").attr("y", d => yScale(d[0])).attr("height", yScale.bandwidth()).attr("x", 0).attr("fill", "#1DB954").attr("width", 0) // Start width at 0 for transition
// //         .on("mouseover", (event, d) => showTooltip(event, `<b>${d[0]}</b><br>${formatTime(d[1])}`)).on("mousemove", moveTooltip).on("mouseout", hideTooltip)
// //         .transition().duration(500).attr("width", d => Math.max(0, xScale(d[1]))); // Animate width

// //     // Bar Labels (Time)
// //     svg.selectAll(".bar-label").data(artistData).join("text").attr("class", "bar-label").attr("x", d => xScale(d[1]) + 5).attr("y", d => yScale(d[0]) + yScale.bandwidth() / 2).attr("dy", "0.35em").attr("text-anchor", "start").style("font-size", "10px").style("fill", "#333").style("opacity", 0).text(d => formatTime(d[1]))
// //         .transition().duration(500).delay(250).style("opacity", 1); // Fade in label after bar animates
// // }

// function updateTopArtistsAsText(data) {
//   const placeholderImg = "https://via.placeholder.com/80";
//   const targetUl = document.getElementById("top-artists-chart");
//   if (!targetUl) return;
//   targetUl.innerHTML = "";

//   if (!data || data.length === 0) {
//     targetUl.innerHTML = `<li class="empty-message">No data.</li>`;
//     return;
//   }

//   const artistData = d3
//     .rollups(
//       data.filter(
//         (d) => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0
//       ),
//       (v) => d3.sum(v, (d) => d.ms_played / 60000),
//       (d) => d.artist
//     )
//     .sort((a, b) => d3.descending(a[1], b[1]))
//     .slice(0, 5);

//   if (artistData.length === 0) {
//     targetUl.innerHTML = `<li class="empty-message">No artist data.</li>`;
//     return;
//   }

//   artistData.forEach(([artist, totalMinutes], index) => {
//     const artistTracks = data.filter(
//       (d) =>
//         d.artist &&
//         d.artist.toLowerCase() === artist.toLowerCase() &&
//         d.spotify_track_uri &&
//         d.spotify_track_uri.includes("spotify:track:")
//     );

//     // ✅ Pick ANY track with a valid Spotify URI for the artist
//     const trackWithUri = artistTracks[0];

//     const li = document.createElement("li");
//     li.style.listStyle = "none"; // No bullet/dot
//     li.style.display = "flex"; // Use flex layout
//     li.style.flexDirection = "row";
//     li.style.marginBottom = "var(--spacing)";
//     li.style.alignItems = "center";

//     const renderWithImg = (imgUrl) => {
//       li.innerHTML = `
//           <img src="${imgUrl}" alt="${artist}" class="artist-img" style="margin-right: var(--spacing);" />
//           <span class="artist-name">${index + 1}. ${artist}</span>
//           <span class="artist-time">(${formatTime(totalMinutes)})</span>
//         `;
//       targetUl.appendChild(li);
//     };

//     if (trackWithUri) {
//       const trackId = trackWithUri.spotify_track_uri.split(":")[2];
//       const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
//       fetch(oEmbedUrl)
//         .then((res) => res.json())
//         .then((embedData) =>
//           renderWithImg(embedData.thumbnail_url || placeholderImg)
//         )
//         .catch(() => renderWithImg(placeholderImg));
//     } else {
//       renderWithImg(placeholderImg);
//     }
//   });
// }


// // // Top Tracks Bar Chart
// // function updateTopTracksChart(data) {
// //     const containerId = 'top-tracks-chart'; const container = document.getElementById(containerId); if (!container) return; container.innerHTML = "";
// //     if (!requiredColumns.track_name) { container.innerHTML = `<p class="error-message">Track data missing.</p>`; return; } if (!data || data.length === 0) { container.innerHTML = `<p class="empty-message">No track data.</p>`; return; }
// //     const trackData = d3.rollups( data.filter(d => d.track && d.track !== "Unknown Track" && d.track !== "N/A" && d.ms_played > 0), v => d3.sum(v, d => d.ms_played / 60000), d => `${d.track} • ${d.artist}` ).sort((a, b) => d3.descending(a[1], b[1])).slice(0, 5);
// //     if (trackData.length === 0) { container.innerHTML = `<p class="empty-message">No track data found in selection.</p>`; return; } // More specific

// //     const getTrackArtist = (key) => { const parts = key.split('•'); return { track: parts[0]?.trim() || 'Unknown Track', artist: parts[1]?.trim() || 'Unknown Artist' }; };
// //     const margin = topListChartMargin; const calculatedHeight = trackData.length * (barHeight + 15) + margin.top + margin.bottom; // Increased padding for two lines
// //     const containerWidth = container.clientWidth > 0 ? container.clientWidth : 300; const width = containerWidth - margin.left - margin.right; const height = calculatedHeight - margin.top - margin.bottom; if (width <= 0 || height <= 0) { container.innerHTML = '<p class="error-message">Container too small.</p>'; return; }

// //     const svg = d3.select(container).append("svg").attr("width", containerWidth).attr("height", calculatedHeight).append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
// //     const yScale = d3.scaleBand().domain(trackData.map(d => d[0])).range([0, height]).padding(0.25); const maxTime = d3.max(trackData, d => d[1]); const xScale = d3.scaleLinear().domain([0, maxTime || 1]).range([0, width]).nice();
// //     // Y Axis (Track/Artist Names) - Manual labels
// //     const yAxisGroup = svg.append("g").attr("class", "axis axis--y track-axis");
// //     yAxisGroup.selectAll(".tick") // Use selectAll to bind data
// //         .data(trackData)
// //         .join("g") // Join with <g> elements for each tick
// //         .attr("class", "tick")
// //         .attr("transform", d => `translate(0, ${yScale(d[0]) + yScale.bandwidth() / 2})`) // Position group vertically centered on band
// //         .append("text")
// //             .attr("x", -10) // Position left of the axis line
// //             .attr("text-anchor", "end")
// //             .each(function(d) { // Use 'each' to handle multi-line labels
// //                  const { track, artist } = getTrackArtist(d[0]);
// //                  const truncatedTrack = truncateText(track, 18);
// //                  const truncatedArtist = truncateText(artist, 20);
// //                  // Track Name (first line)
// //                  d3.select(this).append("tspan")
// //                     .attr("class", "axis-label-track")
// //                     .attr("x", -10).attr("dy", "-0.1em") // Adjust position for first line
// //                     .text(truncatedTrack)
// //                     .append("title").text(track); // Full track name tooltip
// //                  // Artist Name (second line)
// //                  d3.select(this).append("tspan")
// //                     .attr("class", "axis-label-artist")
// //                     .style("font-size", "0.8em").style("fill", "#666") // Smaller, grey
// //                     .attr("x", -10).attr("dy", "1.2em") // Position below track name
// //                     .text(truncatedArtist)
// //                     .append("title").text(artist); // Full artist name tooltip
// //              });
// //     // svg.selectAll(".axis--y path.domain").remove(); // Keep this if you want to hide the axis line

// //     // Bars
// //     svg.selectAll(".bar").data(trackData).join("rect").attr("class", "bar track-bar").attr("y", d => yScale(d[0])).attr("height", yScale.bandwidth()).attr("x", 0).attr("fill", "#6f42c1").attr("width", 0)
// //         .on("mouseover", (event, d) => { const { track, artist } = getTrackArtist(d[0]); showTooltip(event, `<b>${track}</b><br>${artist}<br>${formatTime(d[1])}`) }).on("mousemove", moveTooltip).on("mouseout", hideTooltip)
// //         .transition().duration(500).attr("width", d => Math.max(0, xScale(d[1])));

// //     // Bar Labels (Time)
// //     svg.selectAll(".bar-label").data(trackData).join("text").attr("class", "bar-label").attr("x", d => xScale(d[1]) + 5).attr("y", d => yScale(d[0]) + yScale.bandwidth() / 2).attr("dy", "0.35em").attr("text-anchor", "start").style("font-size", "10px").style("fill", "#333").style("opacity", 0).text(d => formatTime(d[1]))
// //         .transition().duration(500).delay(250).style("opacity", 1);
// // }

// function updateTopTracksAsText(data) {
//   const targetDiv = document.getElementById("top-tracks-chart");
//   if (!targetDiv) return;
//   targetDiv.innerHTML = "";

//   if (!requiredColumns.track_name) {
//     targetDiv.innerHTML = `<p class="error-message">Track data missing.</p>`;
//     return;
//   }
//   if (!data || data.length === 0) {
//     targetDiv.innerHTML = `<p class="empty-message">No data.</p>`;
//     return;
//   }

//   const trackData = d3
//     .rollups(
//       data.filter(
//         (d) =>
//           d.track &&
//           d.track !== "Unknown Track" &&
//           d.track !== "N/A" &&
//           d.ms_played > 0
//       ),
//       (v) => d3.sum(v, (d) => d.ms_played / 60000),
//       (d) => `${d.track} • ${d.artist}`
//     )
//     .sort((a, b) => d3.descending(a[1], b[1]))
//     .slice(0, 5);

//   if (trackData.length === 0) {
//     targetDiv.innerHTML = `<p class="empty-message">No track data.</p>`;
//     return;
//   }

//   const placeholderImg = "https://via.placeholder.com/80";

//   trackData.forEach(([trackArtist, totalMinutes], index) => {
//     const parts = trackArtist.split("•");
//     const trackName = parts[0]?.trim() || "Unknown Track";
//     const artistName = parts[1]?.trim() || "Unknown Artist";

//     const li = document.createElement("li");
//     li.style.listStyle = "none"; // Just in case it's inside a <ul>
//     li.style.display = "flex";
//     li.style.flexDirection = "row";
//     li.style.alignItems = "center";
//     li.style.marginBottom = "var(--spacing)";

//     const trackMatch = data.find(
//       (d) =>
//         d.track === trackName &&
//         d.artist === artistName &&
//         d.spotify_track_uri?.includes("spotify:track:")
//     );

//     const renderWithImg = (imgUrl) => {
//       li.innerHTML = `
//           <img src="${imgUrl}" alt="${trackName}" class="artist-img" style="margin-right: var(--spacing);" />
//           <span class="track-info">
//             <span class="track-name">${index + 1}. ${trackName}</span><br>
//             <span class="track-artist">${artistName}</span>
//           </span>
//           <span class="track-time"> (${formatTime(totalMinutes)})</span>
//         `;
//       targetDiv.appendChild(li);
//     };

//     if (trackMatch) {
//       const trackId = trackMatch.spotify_track_uri.split(":")[2];
//       const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
//       fetch(oEmbedUrl)
//         .then((res) => res.json())
//         .then((embedData) =>
//           renderWithImg(embedData.thumbnail_url || placeholderImg)
//         )
//         .catch(() => renderWithImg(placeholderImg));
//     } else {
//       renderWithImg(placeholderImg);
//     }
//   });
// }


// // Other Chart Functions (Time of Day, Day of Week, Streamgraph)
// function updateTimeOfDayChart(data) {
//     const targetDiv = document.getElementById('time-of-day-chart'); if (!targetDiv) return; targetDiv.innerHTML = ""; if (!data || data.length === 0) { targetDiv.innerHTML = `<p class="empty-message">No data.</p>`; return; }
//     const hourData = d3.rollups(data.filter(d => d.ms_played > 0), v => d3.sum(v, d => d.ms_played / 60000), d => d.ts.getHours()); const hourMap = new Map(hourData); const completeHourData = d3.range(24).map(h => [h, hourMap.get(h) || 0]);
//     const containerWidth = targetDiv.parentElement?.clientWidth || 400; const chartWidth = containerWidth > 0 ? containerWidth : 400; const chartHeight = 250; const width = chartWidth - chartMargin.left - chartMargin.right; const height = chartHeight - chartMargin.top - chartMargin.bottom; if (width <= 0 || height <= 0) { targetDiv.innerHTML = `<p class="error-message">Container too small.</p>`; return; }
//     const svg = d3.select(targetDiv).append("svg").attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`).attr("preserveAspectRatio", "xMinYMid meet").append("g").attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);
//     const x = d3.scaleBand().range([0, width]).domain(d3.range(24)).padding(0.2); const y = d3.scaleLinear().domain([0, d3.max(completeHourData, d => d[1]) || 1]).range([height, 0]).nice();
//     svg.append("g").attr("class", "axis axis--x").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x).tickValues(d3.range(0, 24, 3)).tickFormat(d => `${d}:00`)).append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", chartMargin.bottom - 15).attr("text-anchor", "middle").text("Hour of Day");
//     svg.append("g").attr("class", "axis axis--y").call(d3.axisLeft(y).ticks(5).tickFormat(d => formatTime(d))).append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", 0 - chartMargin.left).attr("x", 0 - (height / 2)).attr("dy", "1em").attr("text-anchor", "middle").text("Total Listening Time");
//     svg.selectAll(".bar").data(completeHourData).enter().append("rect").attr("class", "bar time-of-day-bar").attr("x", d => x(d[0])).attr("width", x.bandwidth()).attr("y", height).attr("height", 0).attr("fill", "#fd7e14").on("mouseover", (event, d) => showTooltip(event, `<b>Hour ${d[0]}</b><br>${formatTime(d[1])}`)).on("mousemove", moveTooltip).on("mouseout", hideTooltip).transition().duration(500).attr("y", d => y(d[1])).attr("height", d => Math.max(0, height - y(d[1])));
// }
// function updateDayOfWeekChart(data) {
//     const targetDiv = document.getElementById('day-of-week-chart'); if (!targetDiv) return; targetDiv.innerHTML = ""; if (!data || data.length === 0) { targetDiv.innerHTML = `<p class="empty-message">No data.</p>`; return; }
//     const dayData = d3.rollups(data.filter(d => d.ms_played > 0), v => d3.sum(v, d => d.ms_played / 60000), d => d.ts.getDay()); const dayMap = new Map(dayData); const completeDayData = d3.range(7).map(dayIndex => [dayIndex, dayMap.get(dayIndex) || 0]);
//     const containerWidth = targetDiv.parentElement?.clientWidth || 400; const chartWidth = containerWidth > 0 ? containerWidth : 400; const chartHeight = 250; const width = chartWidth - chartMargin.left - chartMargin.right; const height = chartHeight - chartMargin.top - chartMargin.bottom; if (width <= 0 || height <= 0) { targetDiv.innerHTML = `<p class="error-message">Container too small.</p>`; return; }
//     const svg = d3.select(targetDiv).append("svg").attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`).attr("preserveAspectRatio", "xMinYMid meet").append("g").attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);
//     const x = d3.scaleBand().range([0, width]).domain(d3.range(7)).padding(0.2); const y = d3.scaleLinear().domain([0, d3.max(completeDayData, d => d[1]) || 1]).range([height, 0]).nice();
//     svg.append("g").attr("class", "axis axis--x").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x).tickFormat(d => dayOfWeekNames[d])).append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", chartMargin.bottom - 15).attr("text-anchor", "middle").text("Day of Week");
//     svg.append("g").attr("class", "axis axis--y").call(d3.axisLeft(y).ticks(5).tickFormat(d => formatTime(d))).append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", 0 - chartMargin.left).attr("x", 0 - (height / 2)).attr("dy", "1em").attr("text-anchor", "middle").text("Total Listening Time");
//     svg.selectAll(".bar").data(completeDayData).enter().append("rect").attr("class", "bar day-of-week-bar").attr("x", d => x(d[0])).attr("width", x.bandwidth()).attr("y", height).attr("height", 0).attr("fill", "#6f42c1").on("mouseover", (event, d) => showTooltip(event, `<b>${dayOfWeekNames[d[0]]}</b><br>${formatTime(d[1])}`)).on("mousemove", moveTooltip).on("mouseout", hideTooltip).transition().duration(500).attr("y", d => y(d[1])).attr("height", d => Math.max(0, height - y(d[1])));
// }
// async function drawStreamgraph(filteredData, containerId) {
//     const container = document.getElementById(containerId); if (!container) return; container.innerHTML = ""; if (!filteredData || filteredData.length === 0) { container.innerHTML = '<p class="empty-message">No data.</p>'; return; }
//     const streamDataProcessed = filteredData.map(d => { let contentType = 'Music'; if (d.episode_name && String(d.episode_name).trim() !== "") contentType = 'Podcast'; return { ...d, contentType: contentType }; }).filter(d => d.ms_played > 0); if (streamDataProcessed.length === 0) { container.innerHTML = '<p class="empty-message">No Music/Podcast data.</p>'; return; }
//     const contentTypes = ['Music', 'Podcast']; const [minDate, maxDate] = d3.extent(streamDataProcessed, d => d.ts); const timeDiffDays = (maxDate && minDate) ? (maxDate - minDate) / (1000*60*60*24) : 0; const timeAggregator = timeDiffDays > 90 ? d3.timeWeek.floor : timeDiffDays > 7 ? d3.timeDay.floor : d3.timeHour.floor;
//     const aggregatedData = Array.from( d3.group(streamDataProcessed, d => timeAggregator(d.ts)), ([timeBin, values]) => { const entry = { timeBin: new Date(timeBin) }; let totalMsPlayedInBin = 0; contentTypes.forEach(type => entry[type] = 0); values.forEach(v => { if (entry.hasOwnProperty(v.contentType)) { entry[v.contentType] += v.ms_played; totalMsPlayedInBin += v.ms_played; } }); contentTypes.forEach(type => { entry[type] = (totalMsPlayedInBin > 0) ? (entry[type] / totalMsPlayedInBin) : 0; }); return entry; }).sort((a, b) => a.timeBin - b.timeBin); if (aggregatedData.length === 0) { container.innerHTML = '<p class="empty-message">No aggregated data.</p>'; return; }
//     const margin = { top: 20, right: 30, bottom: 40, left: 50 }; const containerWidth = container.clientWidth || 800; const height = 300 - margin.top - margin.bottom; const width = containerWidth - margin.left - margin.right; if (width <= 0 || height <= 0) { container.innerHTML = `<p class="error-message">Container too small.</p>`; return; }
//     const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${containerWidth} ${height + margin.top + margin.bottom}`).attr("preserveAspectRatio", "xMinYMid meet").append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
//     const xScale = d3.scaleTime().domain(d3.extent(aggregatedData, d => d.timeBin)).range([0, width]); const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]); const colorMap = { 'Music': '#1DB954', 'Podcast': '#6f42c1' }; const colorScale = d3.scaleOrdinal().domain(contentTypes).range(contentTypes.map(type => colorMap[type])); const stack = d3.stack().keys(contentTypes).offset(d3.stackOffsetExpand).order(d3.stackOrderNone); let series; try { series = stack(aggregatedData); } catch (error) { console.error("Streamgraph stacking error:", error); container.innerHTML = '<p class="error-message">Stacking error.</p>'; return; } if (series.length === 0 || !series[0] || series[0].length === 0) { container.innerHTML = '<p class="empty-message">No stack layers.</p>'; return; }
//     const areaGen = d3.area().x(d => xScale(d.data.timeBin)).y0(d => yScale(d[0])).y1(d => yScale(d[1])).curve(d3.curveBasis); svg.selectAll(".stream-layer").data(series).enter().append("path").attr("class", d => `stream-layer ${String(d.key).toLowerCase()}-layer`).attr("d", areaGen).attr("fill", d => colorScale(d.key)).attr("stroke", "#fff").attr("stroke-width", 0.5).on("mouseover", (event, d_layer) => { /* ... */ }).on("mousemove", moveTooltip).on("mouseout", (event, d) => { /* ... */ });
//     let xAxisTicks; if (timeDiffDays <= 1) xAxisTicks = d3.timeHour.every(3); else if (timeDiffDays <= 7) xAxisTicks = d3.timeDay.every(1); else if (timeDiffDays <= 90) xAxisTicks = d3.timeWeek.every(1); else xAxisTicks = d3.timeMonth.every(1); svg.append("g").attr("class", "axis axis--x").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(xScale).ticks(xAxisTicks).tickFormat(d3.timeFormat(timeDiffDays > 30 ? "%b %Y" : timeDiffDays > 1 ? "%a %d" : "%H:%M"))).append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", margin.bottom - 10).attr("text-anchor", "middle").text("Date / Time"); const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%")); svg.append("g").attr("class", "axis axis--y").call(yAxis).append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", 0 - margin.left).attr("x", 0 - (height / 2)).attr("dy", "1em").attr("text-anchor", "middle").text("Listening Time Rate (%)"); const legendContainer = svg.append("g").attr("class", "streamgraph-legend").attr("transform", `translate(${width - 100}, ${-10})`); const legendItems = legendContainer.selectAll(".legend-item").data(contentTypes).enter().append("g").attr("class", "legend-item").attr("transform", (d, i) => `translate(0, ${i * 15})`); legendItems.append("rect").attr("x", 0).attr("y", 0).attr("width", 10).attr("height", 10).attr("fill", d => colorScale(d)); legendItems.append("text").attr("x", 15).attr("y", 5).attr("dy", "0.35em").style("font-size", "10px").text(d => d); const descEl = container.nextElementSibling; if (descEl && descEl.classList.contains('chart-description')) descEl.innerHTML = "Proportional listening rate (%)";
// }
// async function drawForceGraph2(filteredData, containerId, topN = currentForceGraphTopN) {
//     const container = document.getElementById(containerId); if (!container) return; container.innerHTML = "";
//     if (forceGraphSliderValueSpan) forceGraphSliderValueSpan.textContent = topN;

//     if (!filteredData || filteredData.length < 2) { container.innerHTML = '<p class="empty-message">Not enough data.</p>'; return; }
//     const musicData = filteredData.filter(d => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0 && !d.episode_name).sort((a, b) => a.ts - b.ts);
//     if (musicData.length < 2) { container.innerHTML = '<p class="empty-message">Not enough music plays.</p>'; return; }

//     const artistCounts = d3.rollup(musicData, v => v.length, d => d.artist);
//     const topArtistsSet = new Set(Array.from(artistCounts.entries()).sort(([, countA], [, countB]) => countB - countA).slice(0, topN).map(([artist]) => artist));
//     if (topArtistsSet.size < 2) { container.innerHTML = `<p class="empty-message">Fewer than 2 top artists.</p>`; return; }

//     const transitions = new Map();
//     for (let i = 0; i < musicData.length - 1; i++) { const sourceArtist = musicData[i].artist; const targetArtist = musicData[i + 1].artist; if (topArtistsSet.has(sourceArtist) && topArtistsSet.has(targetArtist) && sourceArtist !== targetArtist) { const key = `${sourceArtist}:::${targetArtist}`; transitions.set(key, (transitions.get(key) || 0) + 1); } }
//     if (transitions.size === 0) { container.innerHTML = '<p class="empty-message">No transitions between top artists.</p>'; return; }

//     const nodes = Array.from(topArtistsSet).map(artist => ({ id: artist, playCount: artistCounts.get(artist) || 0 }));
//     const links = Array.from(transitions.entries()).map(([key, count]) => { const [source, target] = key.split(":::"); return { source: source, target: target, value: count }; });

//     // --- Chart Setup ---
//     const margin = { top: 10, right: 10, bottom: 10, left: 10 }; const containerWidth = container.clientWidth || 600; const containerHeight = 400; const width = containerWidth - margin.left - margin.right; const height = containerHeight - margin.top - margin.bottom;
//     if (width <= 0 || height <= 0) { container.innerHTML = '<p class="error-message">Container too small.</p>'; return; }
//     const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`).attr("preserveAspectRatio", "xMinYMid meet").style("max-width", "100%").style("height", "auto");
//     const mainGroup = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`); const zoomableGroup = mainGroup.append("g");
//     mainGroup.append("rect").attr("width", width).attr("height", height).attr("fill", "none").attr("pointer-events", "all");
//     zoomableGroup.append("defs").append("marker").attr("id", "arrowhead").attr("viewBox", "-0 -5 10 10").attr("refX", 15).attr("refY", 0).attr("orient", "auto").attr("markerWidth", 6).attr("markerHeight", 6).attr("xoverflow", "visible").append("svg:path").attr("d", "M 0,-5 L 10 ,0 L 0,5").attr("fill", "#999").style("stroke", "none");

//     // --- Scales ---
//     const minRadius = 5, maxRadius = 15; const playCountExtent = d3.extent(nodes, d => d.playCount); const nodeRadiusScale = d3.scaleSqrt().domain([playCountExtent[0] || 0, playCountExtent[1] || 1]).range([minRadius, maxRadius]);
//     const nodeColorScale = d3.scaleSequential(d3.interpolateViridis).domain([playCountExtent[1] || 1, 0]);
//     const maxStrokeWidth = 6; const linkWidthScale = d3.scaleLinear().domain([0, d3.max(links, d => d.value) || 1]).range([1, maxStrokeWidth]);

//     // --- Simulation ---
//     const simulation = d3.forceSimulation(nodes)
//         .force("link", d3.forceLink(links).id(d => d.id).distance(90).strength(link => 1 / Math.min(link.source.playCount || 1, link.target.playCount || 1)))
//         .force("charge", d3.forceManyBody().strength(-180))
//         .force("center", d3.forceCenter(width / 2, height / 2))
//         .force("collide", d3.forceCollide().radius(d => nodeRadiusScale(d.playCount) + 6).strength(0.8));

//     const linkedByIndex = {}; links.forEach(d => { const sourceId = typeof d.source === 'object' ? d.source.id : d.source; const targetId = typeof d.target === 'object' ? d.target.id : d.target; linkedByIndex[`${sourceId},${targetId}`] = 1; });
//     function areNeighbors(a, b) { return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id; }

//     // --- Draw Elements ---
//     const link = zoomableGroup.append("g").attr("class", "force-links").attr("stroke", "#999").attr("stroke-opacity", 0.5).selectAll("line").data(links).join("line").attr("stroke-width", d => linkWidthScale(d.value)).attr("marker-end", "url(#arrowhead)");
//     link.append("title").text(d => `${d.source.id || d.source} → ${d.target.id || d.target}\n${d.value} transitions`);
//     const node = zoomableGroup.append("g").attr("class", "force-nodes").attr("stroke", "#fff").attr("stroke-width", 1.5).selectAll("circle").data(nodes).join("circle").attr("r", d => nodeRadiusScale(d.playCount)).attr("fill", d => nodeColorScale(d.playCount)).call(drag(simulation));
//     node.append("title").text(d => `${d.id}\n${d.playCount} plays`);
//     const labels = zoomableGroup.append("g").attr("class", "force-labels").attr("font-family", "sans-serif").attr("font-size", 10).attr("fill", "#333").attr("stroke", "white").attr("stroke-width", 0.3).attr("paint-order", "stroke").attr("pointer-events", "none").selectAll("text").data(nodes).join("text").attr("dx", d => nodeRadiusScale(d.playCount) + 4).attr("dy", "0.35em").text(d => d.id);

//     // --- Interaction ---
//     node.on("mouseover", highlight).on("mouseout", unhighlight); // link.on("mouseover", highlightLink).on("mouseout", unhighlightLink);
//     function highlight(event, d_hovered) { const opacity = 0.15; node.style("opacity", n => areNeighbors(d_hovered, n) ? 1 : opacity); node.style("stroke", n => n === d_hovered ? 'black' : '#fff'); node.style("stroke-width", n => n === d_hovered ? 2.5 : 1.5); link.style("stroke-opacity", l => (l.source === d_hovered || l.target === d_hovered) ? 0.9 : opacity * 0.5); link.style("stroke", l => (l.source === d_hovered || l.target === d_hovered) ? '#555' : '#999'); labels.style("opacity", n => areNeighbors(d_hovered, n) ? 1 : opacity); }
//     function unhighlight() { node.style("opacity", 1).style("stroke", '#fff').style("stroke-width", 1.5); link.style("stroke-opacity", 0.5).style("stroke", '#999'); labels.style("opacity", 1); }
//     function highlightLink(event, d_hovered) { /* ... */ } function unhighlightLink(event, d_hovered) { /* ... */ }

//     simulation.on("tick", () => { link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y); node.attr("cx", d => d.x).attr("cy", d => d.y); labels.attr("x", d => d.x).attr("y", d => d.y); });
//     function zoomed(event) { zoomableGroup.attr("transform", event.transform); }
//     const zoom = d3.zoom().scaleExtent([0.2, 8]).extent([[0, 0], [width, height]]).translateExtent([[0, 0], [width, height]]).on("zoom", zoomed);
//     svg.call(zoom); svg.on("dblclick.zoom", null);
//     function drag(simulation) { function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; d3.select(this).raise(); } function dragged(event, d) { d.fx = event.x; d.fy = event.y; } function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; } return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended); }

//     const descEl = container.nextElementSibling; if (descEl && descEl.classList.contains('chart-description')) { descEl.innerHTML = `Transitions between top ${nodes.length} artists (max ${topN} shown). Hover/Pan/Zoom.`; }
// }


// // --- Main Update Trigger for Dependent Charts ---
// // Called after calendar update or drag end (plot mode)
// function handleBrushUpdate(filteredChartData) {
//   const dataToUpdate = filteredChartData || [];
//   // Update all dependent charts with the filtered data
//   updateTopArtistsAsText(dataToUpdate);
//   updateTopTracksAsText(dataToUpdate);
//   updateTimeOfDayChart(dataToUpdate);
//   updateDayOfWeekChart(dataToUpdate);
//   drawStreamgraph(dataToUpdate, "streamgraph-chart");
//   drawForceGraph2(dataToUpdate, "force-graph-chart", currentForceGraphTopN); // Use current slider value
// }

// // --- Core Visualization Update Function ---
// // Called on initial load, year select change, or date range apply button
// function updateVisualization(filteredData) {
//   // Elements to clear before drawing new content
//   const chartsToClear = [
//     topArtistsContainer, topTracksContainer, timeOfDayDiv, dayOfWeekDiv,
//     streamgraphContainer, forceGraphContainer
//   ];
//   if (calendarDiv) calendarDiv.innerHTML = ""; // Clear main display area
//   if (legendDiv) legendDiv.innerHTML = ""; // Clear legend area

//   selectedStartDate = null; selectedEndDate = null; // Reset brush/handle selection state
//   currentViewData = filteredData || []; // Store the data for the current main view

//   // Handle case where the filtered data for the selected period is empty
//   if (!currentViewData || currentViewData.length === 0) {
//     if (calendarDiv) calendarDiv.innerHTML = `<p class="empty-message">No data found for the selected period.</p>`;
//     chartsToClear.forEach((el) => { if (el) el.innerHTML = `<p class="empty-message">No data.</p>`; });
//     updateFilterInfoLabel(null, null); // Show 'No selection or data' or similar
//     drawLegend(legendDiv, calendarColorScale, 0); // Draw empty legend
//     return; // Stop further processing
//   }

//   // Determine the date range of the *currently viewed data*
//   const [viewStartDate, viewEndDate] = d3.extent(currentViewData, (d) => d.ts);

//   // Validate the determined range
//   if (!viewStartDate || !viewEndDate || isNaN(viewStartDate) || isNaN(viewEndDate)) {
//     console.error("updateVisualization: Invalid date range in data.", viewStartDate, viewEndDate);
//     if (calendarDiv) calendarDiv.innerHTML = `<p class="error-message">Invalid date range in data.</p>`;
//     chartsToClear.forEach((el) => { if (el) el.innerHTML = `<p class="empty-message">No data.</p>`; });
//     updateFilterInfoLabel(null, null);
//     drawLegend(legendDiv, calendarColorScale, 0);
//     return;
//   }

//   // --- Draw Calendar and Update Dependent Charts ---
//   console.log(`Rendering view for: ${formatDate(viewStartDate)} to ${formatDate(viewEndDate)}`);

//   // Draw the appropriate calendar (handles single/multi-year internally)
//   drawCalendar2(currentViewData, viewStartDate, viewEndDate);

//   // Update all dependent charts using the full data for this view
//   handleBrushUpdate(currentViewData);

//   // Update filter label (drawCalendar2 also calls this, but call again for safety)
//   updateFilterInfoLabel(viewStartDate, viewEndDate);
// }

// // --- Filter Data and Update Dependent Charts (Plot Mode Only - Drag End) ---
// function filterDataAndUpdateCharts(startDate, endDate) {
//     // This function ONLY handles updates triggered by calendar handle drags in PLOT MODE (single year view).
//     if (USE_TEXT_MODE) {
//         console.warn("filterDataAndUpdateCharts called unexpectedly in text mode.");
//         return; // Should not happen
//     }

//     const validStartDate = (startDate instanceof Date && !isNaN(startDate)) ? startDate : selectedStartDate;
//     const validEndDate = (endDate instanceof Date && !isNaN(endDate)) ? endDate : selectedEndDate;

//     // Check if the selection is valid and if we have data for the current view
//     if (!validStartDate || !validEndDate || !currentViewData || currentViewData.length === 0 || isNaN(validStartDate) || isNaN(validEndDate) || validStartDate > validEndDate) {
//         console.warn("filterDataAndUpdateCharts (Plot Mode Drag): Invalid date range or no data.", { validStartDate, validEndDate });
//         // Update plots with empty data if range becomes invalid during drag
//         handleBrushUpdate([]);
//         updateFilterInfoLabel(validStartDate, validEndDate); // Show the invalid range attempt
//         return;
//     }

//     const filterStart = d3.timeDay.floor(validStartDate);
//     const filterEnd = d3.timeDay.offset(d3.timeDay.floor(validEndDate), 1); // Exclusive end

//     // Filter from the data currently loaded into the main calendar view (currentViewData)
//     const filtered = currentViewData.filter(d => {
//         const dDate = d.ts;
//         return dDate instanceof Date && !isNaN(dDate) && dDate >= filterStart && dDate < filterEnd;
//     });

//     console.log(`Filtered plot data (drag) from ${formatDate(validStartDate)} to ${formatDate(validEndDate)}: ${filtered.length} records.`);
//     updateFilterInfoLabel(validStartDate, validEndDate); // Update label

//     // Update the dependent plot components ONLY
//     handleBrushUpdate(filtered);
// }

// // --- Event Listener Setup Function ---
// function setupEventListeners() {
//   // Year Select Dropdown
//   if (wrappedYearSelect) {
//     wrappedYearSelect.onchange = () => {
//       const selectedValue = wrappedYearSelect.value;

//       if (selectedValue === "all") {
//         // Handle "All Time" selection
//         if (startDateInput && endDateInput && overallMinDate && overallMaxDate) {
//           startDateInput.value = formatDateForInput(overallMinDate);
//           endDateInput.value = formatDateForInput(overallMaxDate);
//           console.log("Year dropdown set to 'All Time'. Updating view.");
//           updateVisualization(allParsedData); // Update with full dataset
//         } else {
//           console.error("Cannot reset dates for 'All Time'");
//           updateVisualization([]); // Show empty state
//         }
//       } else if (selectedValue) {
//         // Handle specific year selection
//         const selectedYear = +selectedValue;
//         if (isNaN(selectedYear)) {
//           console.warn("Invalid year selected:", selectedValue);
//           updateVisualization([]);
//           return;
//         }

//         // Define year boundaries
//         const yearStart = new Date(selectedYear, 0, 1);
//         const yearEnd = new Date(selectedYear, 11, 31); // Inclusive end date for display/input

//         // Clamp the year range to the actual data range
//         const effectiveStartDate = (!overallMinDate || yearStart < overallMinDate) ? overallMinDate : yearStart;
//         const effectiveEndDate = (!overallMaxDate || yearEnd > overallMaxDate) ? overallMaxDate : yearEnd;
//         const effectiveEndFilter = d3.timeDay.offset(effectiveEndDate, 1); // Exclusive end for filtering

//         // Filter the *entire* dataset by the selected (clamped) year
//         const filteredByYear = allParsedData.filter(
//           (d) => d.ts >= effectiveStartDate && d.ts < effectiveEndFilter
//         );

//         // Update date inputs to reflect the clamped selected year
//         if (startDateInput) startDateInput.value = formatDateForInput(effectiveStartDate);
//         if (endDateInput) endDateInput.value = formatDateForInput(effectiveEndDate);

//         console.log(`Year dropdown set to ${selectedYear}. Updating view.`);
//         updateVisualization(filteredByYear);
//       } else {
//         // Handle case where selection is cleared (e.g., by date range input)
//         console.warn("Year selection cleared.");
//         // No automatic update here, rely on Apply button or handle differently if needed
//       }
//     };
//   } else {
//     console.error("#wrappedYearSelect not found.");
//   }

//   // Apply Date Range Button
//   if (applyRangeBtn) {
//     applyRangeBtn.onclick = () => {
//       const startStr = startDateInput.value;
//       const endStr = endDateInput.value;

//       // Basic validation
//       if (!startStr || !endStr) {
//           alert("Please select both a start and end date.");
//           return;
//       }

//       // Parse dates, ensuring local time zone start of day
//       let start = d3.timeDay.floor(new Date(startStr + "T00:00:00"));
//       let end = d3.timeDay.floor(new Date(endStr + "T00:00:00"));

//       if (isNaN(start) || isNaN(end)) {
//           alert("Invalid date format. Please use YYYY-MM-DD.");
//           return;
//       }

//       // Ensure start is before end or the same day
//       if (start > end) {
//         alert("Start date must be before or the same as the end date.");
//         return; // Make user correct it
//       }

//       // Clamp selected range to overall available data range
//       start = (!overallMinDate || start < overallMinDate) ? overallMinDate : start;
//       end = (!overallMaxDate || end > overallMaxDate) ? overallMaxDate : end;

//       // Update inputs if clamping occurred (visual feedback)
//       startDateInput.value = formatDateForInput(start);
//       endDateInput.value = formatDateForInput(end);

//       const filterEnd = d3.timeDay.offset(end, 1); // Exclusive end date for filtering

//       // Clear year selection as custom date range takes precedence
//       if (wrappedYearSelect) wrappedYearSelect.value = ""; // Set to blank/default

//       // Filter the *entire* dataset by the selected (and clamped) range
//       const filteredByRange = allParsedData.filter(
//         (d) => d.ts >= start && d.ts < filterEnd
//       );

//       console.log(`Apply Range button clicked. Updating view.`);
//       updateVisualization(filteredByRange); // Update the main view
//     };
//   } else {
//     console.error("#applyRangeBtn not found.");
//   }

//    // Force Graph Slider Listener (Only updates Force Graph)
//   if (forceGraphSlider && forceGraphSliderValueSpan) {
//      // Update display on input
//      forceGraphSlider.addEventListener('input', () => {
//         forceGraphSliderValueSpan.textContent = forceGraphSlider.value;
//      });
//      // Update graph only on change (when user releases slider)
//      forceGraphSlider.addEventListener('change', () => {
//         currentForceGraphTopN = parseInt(forceGraphSlider.value, 10);
//         forceGraphSliderValueSpan.textContent = currentForceGraphTopN; // Ensure display matches
//         console.log(`Force Graph TopN changed to: ${currentForceGraphTopN}`);

//         // Re-render only the force graph using the *currently viewed data*
//         if (currentViewData && currentViewData.length > 0) {
//             drawForceGraph2(currentViewData, 'force-graph-chart', currentForceGraphTopN);
//         } else {
//            console.log("Slider changed, but no current data to update force graph.");
//            // Optionally clear force graph if no data?
//            const fgContainer = document.getElementById('force-graph-chart');
//            if(fgContainer) fgContainer.innerHTML = '<p class="empty-message">Select data to see transitions.</p>';
//         }
//      });
//   } else {
//       console.warn("Force graph slider elements not found.");
//   }

//   console.log("Event listeners attached.");
// }

// // ============================================== //
// // === END OF spotifyDashboard.js ============ //
// // ============================================== //

// --- Configuration ---
// NOTE: TEXT_MODE is not fully implemented/tested in this version.
// Stick to USE_TEXT_MODE = false for visual plots.
const USE_TEXT_MODE = false; // SET TO true FOR TEXT, false FOR PLOTS
// --- End Configuration ---

// Removed Calendar-specific constants like cellSize, cellPadding etc.
const leftPadding = 40; // Keep for general chart layout if needed, adjust as necessary
const topPadding = 20; // Keep for general chart layout if needed, adjust as necessary
const noDataColor = "#ebedf0"; // Keep for consistency if needed elsewhere
// const calendarColorScale = d3.scaleSequential(d3.interpolateBlues); // No longer needed for main chart
const chartMargin = { top: 30, right: 30, bottom: 60, left: 70 }; // General chart margins for line graph
const topListChartMargin = { top: 10, right: 50, bottom: 20, left: 120 }; // Margins for top list bar charts
const barHeight = 20; // Height for bars in top list charts

// Removed Handle-related constants

// --- DOM Elements ---
const wrappedYearSelect = document.getElementById("wrappedYearSelect");
console.log("Found #wrappedYearSelect element:", wrappedYearSelect);
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const applyRangeBtn = document.getElementById("applyRangeBtn");
const mainChartDiv = document.getElementById("calendar"); // Re-purpose this div for the line graph
// const legendDiv = document.getElementById("legend"); // May not be needed for line graph, keep for now
const topArtistsContainer = document.getElementById("top-artists-chart"); // Target the DIV now
const tooltipDiv = d3.select("#tooltip");
const topTracksContainer = document.getElementById("top-tracks-chart"); // Target the DIV
const timeOfDayDiv = document.getElementById("time-of-day-chart");
const dayOfWeekDiv = document.getElementById("day-of-week-chart");
const filterInfoSpan = document.getElementById("current-filter-info");
const streamgraphContainer = document.getElementById("streamgraph-chart"); // Added
const forceGraphContainer = document.getElementById("force-graph-chart"); // Added
const forceGraphSlider = document.getElementById("forceGraphSlider");
const forceGraphSliderValueSpan = document.getElementById("forceGraphSliderValue");

// --- Helper Functions ---
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

// --- Global variables ---
let allParsedData = [];
let requiredColumns = {
  track_name: true, // Assume true for simplicity, original check is good practice
  artist: true, album: true, img: true, platform: true, skipped: true,
  shuffle: true, episode_name: true, episode_show_name: true,
  audiobook_title: true, audiobook_chapter_title: true,
  reason_start: true, reason_end: true, conn_country: true,
};
let currentViewData = []; // Data filtered by year/range from controls
let selectedStartDate = null; // Start date of brush/handle selection
let selectedEndDate = null; // End date of brush/handle selection
// Removed plot-mode specific globals related to calendar grid/handles
let svgInstance = null; // Main line graph SVG instance
let currentForceGraphTopN = 5; // Default for force graph slider, matches HTML slider value
let overallMinDate = null; // Store overall min date
let overallMaxDate = null; // Store overall max date
let lineGraphBrush = null; // Store the brush behavior instance
let lineGraphXScale = null; // Store the x-scale for brush interaction


// --- Data Processing (Runs once) ---
(async function loadData() {
  try {
    const rawData = await d3.csv("data/astrid_data.csv");

    // Detect available columns
    const columns = new Set(rawData.columns);
    const columnMapping = {
      track_name: "master_metadata_track_name", artist: "master_metadata_album_artist_name",
      album: "master_metadata_album_album_name", img: "spotify_track_uri", // Use URI for img lookup later
      platform: "platform", skipped: "skipped", shuffle: "shuffle", episode_name: "episode_name",
      episode_show_name: "episode_show_name", audiobook_title: "audiobook_title",
      audiobook_chapter_title: "audiobook_chapter_title", reason_start: "reason_start",
      reason_end: "reason_end", conn_country: "conn_country",
    };
    Object.keys(columnMapping).forEach((key) => {
      requiredColumns[key] = columns.has(columnMapping[key]);
    });

    allParsedData = rawData
      .map((d) => ({
        ts: new Date(d.ts), ms_played: +d.ms_played,
        platform: d.platform || "Unknown", conn_country: d.conn_country || "Unknown",
        artist: d.master_metadata_album_artist_name || "Unknown Artist",
        track: requiredColumns.track_name ? (d.master_metadata_track_name || "Unknown Track") : "N/A",
        album: d.master_metadata_album_album_name || "Unknown Album",
        episode_name: d.episode_name || null, episode_show_name: d.episode_show_name || null,
        audiobook_title: d.audiobook_title || null, audiobook_chapter_title: d.audiobook_chapter_title || null,
        skipped: ["true", "1", true].includes(String(d.skipped).toLowerCase()),
        shuffle: ["true", "1", true].includes(String(d.shuffle).toLowerCase()),
        reason_start: d.reason_start || "N/A", reason_end: d.reason_end || "N/A",
        spotify_track_uri: d.spotify_track_uri || null,
      }))
      .filter(
        (d) =>
          d.ts instanceof Date && !isNaN(d.ts) &&
          typeof d.ms_played === "number" && !isNaN(d.ms_played) && d.ms_played >= 0
      );

    // Sort data once after parsing
    allParsedData.sort((a, b) => a.ts - b.ts);

    console.log(`Loaded and parsed ${allParsedData.length} valid records.`);

    // Handle no valid data found
    if (allParsedData.length === 0) {
        if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">No valid data found.</p>`;
        if (filterInfoSpan) filterInfoSpan.textContent = "No data loaded";
        [topArtistsContainer, topTracksContainer, timeOfDayDiv, dayOfWeekDiv, streamgraphContainer, forceGraphContainer]
            .forEach(el => { if (el) el.innerHTML = `<p class="empty-message">No data.</p>`; });
        [wrappedYearSelect, startDateInput, endDateInput, applyRangeBtn, forceGraphSlider]
            .forEach(el => { if (el) el.disabled = true; });
        return; // Stop execution
    }

    // --- Determine Overall Date Range ---
    overallMinDate = d3.min(allParsedData, (d) => d.ts);
    overallMaxDate = d3.max(allParsedData, (d) => d.ts);
    const years = [...new Set(allParsedData.map((d) => d.ts.getFullYear()))].sort((a, b) => a - b);
    console.log("Available years:", years);
    console.log("Overall date range:", overallMinDate, "to", overallMaxDate);

    // --- Populate Year Select ---
    if (wrappedYearSelect) {
      // Add "All Time" Option FIRST
      const allTimeOption = document.createElement("option");
      allTimeOption.value = "all";
      allTimeOption.textContent = "All Time";
      wrappedYearSelect.appendChild(allTimeOption);

      years.forEach((y) => {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        wrappedYearSelect.appendChild(opt);
      });
      wrappedYearSelect.value = "all"; // Set default selection to "All Time"
    } else {
      console.error("Cannot find #wrappedYearSelect.");
    }

    // --- Set Date Inputs to Overall Range ---
    if (startDateInput && endDateInput && overallMinDate && overallMaxDate) {
      const minDateStr = formatDateForInput(overallMinDate);
      const maxDateStr = formatDateForInput(overallMaxDate);
      startDateInput.value = minDateStr;
      endDateInput.value = maxDateStr;
      startDateInput.min = minDateStr; // Set bounds for picker
      startDateInput.max = maxDateStr;
      endDateInput.min = minDateStr;
      endDateInput.max = maxDateStr;
      console.log(`Set initial date range inputs: ${minDateStr} to ${maxDateStr}`);
    } else {
       console.error("Could not set initial date input values or missing overall date range.");
    }

    // --- Setup Force Graph Slider ---
    // Set initial display value (assuming default value is set in HTML)
    if (forceGraphSlider && forceGraphSliderValueSpan) {
        currentForceGraphTopN = parseInt(forceGraphSlider.value, 10); // Read initial value
        forceGraphSliderValueSpan.textContent = currentForceGraphTopN;
    } else {
        console.warn("Force graph slider or value display not found.");
    }

    // --- Initial Load ---
    // Directly call updateVisualization with the full dataset
    console.log("Triggering initial visualization with full data range...");
    updateVisualization(allParsedData);

    // --- Attach Event Listeners AFTER initial setup ---
    // Call setupEventListeners() at the end of the try block or in a finally block
  } catch (error) {
    console.error("Error loading or processing data:", error);
     if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">Error loading data.</p>`;
     if (filterInfoSpan) filterInfoSpan.textContent = 'Error loading data';
     [topArtistsContainer, topTracksContainer, timeOfDayDiv, dayOfWeekDiv, streamgraphContainer, forceGraphContainer]
        .forEach(el => { if (el) el.innerHTML = `<p class="error-message">Error loading data.</p>`; });
     [wrappedYearSelect, startDateInput, endDateInput, applyRangeBtn, forceGraphSlider]
        .forEach(el => { if (el) el.disabled = true; });
  } finally {
      // Ensure event listeners are attached even if there was an error during setup (though controls might be disabled)
      setupEventListeners();
  }
})(); // Immediately invoke the async function

// --- Tooltip Logic ---
const showTooltip = (event, content) => {
  tooltipDiv
    .style("opacity", 1)
    .html(content)
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 20 + "px");
};
const moveTooltip = (event) => {
  tooltipDiv
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 20 + "px");
};
const hideTooltip = () => {
  tooltipDiv.style("opacity", 0);
};

// Removed Calendar Dragging Helper Functions

// --- Filter Info Label Update ---
function updateFilterInfoLabel(startDate, endDate) {
  if (!filterInfoSpan) return;
  if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
    filterInfoSpan.textContent = `${formatDate(startDate)} → ${formatDate(endDate)}`;
  } else {
      // If no valid selection, try showing the range of the current view data
      if (currentViewData && currentViewData.length > 0) {
        const [minD, maxD] = d3.extent(currentViewData, (d) => d.ts);
        if (minD && maxD && !isNaN(minD) && !isNaN(maxD)) {
          filterInfoSpan.textContent = `${formatDate(minD)} → ${formatDate(maxD)} (Current View)`;
        } else {
          filterInfoSpan.textContent = "Select a period"; // Fallback if view data invalid
        }
      } else {
           filterInfoSpan.textContent = "No data loaded or selected"; // Fallback if no data at all
      }
  }
}

// --- Plotting Functions ---

// // New Line/Area Graph Function
// function drawLineGraph(data, initialStartDate, initialEndDate) {
//     mainChartDiv.innerHTML = ""; // Clear the container
//     legendDiv.innerHTML = ""; // Clear the old legend area
//     svgInstance = null; // Reset SVG instance
//     lineGraphXScale = null; // Reset scale reference

//     const listeningData = data.filter(d => d.ms_played > 0);
//     if (listeningData.length === 0) {
//         if (mainChartDiv) mainChartDiv.innerHTML = `<p class="empty-message">No listening data for this period.</p>`;
//         updateFilterInfoLabel(initialStartDate, initialEndDate);
//         return;
//     }

//     // Aggregate data by day
//     const dailyDataMap = d3.rollup(listeningData, v => d3.sum(v, d => d.ms_played / 60000), d => d3.timeDay.floor(d.ts));
//     const maxMinutesOverall = d3.max(dailyDataMap.values()) || 0;

//     // Ensure dates are valid Date objects
//     const dataStartDate = initialStartDate instanceof Date && !isNaN(initialStartDate) ? d3.timeDay.floor(initialStartDate) : null;
//     const dataEndDate = initialEndDate instanceof Date && !isNaN(initialEndDate) ? d3.timeDay.floor(initialEndDate) : null;

//     if (!dataStartDate || !dataEndDate || dataStartDate > dataEndDate) {
//         console.error("drawLineGraph: Invalid initial date range.", dataStartDate, dataEndDate);
//         if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">Invalid date range provided.</p>`;
//         return;
//     }

//     // Generate a complete array of days for the x-axis domain
//     const allDaysInRange = d3.timeDays(dataStartDate, d3.timeDay.offset(dataEndDate, 1));
//     const processedDailyData = allDaysInRange.map(day => ({
//         date: day,
//         value: dailyDataMap.get(day) || 0 // Use 0 for days with no listening
//     }));

//     // Calculate dimensions
//     const containerWidth = mainChartDiv.clientWidth > 0 ? mainChartDiv.clientWidth : 600; // Default width
//     const chartHeight = 300; // Fixed height, or calculate based on container
//     const width = containerWidth - chartMargin.left - chartMargin.right;
//     const height = chartHeight - chartMargin.top - chartMargin.bottom;

//     if (width <= 0 || height <= 0) {
//         if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">Container too small to draw chart.</p>`;
//         return;
//     }

//     const svg = d3.select(mainChartDiv).append("svg")
//         .attr("width", containerWidth)
//         .attr("height", chartHeight)
//         .attr("viewBox", `0 0 ${containerWidth} ${chartHeight}`)
//         .attr("preserveAspectRatio", "xMinYMid meet");

//     svgInstance = svg; // Store reference

//     const chartGroup = svg.append("g")
//         .attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);

//     // Scales
//     const xScale = d3.scaleTime()
//         .domain([dataStartDate, dataEndDate]) // Use the actual range of the data
//         .range([0, width]);
//     lineGraphXScale = xScale; // Store globally for brush

//     const yScale = d3.scaleLinear()
//         .domain([0, d3.max(processedDailyData, d => d.value) || 1]) // Max listening time or 1
//         .range([height, 0])
//         .nice();

//     // Axes
//     const xAxis = d3.axisBottom(xScale)
//         .ticks(d3.timeMonth.every(1)) // Adjust tick frequency as needed
//         .tickFormat(d3.timeFormat("%b %Y")); // Example format

//     chartGroup.append("g")
//         .attr("class", "axis axis--x")
//         .attr("transform", `translate(0, ${height})`)
//         .call(xAxis)
//       .selectAll("text")
//         .style("text-anchor", "end")
//         .attr("dx", "-.8em")
//         .attr("dy", ".15em")
//         .attr("transform", "rotate(-45)");

//     // Add X Axis Label
//     chartGroup.append("text")
//         .attr("class", "axis-label")
//         .attr("transform", `translate(${width / 2}, ${height + chartMargin.bottom - 10})`)
//         .style("text-anchor", "middle")
//         .text("Date");

//     const yAxis = d3.axisLeft(yScale)
//         .ticks(5) // Adjust number of ticks
//         .tickFormat(d => formatTime(d)); // Use your time formatting function

//     chartGroup.append("g")
//         .attr("class", "axis axis--y")
//         .call(yAxis);

//     // Add Y Axis Label
//     chartGroup.append("text")
//         .attr("class", "axis-label")
//         .attr("transform", "rotate(-90)")
//         .attr("y", 0 - chartMargin.left + 15) // Adjust position
//         .attr("x", 0 - (height / 2))
//         .attr("dy", "1em")
//         .style("text-anchor", "middle")
//         .text("Total Listening Time per Day");

//     // Area Generator
//     const areaGen = d3.area()
//         .x(d => xScale(d.date))
//         .y0(height)
//         .y1(d => yScale(d.value))
//         .curve(d3.curveMonotoneX); // Smoother curve

//     // Line Generator
//     const lineGen = d3.line()
//         .x(d => xScale(d.date))
//         .y(d => yScale(d.value))
//         .curve(d3.curveMonotoneX); // Smoother curve


//     // Draw Area
//     chartGroup.append("path")
//         .datum(processedDailyData)
//         .attr("class", "area")
//         .attr("fill", "steelblue")
//         .attr("fill-opacity", 0.3)
//         .attr("d", areaGen);

//     // Draw Line
//     chartGroup.append("path")
//         .datum(processedDailyData)
//         .attr("class", "line")
//         .attr("fill", "none")
//         .attr("stroke", "#189a46")
//         .attr("stroke-width", 1.5)
//         .attr("d", lineGen);

//     // --- Add Brushing ---
//     lineGraphBrush = d3.brushX()
//         .extent([[0, 0], [width, height]]) // Cover the chart area
//         .on("end", handleBrushEnd); // Call function when brush stops

//     const brushGroup = chartGroup.append("g")
//         .attr("class", "brush")
//         .call(lineGraphBrush);

//     // Tooltip Interaction - Add an overlay rectangle for capturing mouse events
//      const focus = chartGroup.append("g")
//         .attr("class", "focus")
//         .style("display", "none");

//     focus.append("line").attr("class", "focus-line y").attr("y1", 0).attr("y2", height);
//     focus.append("circle").attr("class", "focus-circle").attr("r", 4);

//     chartGroup.append("rect")
//         .attr("class", "overlay")
//         .attr("width", width)
//         .attr("height", height)
//         .style("fill", "none")
//         .style("pointer-events", "all")
//         .on("mouseover", () => focus.style("display", null))
//         .on("mouseout", () => {
//              focus.style("display", "none");
//              hideTooltip();
//         })
//         .on("mousemove", mousemove);

//     const bisectDate = d3.bisector(d => d.date).left;

//     function mousemove(event) {
//         if (!lineGraphXScale || processedDailyData.length === 0) return; // Guard clause
//         const pointer = d3.pointer(event, this);
//         const x0 = lineGraphXScale.invert(pointer[0]);
//         const i = bisectDate(processedDailyData, x0, 1);
//         const d0 = processedDailyData[i - 1];
//         const d1 = processedDailyData[i];
//         const d = (!d0 || !d1 || (x0 - d0.date > d1.date - x0)) ? d1 : d0; // Find closest data point

//         if (d) {
//             focus.style("display", null);
//             focus.select(".focus-line.y")
//                  .attr("transform", `translate(${lineGraphXScale(d.date)}, 0)`);
//             focus.select(".focus-circle")
//                  .attr("transform", `translate(${lineGraphXScale(d.date)}, ${yScale(d.value)})`);
//             showTooltip(event, `${formatDate(d.date)}<br><b>Listened: ${formatTime(d.value)}</b>`);
//         } else {
//             focus.style("display", "none");
//             hideTooltip();
//         }
//     }

//     // --- End Brushing & Tooltip ---

//     // Update filter label for the initial view
//     updateFilterInfoLabel(dataStartDate, dataEndDate);

//     // Set initial selection state (important for subsequent filtering)
//     selectedStartDate = dataStartDate;
//     selectedEndDate = dataEndDate;
// }

// --- Plotting Functions ---

// Updated Line/Area Graph Function with Green Color and Brushing
function drawLineGraph(data, initialStartDate, initialEndDate) {
  mainChartDiv.innerHTML = ""; // Clear the container
  // legendDiv.innerHTML = ""; // Clear the old legend area
  svgInstance = null; // Reset SVG instance
  lineGraphXScale = null; // Reset scale reference
  
  const listeningData = data.filter(d => d.ms_played > 0);
  if (listeningData.length === 0) {
      if (mainChartDiv) mainChartDiv.innerHTML = `<p class="empty-message">No listening data for this period.</p>`;
      updateFilterInfoLabel(initialStartDate, initialEndDate);
      return;
  }

  // Aggregate data by day
  const dailyDataMap = d3.rollup(listeningData, v => d3.sum(v, d => d.ms_played / 60000), d => d3.timeDay.floor(d.ts));
  const maxMinutesOverall = d3.max(dailyDataMap.values()) || 0;

  // Ensure dates are valid Date objects
  const dataStartDate = initialStartDate instanceof Date && !isNaN(initialStartDate) ? d3.timeDay.floor(initialStartDate) : null;
  const dataEndDate = initialEndDate instanceof Date && !isNaN(initialEndDate) ? d3.timeDay.floor(initialEndDate) : null;

  if (!dataStartDate || !dataEndDate || dataStartDate > dataEndDate) {
      console.error("drawLineGraph: Invalid initial date range.", dataStartDate, dataEndDate);
      if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">Invalid date range provided.</p>`;
      return;
  }

  // Generate a complete array of days for the x-axis domain
  const allDaysInRange = d3.timeDays(dataStartDate, d3.timeDay.offset(dataEndDate, 1));
  const processedDailyData = allDaysInRange.map(day => ({
      date: day,
      value: dailyDataMap.get(day) || 0 // Use 0 for days with no listening
  }));

  // Calculate dimensions
  const containerWidth = mainChartDiv.clientWidth > 0 ? mainChartDiv.clientWidth : 600; // Default width
  const chartHeight = 300; // Fixed height, or calculate based on container
  const width = containerWidth - chartMargin.left - chartMargin.right;
  const height = chartHeight - chartMargin.top - chartMargin.bottom;

  if (width <= 0 || height <= 0) {
      if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">Container too small to draw chart.</p>`;
      return;
  }

  const svg = d3.select(mainChartDiv).append("svg")
      .attr("width", containerWidth)
      .attr("height", chartHeight)
      .attr("viewBox", `0 0 ${containerWidth} ${chartHeight}`)
      .attr("preserveAspectRatio", "xMinYMid meet");

  svgInstance = svg; // Store reference

  const chartGroup = svg.append("g")
      .attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);

  // Scales
  const xScale = d3.scaleTime()
      .domain([dataStartDate, dataEndDate]) // Use the actual range of the data
      .range([0, width]);
  lineGraphXScale = xScale; // Store globally for brush

  const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedDailyData, d => d.value) || 1]) // Max listening time or 1
      .range([height, 0])
      .nice();

  // Axes
  const xAxis = d3.axisBottom(xScale)
      // Adjust tick frequency dynamically based on range?
      .ticks(width / 80) // Roughly one tick every 80 pixels
      .tickSizeOuter(0) // Remove ticks at the ends of the axis
      .tickFormat(d3.timeFormat("%b %d %Y")); // More detailed format if needed

  chartGroup.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0, ${height})`)
      .call(xAxis)
    .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-65)"); // Rotate more if labels overlap

  // Add X Axis Label
  chartGroup.append("text")
      .attr("class", "axis-label")
      .attr("transform", `translate(${width / 2}, ${height + chartMargin.bottom - 5})`) // Adjusted y position
      .style("text-anchor", "middle")
      .text("Date");

  const yAxis = d3.axisLeft(yScale)
      .ticks(5) // Adjust number of ticks
      .tickFormat(d => formatTime(d)); // Use your time formatting function

  chartGroup.append("g")
      .attr("class", "axis axis--y")
      .call(yAxis)
      // Remove the vertical axis line
      .call(g => g.select(".domain").remove())
      // Optionally remove tick lines
      .call(g => g.selectAll(".tick line").remove());


  // Add Y Axis Label
  chartGroup.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - chartMargin.left + 15) // Adjust position
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Total Listening Time per Day");

  // Area Generator
  const areaGen = d3.area()
      .x(d => xScale(d.date))
      .y0(height) // Base of the area is the bottom of the chart
      .y1(d => yScale(d.value)) // Top of the area follows the data line
      .curve(d3.curveMonotoneX); // Smoother curve

  // Line Generator
  const lineGen = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .defined(d => d.value > 0) // Prevent line from dropping to 0 for missing days (optional)
      .curve(d3.curveMonotoneX); // Smoother curve


  // Draw Area - *** CHANGED COLOR AND OPACITY ***
  chartGroup.append("path")
      .datum(processedDailyData)
      .attr("class", "area")
      .attr("fill", "#1DB954") // Green fill color
      .attr("fill-opacity", 0.4) // Slightly more opaque fill
      .attr("d", areaGen);

  // Draw Line - *** CHANGED COLOR ***
  chartGroup.append("path")
      .datum(processedDailyData.filter(lineGen.defined())) // Only draw line where data exists if using .defined()
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "#1DB954") // Green stroke color
      .attr("stroke-width", 1.5)
      .attr("d", lineGen);

  // --- Add Brushing (Selection) ---
  lineGraphBrush = d3.brushX()
      .extent([[0, 0], [width, height]]) // Cover the chart area
      .on("end", handleBrushEnd); // Call function when brush stops

  console.log("Adding brush to chart group");

    

  const brushGroup = chartGroup.append("g")
      .attr("class", "brush")
      .call(lineGraphBrush);

  console.log("Brush group added to chart group");
  console.log("Brush applied. Brush Group Element:", brushGroup.node());


  // --- Tooltip Interaction ---
   const focus = chartGroup.append("g")
      .attr("class", "focus")
      .style("display", "none");

  console.log("Focus group added to chart group");

  // Vertical line extending full chart height
  focus.append("line")
       .attr("class", "focus-line y")
       .attr("stroke", "#666")
       .attr("stroke-width", 1)
       .attr("stroke-dasharray", "3,3")
       .attr("y1", 0)
       .attr("y2", height);
  console.log("Focus line added to focus group");

  focus.append("circle").attr("class", "focus-circle").attr("r", 4).attr("fill", "#1DB954").attr("stroke", "white");

  chartGroup.append("rect")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => focus.style("display", null))
      .on("mouseout", () => {
           focus.style("display", "none");
           hideTooltip();
      })
      .on("mousemove", mousemove);
  console.log("Overlay rectangle added for mouse events");

  const bisectDate = d3.bisector(d => d.date).left;

  function mousemove(event) {
      if (!lineGraphXScale || processedDailyData.length === 0) return; // Guard clause
      const pointer = d3.pointer(event, this);
      const x0 = lineGraphXScale.invert(pointer[0]);
      const i = bisectDate(processedDailyData, x0, 1);
      const d0 = processedDailyData[i - 1];
      const d1 = processedDailyData[i];
      const d = (!d0 || !d1 || (x0 - d0.date > d1.date - x0)) ? d1 : d0; // Find closest data point

      if (d) {
          focus.style("display", null);
          // Position the vertical line
          focus.select(".focus-line.y")
               .attr("transform", `translate(${lineGraphXScale(d.date)}, 0)`);
          // Position the circle on the data point
          focus.select(".focus-circle")
               .attr("transform", `translate(${lineGraphXScale(d.date)}, ${yScale(d.value)})`);
          showTooltip(event, `${formatDate(d.date)}<br><b>Listened: ${formatTime(d.value)}</b>`);
      } else {
          focus.style("display", "none");
          hideTooltip();
      }
  }
  // --- End Tooltip ---

  // Update filter label for the initial view
  updateFilterInfoLabel(dataStartDate, dataEndDate);

  // Set initial selection state (important for subsequent filtering)
  selectedStartDate = dataStartDate;
  selectedEndDate = dataEndDate;
}

// Removed drawHandles, handleDrag*, updateHighlightRect, getXFromDate, getDateFromX

// Brush End Handler for Line Graph
function handleBrushEnd(event) {
    if (!event.selection) { // If brush is cleared
        console.log("Brush cleared.");
        // Reset selection to the full range of the current view
        const [viewStartDate, viewEndDate] = d3.extent(currentViewData, d => d.ts);
        if (viewStartDate && viewEndDate) {
            selectedStartDate = viewStartDate;
            selectedEndDate = viewEndDate;
            updateFilterInfoLabel(selectedStartDate, selectedEndDate);
            handleBrushUpdate(currentViewData); // Update dependent charts with full view data
            // Optionally remove the brush visual: d3.select(this).call(lineGraphBrush.move, null);
        } else {
            // Handle case where currentViewData is somehow empty
             selectedStartDate = null;
             selectedEndDate = null;
             updateFilterInfoLabel(null, null);
             handleBrushUpdate([]);
        }
        return;
    }

    // If a selection is made
    const [x0, x1] = event.selection;

    // Check if xScale is available
    if (!lineGraphXScale) {
        console.error("lineGraphXScale not available for brush calculation.");
        return;
    }

    // Convert pixel coordinates back to dates
    const newStartDate = d3.timeDay.floor(lineGraphXScale.invert(x0));
    const newEndDate = d3.timeDay.floor(lineGraphXScale.invert(x1));

    // Validate the new range
    if (!newStartDate || !newEndDate || isNaN(newStartDate) || isNaN(newEndDate) || newStartDate > newEndDate) {
        console.warn("Invalid date range from brush.", newStartDate, newEndDate);
         // Maybe reset brush or leave it visually? For now, do nothing to charts.
        return;
    }

    console.log(`Brush selected range: ${formatDate(newStartDate)} to ${formatDate(newEndDate)}`);

    // Update global selection state
    selectedStartDate = newStartDate;
    selectedEndDate = newEndDate;

    // Filter data for the brushed selection and update dependent plots
    filterDataAndUpdateCharts(selectedStartDate, selectedEndDate); // Call the filtering logic

     // Update date inputs (optional, provides feedback)
    if (startDateInput) startDateInput.value = formatDateForInput(selectedStartDate);
    if (endDateInput) endDateInput.value = formatDateForInput(selectedEndDate);
    if (wrappedYearSelect) wrappedYearSelect.value = ""; // Clear year select if custom range is brushed
}

// Removed Calendar Legend Function

// --- Dependent Chart Update Functions (Keep As Is or Use Text Versions) ---

// Top Artists (Text Version - Preferred)
// function updateTopArtistsAsText(data) {
//   const placeholderImg = "https://via.placeholder.com/80";
//   const targetUl = document.getElementById("top-artists-chart");
//   if (!targetUl) return;
//   targetUl.innerHTML = "";

//   if (!data || data.length === 0) {
//     targetUl.innerHTML = `<li class="empty-message">No data.</li>`;
//     return;
//   }

//   const artistData = d3
//     .rollups(
//       data.filter(
//         (d) => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0
//       ),
//       (v) => d3.sum(v, (d) => d.ms_played / 60000),
//       (d) => d.artist
//     )
//     .sort((a, b) => d3.descending(a[1], b[1]))
//     .slice(0, 5);

//   if (artistData.length === 0) {
//     targetUl.innerHTML = `<li class="empty-message">No artist data.</li>`;
//     return;
//   }

//   artistData.forEach(([artist, totalMinutes], index) => {
//     const artistTracks = data.filter(
//       (d) =>
//         d.artist &&
//         d.artist.toLowerCase() === artist.toLowerCase() &&
//         d.spotify_track_uri &&
//         d.spotify_track_uri.includes("spotify:track:")
//     );

//     // ✅ Pick ANY track with a valid Spotify URI for the artist
//     const trackWithUri = artistTracks[0];

//     const li = document.createElement("li");
//     li.style.listStyle = "none"; // No bullet/dot
//     li.style.display = "flex"; // Use flex layout
//     li.style.flexDirection = "row";
//     li.style.marginBottom = "var(--spacing)";
//     li.style.alignItems = "center";

//     const renderWithImg = (imgUrl) => {
//       li.innerHTML = `
//           <img src="${imgUrl}" alt="${artist}" class="artist-img" style="margin-right: var(--spacing);" />
//           <span class="artist-name">${index + 1}. ${artist}</span>
//           <span class="artist-time">(${formatTime(totalMinutes)})</span>
//         `;
//       targetUl.appendChild(li);
//     };

//     if (trackWithUri) {
//       const trackId = trackWithUri.spotify_track_uri.split(":")[2];
//       const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
//       fetch(oEmbedUrl)
//         .then((res) => {
//              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//              return res.json();
//         })
//         .then((embedData) =>
//           renderWithImg(embedData?.thumbnail_url || placeholderImg)
//         )
//         .catch((error) => {
//             console.warn(`oEmbed fetch failed for ${artist} (${trackId}):`, error);
//             renderWithImg(placeholderImg)
//         });
//     } else {
//       renderWithImg(placeholderImg);
//     }
//   });
// }
// Top Artists (Text Version - Preferred) - MODIFIED WITH Promise.all
async function updateTopArtistsAsText(data) { // Make the function async
  const placeholderImg = "https://via.placeholder.com/80";
  const targetUl = document.getElementById("top-artists-chart");
  if (!targetUl) return;

  // --- Clear the container immediately ---
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
    .slice(0, 5); // Still limit to 5 here

  if (artistData.length === 0) {
    targetUl.innerHTML = `<li class="empty-message">No artist data.</li>`;
    return;
  }

  // --- Create promises for fetching image URLs ---
  const imageFetchPromises = artistData.map(async ([artist, totalMinutes], index) => {
    const artistTracks = data.filter(
      (d) =>
        d.artist &&
        d.artist.toLowerCase() === artist.toLowerCase() &&
        d.spotify_track_uri &&
        d.spotify_track_uri.includes("spotify:track:")
    );
    const trackWithUri = artistTracks[0];
    let imgUrl = placeholderImg; // Default to placeholder

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
        // imgUrl remains placeholderImg
      }
    }
    // Return an object with all needed info for rendering
    return { artist, totalMinutes, index, imgUrl };
  });

  // --- Wait for all fetches to complete ---
  try {
    const results = await Promise.all(imageFetchPromises);

    // --- Now, render the list using the results ---
    // Clear again just in case of rapid calls (optional but safer)
    targetUl.innerHTML = "";
    if (results.length === 0) { // Should not happen if artistData wasn't empty, but check
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
      // Handle potential errors from Promise.all itself (though individual catches handle fetch errors)
      console.error("Error rendering top artists list:", error);
      targetUl.innerHTML = `<li class="error-message">Error loading artist images.</li>`;
  }
}

// Top Tracks (Text Version - Preferred)
// function updateTopTracksAsText(data) {
//   const targetDiv = document.getElementById("top-tracks-chart");
//   if (!targetDiv) return;
//   targetDiv.innerHTML = "";

//   if (!requiredColumns.track_name) {
//     targetDiv.innerHTML = `<p class="error-message">Track data missing.</p>`;
//     return;
//   }
//   if (!data || data.length === 0) {
//     targetDiv.innerHTML = `<p class="empty-message">No data.</p>`;
//     return;
//   }

//   const trackData = d3
//     .rollups(
//       data.filter(
//         (d) =>
//           d.track &&
//           d.track !== "Unknown Track" &&
//           d.track !== "N/A" &&
//           d.ms_played > 0
//       ),
//       (v) => d3.sum(v, (d) => d.ms_played / 60000),
//       (d) => `${d.track} • ${d.artist}` // Combine track and artist for unique key
//     )
//     .sort((a, b) => d3.descending(a[1], b[1]))
//     .slice(0, 5);

//   if (trackData.length === 0) {
//     targetDiv.innerHTML = `<p class="empty-message">No track data.</p>`;
//     return;
//   }

//   const placeholderImg = "https://via.placeholder.com/80";

//   trackData.forEach(([trackArtist, totalMinutes], index) => {
//     const parts = trackArtist.split(" • "); // Use split with space around bullet
//     const trackName = parts[0]?.trim() || "Unknown Track";
//     const artistName = parts[1]?.trim() || "Unknown Artist";

//     const li = document.createElement("li");
//     li.style.listStyle = "none"; // Just in case it's inside a <ul>
//     li.style.display = "flex";
//     li.style.flexDirection = "row";
//     li.style.alignItems = "center";
//     li.style.marginBottom = "var(--spacing)";

//     // Find *a* record matching this track/artist combo that *has* a spotify URI
//     const trackMatch = data.find(
//       (d) =>
//         d.track === trackName &&
//         d.artist === artistName &&
//         d.spotify_track_uri?.includes("spotify:track:")
//     );

//     const renderWithImg = (imgUrl) => {
//       li.innerHTML = `
//           <img src="${imgUrl}" alt="${trackName}" class="artist-img" style="margin-right: var(--spacing);" />
//           <span class="track-info" style="flex-grow: 1;"> <!-- Allow text to take space -->
//             <span class="track-name" style="display: block; font-weight: bold;">${index + 1}. ${truncateText(trackName, 25)}</span> <!-- Truncate long names -->
//             <span class="track-artist" style="display: block; font-size: 0.9em; color: #555;">${truncateText(artistName, 30)}</span>
//           </span>
//           <span class="track-time" style="margin-left: auto; padding-left: 10px; white-space: nowrap;"> (${formatTime(totalMinutes)})</span> <!-- Push time to right -->
//         `;
//         // Add tooltips for full names if truncated
//         if (trackName.length > 25) li.querySelector('.track-name').title = trackName;
//         if (artistName.length > 30) li.querySelector('.track-artist').title = artistName;
//       targetDiv.appendChild(li);
//     };

//     if (trackMatch && trackMatch.spotify_track_uri) {
//       const trackId = trackMatch.spotify_track_uri.split(":")[2];
//       const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
//       fetch(oEmbedUrl)
//         .then((res) => {
//              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
//              return res.json();
//         })
//         .then((embedData) =>
//           renderWithImg(embedData?.thumbnail_url || placeholderImg)
//         )
//         .catch((error) => {
//             console.warn(`oEmbed fetch failed for ${trackName} (${trackId}):`, error);
//             renderWithImg(placeholderImg)
//         });
//     } else {
//       renderWithImg(placeholderImg); // Render with placeholder if no match or no URI
//     }
//   });
// }
// Top Tracks (Text Version - Preferred) - MODIFIED WITH Promise.all
async function updateTopTracksAsText(data) { // Make the function async
  const targetDiv = document.getElementById("top-tracks-chart");
  if (!targetDiv) return;

  // --- Clear the container immediately ---
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
    .slice(0, 5); // Still limit to 5

  if (trackData.length === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No track data.</p>`;
    return;
  }

  const placeholderImg = "https://via.placeholder.com/80";

  // --- Create promises for fetching image URLs ---
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

    let imgUrl = placeholderImg; // Default to placeholder

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
          // imgUrl remains placeholderImg
       }
    }
     // Return an object with all needed info for rendering
    return { trackName, artistName, totalMinutes, index, imgUrl };
  });


  // --- Wait for all fetches to complete ---
  try {
    const results = await Promise.all(imageFetchPromises);

    // --- Now, render the list using the results ---
    // Clear again just in case of rapid calls (optional but safer)
    targetDiv.innerHTML = "";
     if (results.length === 0) { // Should not happen if trackData wasn't empty, but check
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
      // Add tooltips for full names if truncated
      if (result.trackName.length > 25) li.querySelector('.track-name').title = result.trackName;
      if (result.artistName.length > 30) li.querySelector('.track-artist').title = result.artistName;

      targetDiv.appendChild(li);
    });

  } catch (error) {
      // Handle potential errors from Promise.all itself
      console.error("Error rendering top tracks list:", error);
      targetDiv.innerHTML = `<p class="error-message">Error loading track images.</p>`;
  }
}


// Other Chart Functions (Time of Day, Day of Week, Streamgraph, Force Graph) - Keep As Is
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
// function updateDayOfWeekChart(data) {
//     const targetDiv = document.getElementById('day-of-week-chart'); if (!targetDiv) return; targetDiv.innerHTML = ""; if (!data || data.length === 0) { targetDiv.innerHTML = `<p class="empty-message">No data.</p>`; return; }
//     const dayData = d3.rollups(data.filter(d => d.ms_played > 0), v => d3.sum(v, d => d.ms_played / 60000), d => d.ts.getDay()); const dayMap = new Map(dayData); const completeDayData = d3.range(7).map(dayIndex => [dayIndex, dayMap.get(dayIndex) || 0]);
//     const containerWidth = targetDiv.parentElement?.clientWidth || 400; const chartWidth = containerWidth > 0 ? containerWidth : 400; const chartHeight = 250; const width = chartWidth - chartMargin.left - chartMargin.right; const height = chartHeight - chartMargin.top - chartMargin.bottom; if (width <= 0 || height <= 0) { targetDiv.innerHTML = `<p class="error-message">Container too small.</p>`; return; }
//     const svg = d3.select(targetDiv).append("svg").attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`).attr("preserveAspectRatio", "xMinYMid meet").append("g").attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);
//     const x = d3.scaleBand().range([0, width]).domain(d3.range(7)).padding(0.2); const y = d3.scaleLinear().domain([0, d3.max(completeDayData, d => d[1]) || 1]).range([height, 0]).nice();
//     svg.append("g").attr("class", "axis axis--x").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x).tickFormat(d => dayOfWeekNames[d])).append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", chartMargin.bottom - 15).attr("text-anchor", "middle").text("Day of Week");
//     svg.append("g").attr("class", "axis axis--y").call(d3.axisLeft(y).ticks(5).tickFormat(d => formatTime(d))).append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", 0 - chartMargin.left).attr("x", 0 - (height / 2)).attr("dy", "1em").attr("text-anchor", "middle").text("Total Listening Time");
//     svg.selectAll(".bar").data(completeDayData).enter().append("rect").attr("class", "bar day-of-week-bar").attr("x", d => x(d[0])).attr("width", x.bandwidth()).attr("y", height).attr("height", 0).attr("fill", "#6f42c1").on("mouseover", (event, d) => showTooltip(event, `<b>${dayOfWeekNames[d[0]]}</b><br>${formatTime(d[1])}`)).on("mousemove", moveTooltip).on("mouseout", hideTooltip).transition().duration(500).attr("y", d => y(d[1])).attr("height", d => Math.max(0, height - y(d[1])));
// }
function updateDayOfWeekChartAsText(data) {
  const targetDiv = document.getElementById("day-of-week-chart");
  if (!targetDiv) return;
  targetDiv.innerHTML = "";

  if (!data || data.length === 0) {
    targetDiv.innerHTML = `<p class="empty-message" style="color: var(--dark-green-color);">No listening data for days of the week.</p>`;
    return;
  }

  const dayData = d3.rollups(
    data.filter((d) => d.ms_played > 0),
    (v) => d3.sum(v, (d) => d.ms_played / 60000),
    (d) => d.ts.getDay()
  );

  const dayMap = new Map(dayData.sort((a, b) => d3.descending(a[1], b[1])));
  if (dayMap.size === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No activity by day recorded.</p>`;
    return;
  }

  const totalMinutes = d3.sum(dayMap.values());
  const peakDayIndex = dayMap.keys().next().value;
  const peakMinutes = dayMap.get(peakDayIndex);

  let textContent = `<h4 style="color: var(--spotify-color);">Listening by Day of Week</h4>`;
  textContent += `<p>Total: <strong>${formatTime(totalMinutes)}</strong></p>`;
  textContent += `<p>Most active: <strong style="color: var(--dark-green-color);">${
    dayOfWeekNames[peakDayIndex]
  }</strong> (${formatTime(peakMinutes)}).</p>`;
  textContent += `<ol style="padding-left: 1rem;">`;

  for (const [dayIndex, minutes] of dayMap.entries()) {
    textContent += `<li><strong>${
      dayOfWeekNames[dayIndex]
    }</strong>: ${formatTime(minutes)}</li>`;
  }

  for (let i = 0; i < 7; i++) {
    if (!dayMap.has(i)) {
      textContent += `<li><strong>${dayOfWeekNames[i]}</strong>: ${formatTime(
        0
      )}</li>`;
    }
  }

  textContent += `</ol>`;
  targetDiv.innerHTML = textContent;
}
async function drawStreamgraph(filteredData, containerId) {
    const container = document.getElementById(containerId); if (!container) return; container.innerHTML = ""; if (!filteredData || filteredData.length === 0) { container.innerHTML = '<p class="empty-message">No data.</p>'; return; }
    const streamDataProcessed = filteredData.map(d => { let contentType = 'Music'; if (d.episode_name && String(d.episode_name).trim() !== "") contentType = 'Podcast'; return { ...d, contentType: contentType }; }).filter(d => d.ms_played > 0); if (streamDataProcessed.length === 0) { container.innerHTML = '<p class="empty-message">No Music/Podcast data.</p>'; return; }
    const contentTypes = ['Music', 'Podcast']; const [minDate, maxDate] = d3.extent(streamDataProcessed, d => d.ts); const timeDiffDays = (maxDate && minDate) ? (maxDate - minDate) / (1000*60*60*24) : 0; const timeAggregator = timeDiffDays > 90 ? d3.timeWeek.floor : timeDiffDays > 7 ? d3.timeDay.floor : d3.timeHour.floor;
    const aggregatedData = Array.from( d3.group(streamDataProcessed, d => timeAggregator(d.ts)), ([timeBin, values]) => { const entry = { timeBin: new Date(timeBin) }; let totalMsPlayedInBin = 0; contentTypes.forEach(type => entry[type] = 0); values.forEach(v => { if (entry.hasOwnProperty(v.contentType)) { entry[v.contentType] += v.ms_played; totalMsPlayedInBin += v.ms_played; } }); contentTypes.forEach(type => { entry[type] = (totalMsPlayedInBin > 0) ? (entry[type] / totalMsPlayedInBin) : 0; }); return entry; }).sort((a, b) => a.timeBin - b.timeBin); if (aggregatedData.length === 0) { container.innerHTML = '<p class="empty-message">No aggregated data.</p>'; return; }
    const margin = { top: 20, right: 30, bottom: 40, left: 50 }; const containerWidth = container.clientWidth || 800; const height = 300 - margin.top - margin.bottom; const width = containerWidth - margin.left - margin.right; if (width <= 0 || height <= 0) { container.innerHTML = `<p class="error-message">Container too small.</p>`; return; }
    const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${containerWidth} ${height + margin.top + margin.bottom}`).attr("preserveAspectRatio", "xMinYMid meet").append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const xScale = d3.scaleTime().domain(d3.extent(aggregatedData, d => d.timeBin)).range([0, width]); const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]); const colorMap = { 'Music': '#1DB954', 'Podcast': '#6f42c1' }; const colorScale = d3.scaleOrdinal().domain(contentTypes).range(contentTypes.map(type => colorMap[type])); const stack = d3.stack().keys(contentTypes).offset(d3.stackOffsetExpand).order(d3.stackOrderNone); let series; try { series = stack(aggregatedData); } catch (error) { console.error("Streamgraph stacking error:", error); container.innerHTML = '<p class="error-message">Stacking error.</p>'; return; } if (series.length === 0 || !series[0] || series[0].length === 0) { container.innerHTML = '<p class="empty-message">No stack layers.</p>'; return; }
    const areaGen = d3.area().x(d => xScale(d.data.timeBin)).y0(d => yScale(d[0])).y1(d => yScale(d[1])).curve(d3.curveBasis); svg.selectAll(".stream-layer").data(series).enter().append("path").attr("class", d => `stream-layer ${String(d.key).toLowerCase()}-layer`).attr("d", areaGen).attr("fill", d => colorScale(d.key)).attr("stroke", "#fff").attr("stroke-width", 0.5).on("mouseover", (event, d_layer) => { /* ... */ }).on("mousemove", moveTooltip).on("mouseout", (event, d) => { /* ... */ });
    let xAxisTicks; if (timeDiffDays <= 1) xAxisTicks = d3.timeHour.every(3); else if (timeDiffDays <= 7) xAxisTicks = d3.timeDay.every(1); else if (timeDiffDays <= 90) xAxisTicks = d3.timeWeek.every(1); else xAxisTicks = d3.timeMonth.every(1); svg.append("g").attr("class", "axis axis--x").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(xScale).ticks(xAxisTicks).tickFormat(d3.timeFormat(timeDiffDays > 30 ? "%b %Y" : timeDiffDays > 1 ? "%a %d" : "%H:%M"))).append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", margin.bottom - 10).attr("text-anchor", "middle").text("Date / Time"); const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%")); svg.append("g").attr("class", "axis axis--y").call(yAxis).append("text").attr("class", "axis-label").attr("transform", "rotate(-90)").attr("y", 0 - margin.left).attr("x", 0 - (height / 2)).attr("dy", "1em").attr("text-anchor", "middle").text("Listening Time Rate (%)"); const legendContainer = svg.append("g").attr("class", "streamgraph-legend").attr("transform", `translate(${width - 100}, ${-10})`); const legendItems = legendContainer.selectAll(".legend-item").data(contentTypes).enter().append("g").attr("class", "legend-item").attr("transform", (d, i) => `translate(0, ${i * 15})`); legendItems.append("rect").attr("x", 0).attr("y", 0).attr("width", 10).attr("height", 10).attr("fill", d => colorScale(d)); legendItems.append("text").attr("x", 15).attr("y", 5).attr("dy", "0.35em").style("font-size", "10px").text(d => d); const descEl = container.nextElementSibling; if (descEl && descEl.classList.contains('chart-description')) descEl.innerHTML = "Proportional listening rate (%)";
}
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


// --- Main Update Trigger for Dependent Charts ---
// Called after line graph update or brush end
function handleBrushUpdate(filteredChartData) {
  const dataToUpdate = filteredChartData || [];
  // Update all dependent charts with the filtered data
  updateTopArtistsAsText(dataToUpdate); // Use text version
  updateTopTracksAsText(dataToUpdate);   // Use text version
  updateTimeOfDayChart(dataToUpdate);
  updateDayOfWeekChartAsText(dataToUpdate);
  drawStreamgraph(dataToUpdate, "streamgraph-chart");
  drawForceGraph2(dataToUpdate, "force-graph-chart", currentForceGraphTopN); // Use current slider value
}

// --- Core Visualization Update Function ---
// Called on initial load, year select change, or date range apply button
function updateVisualization(filteredData) {
  // Elements to clear before drawing new content
  const chartsToClear = [
    topArtistsContainer, topTracksContainer, timeOfDayDiv, dayOfWeekDiv,
    streamgraphContainer, forceGraphContainer
  ];
  if (mainChartDiv) mainChartDiv.innerHTML = ""; // Clear main display area (now line graph)
  // if (legendDiv) legendDiv.innerHTML = ""; // Clear legend area

  selectedStartDate = null; selectedEndDate = null; // Reset brush selection state
  currentViewData = filteredData || []; // Store the data for the current main view

  // Handle case where the filtered data for the selected period is empty
  if (!currentViewData || currentViewData.length === 0) {
    if (mainChartDiv) mainChartDiv.innerHTML = `<p class="empty-message">No data found for the selected period.</p>`;
    chartsToClear.forEach((el) => { if (el) el.innerHTML = `<p class="empty-message">No data.</p>`; });
    updateFilterInfoLabel(null, null); // Show 'No selection or data' or similar
    // No legend needed for line graph here
    return; // Stop further processing
  }

  // Determine the date range of the *currently viewed data*
  const [viewStartDate, viewEndDate] = d3.extent(currentViewData, (d) => d.ts);

  // Validate the determined range
  if (!viewStartDate || !viewEndDate || isNaN(viewStartDate) || isNaN(viewEndDate)) {
    console.error("updateVisualization: Invalid date range in data.", viewStartDate, viewEndDate);
    if (mainChartDiv) mainChartDiv.innerHTML = `<p class="error-message">Invalid date range in data.</p>`;
    chartsToClear.forEach((el) => { if (el) el.innerHTML = `<p class="empty-message">No data.</p>`; });
    updateFilterInfoLabel(null, null);
    // No legend needed
    return;
  }

  // --- Draw Line Graph and Update Dependent Charts ---
  console.log(`Rendering view for: ${formatDate(viewStartDate)} to ${formatDate(viewEndDate)}`);

  // Draw the line graph (replaces drawCalendar2)
  drawLineGraph(currentViewData, viewStartDate, viewEndDate);

  // Update all dependent charts using the full data for this view (initial state before brushing)
  handleBrushUpdate(currentViewData);

  // Update filter label (drawLineGraph also calls this, but call again for safety)
  updateFilterInfoLabel(viewStartDate, viewEndDate);
}

// --- Filter Data and Update Dependent Charts (Called by Brush End) ---
function filterDataAndUpdateCharts(startDate, endDate) {
    // This function ONLY handles updates triggered by the line graph brush end.

    const validStartDate = (startDate instanceof Date && !isNaN(startDate)) ? startDate : selectedStartDate;
    const validEndDate = (endDate instanceof Date && !isNaN(endDate)) ? endDate : selectedEndDate;

    // Check if the selection is valid and if we have data for the current view
    if (!validStartDate || !validEndDate || !currentViewData || currentViewData.length === 0 || isNaN(validStartDate) || isNaN(validEndDate) || validStartDate > validEndDate) {
        console.warn("filterDataAndUpdateCharts (Brush End): Invalid date range or no data.", { validStartDate, validEndDate });
        // Update plots with empty data if range becomes invalid during brush
        handleBrushUpdate([]);
        updateFilterInfoLabel(validStartDate, validEndDate); // Show the invalid range attempt
        return;
    }

    // Ensure we compare dates correctly (start of day to end of day)
    const filterStart = d3.timeDay.floor(validStartDate);
    const filterEnd = d3.timeDay.offset(d3.timeDay.floor(validEndDate), 1); // Exclusive end

    // Filter from the data currently loaded into the main chart view (currentViewData)
    const filtered = currentViewData.filter(d => {
        const dDate = d.ts;
        return dDate instanceof Date && !isNaN(dDate) && dDate >= filterStart && dDate < filterEnd;
    });

    console.log(`Filtered brush data from ${formatDate(validStartDate)} to ${formatDate(validEndDate)}: ${filtered.length} records.`);
    updateFilterInfoLabel(validStartDate, validEndDate); // Update label to reflect brush selection

    // Update the dependent plot components ONLY
    handleBrushUpdate(filtered);
}

// --- Event Listener Setup Function (Largely unchanged, but Year Select now triggers line graph) ---
function setupEventListeners() {
  // Year Select Dropdown
  if (wrappedYearSelect) {
    wrappedYearSelect.onchange = () => {
      const selectedValue = wrappedYearSelect.value;

      // Clear any existing brush selection when year changes
      if (svgInstance && lineGraphBrush) {
         svgInstance.select(".brush").call(lineGraphBrush.move, null);
         selectedStartDate = null; // Reset internal state too
         selectedEndDate = null;
      }


      if (selectedValue === "all") {
        // Handle "All Time" selection
        if (startDateInput && endDateInput && overallMinDate && overallMaxDate) {
          startDateInput.value = formatDateForInput(overallMinDate);
          endDateInput.value = formatDateForInput(overallMaxDate);
          console.log("Year dropdown set to 'All Time'. Updating view.");
          updateVisualization(allParsedData); // Update with full dataset
        } else {
          console.error("Cannot reset dates for 'All Time'");
          updateVisualization([]); // Show empty state
        }
      } else if (selectedValue) {
        // Handle specific year selection
        const selectedYear = +selectedValue;
        if (isNaN(selectedYear)) {
          console.warn("Invalid year selected:", selectedValue);
          updateVisualization([]);
          return;
        }

        // Define year boundaries
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31); // Inclusive end date for display/input

        // Clamp the year range to the actual data range
        const effectiveStartDate = (!overallMinDate || yearStart < overallMinDate) ? overallMinDate : yearStart;
        const effectiveEndDate = (!overallMaxDate || yearEnd > overallMaxDate) ? overallMaxDate : yearEnd;
        const effectiveEndFilter = d3.timeDay.offset(effectiveEndDate, 1); // Exclusive end for filtering

        // Filter the *entire* dataset by the selected (clamped) year
        const filteredByYear = allParsedData.filter(
          (d) => d.ts >= effectiveStartDate && d.ts < effectiveEndFilter
        );

        // Update date inputs to reflect the clamped selected year
        if (startDateInput) startDateInput.value = formatDateForInput(effectiveStartDate);
        if (endDateInput) endDateInput.value = formatDateForInput(effectiveEndDate);

        console.log(`Year dropdown set to ${selectedYear}. Updating view.`);
        updateVisualization(filteredByYear);
      } else {
        // Handle case where selection is cleared (e.g., by date range input)
        console.warn("Year selection cleared.");
        // No automatic update here, rely on Apply button or handle differently if needed
      }
    };
  } else {
    console.error("#wrappedYearSelect not found.");
  }

  // Apply Date Range Button
  if (applyRangeBtn) {
    applyRangeBtn.onclick = () => {
      const startStr = startDateInput.value;
      const endStr = endDateInput.value;

      // Basic validation
      if (!startStr || !endStr) {
          alert("Please select both a start and end date.");
          return;
      }

      // Parse dates, ensuring local time zone start of day
      let start = d3.timeDay.floor(new Date(startStr + "T00:00:00"));
      let end = d3.timeDay.floor(new Date(endStr + "T00:00:00"));

      if (isNaN(start) || isNaN(end)) {
          alert("Invalid date format. Please use YYYY-MM-DD.");
          return;
      }

      // Ensure start is before end or the same day
      if (start > end) {
        alert("Start date must be before or the same as the end date.");
        return; // Make user correct it
      }

      // Clamp selected range to overall available data range
      start = (!overallMinDate || start < overallMinDate) ? overallMinDate : start;
      end = (!overallMaxDate || end > overallMaxDate) ? overallMaxDate : end;

      // Update inputs if clamping occurred (visual feedback)
      startDateInput.value = formatDateForInput(start);
      endDateInput.value = formatDateForInput(end);

      const filterEnd = d3.timeDay.offset(end, 1); // Exclusive end date for filtering

      // Clear year selection as custom date range takes precedence
      if (wrappedYearSelect) wrappedYearSelect.value = ""; // Set to blank/default

       // Clear any existing brush selection when applying range
       if (svgInstance && lineGraphBrush) {
          svgInstance.select(".brush").call(lineGraphBrush.move, null);
          selectedStartDate = null; // Reset internal state too
          selectedEndDate = null;
       }

      // Filter the *entire* dataset by the selected (and clamped) range
      const filteredByRange = allParsedData.filter(
        (d) => d.ts >= start && d.ts < filterEnd
      );

      console.log(`Apply Range button clicked. Updating view.`);
      updateVisualization(filteredByRange); // Update the main view
    };
  } else {
    console.error("#applyRangeBtn not found.");
  }

   // Force Graph Slider Listener (Only updates Force Graph)
  if (forceGraphSlider && forceGraphSliderValueSpan) {
     // Update display on input
     forceGraphSlider.addEventListener('input', () => {
        forceGraphSliderValueSpan.textContent = forceGraphSlider.value;
     });
     // Update graph only on change (when user releases slider)
     forceGraphSlider.addEventListener('change', () => {
        currentForceGraphTopN = parseInt(forceGraphSlider.value, 10);
        forceGraphSliderValueSpan.textContent = currentForceGraphTopN; // Ensure display matches
        console.log(`Force Graph TopN changed to: ${currentForceGraphTopN}`);

        // Determine the data currently being used for dependent charts
        // If a brush selection exists, use that. Otherwise, use currentViewData.
        let dataForForceGraph = currentViewData;
        if (selectedStartDate && selectedEndDate && selectedStartDate <= selectedEndDate) {
            const filterStart = d3.timeDay.floor(selectedStartDate);
            const filterEnd = d3.timeDay.offset(d3.timeDay.floor(selectedEndDate), 1);
             dataForForceGraph = currentViewData.filter(d => {
                 const dDate = d.ts;
                 return dDate instanceof Date && !isNaN(dDate) && dDate >= filterStart && dDate < filterEnd;
             });
             console.log(`Updating Force Graph based on brush selection (${dataForForceGraph.length} records)`);
        } else {
             console.log(`Updating Force Graph based on main view data (${dataForForceGraph.length} records)`);
        }


        // Re-render only the force graph using the *appropriate* data
        if (dataForForceGraph && dataForForceGraph.length > 0) {
            drawForceGraph2(dataForForceGraph, 'force-graph-chart', currentForceGraphTopN);
        } else {
           console.log("Slider changed, but no current data to update force graph.");
           // Optionally clear force graph if no data?
           const fgContainer = document.getElementById('force-graph-chart');
           if(fgContainer) fgContainer.innerHTML = '<p class="empty-message">Select data to see transitions.</p>';
        }
     });
  } else {
      console.warn("Force graph slider elements not found.");
  }

  console.log("Event listeners attached.");
}

// ============================================== //
// === END OF spotifyDashboard_lineGraph.js ==== //
// ============================================== //