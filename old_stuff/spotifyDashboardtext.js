// // --- Configuration ---
// const USE_TEXT_MODE = true; // SET TO true FOR TEXT, false FOR PLOTS
// // --- End Configuration ---

// const cellSize = 15;
// const cellPadding = 1.5;
// const leftPadding = 40;
// const topPadding = 25;
// const noDataColor = "#ebedf0";
// const calendarColorScale = d3.scaleSequential(d3.interpolateBlues);
// const chartMargin = { top: 20, right: 20, bottom: 60, left: 70 };

// // --- Handle Configuration (Only relevant for plot mode) ---
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
// const topArtistsUl = document.getElementById("topArtists");
// const tooltipDiv = d3.select("#tooltip"); // Keep using d3.select for the tooltip div
// const topTracksDiv = document.getElementById("top-tracks-chart");
// const timeOfDayDiv = document.getElementById("time-of-day-chart");
// const dayOfWeekDiv = document.getElementById("day-of-week-chart");
// const filterInfoSpan = document.getElementById("current-filter-info");

// // --- Helper Functions ---
// const formatDay = d3.timeFormat("%Y-%m-%d");
// const formatDate = d3.timeFormat("%a, %b %d, %Y");
// const formatMonth = d3.timeFormat("%b"); // Short month name
// const formatFullMonthYear = d3.timeFormat("%B %Y"); // Full month name + year
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

// // --- Global variables ---
// let allParsedData = [];
// let requiredColumns = {
//   track_name: false,
//   platform: false,
//   skipped: false,
//   episode_name: false,
//   episode_show_name: false,
//   audiobook_title: false,
//   audiobook_chapter_title: false,
//   reason_start: false,
//   reason_end: false,
//   artist: false,
//   shuffle: false,
//   album: false,
//   conn_country: false,
// };
// let currentViewData = []; // Data currently displayed (filtered by year/range)
// let selectedStartDate = null; // Start date of the user's selection within the calendar view
// let selectedEndDate = null; // End date of the user's selection within the calendar view

// // Plot-mode specific globals
// let svgInstance = null;
// let allDaysInCalendar = [];
// let calendarStartDay = null;
// let cellWidthWithPadding = cellSize + cellPadding;
// let currentCalendarHeight = 0;

// // --- Data Processing (Runs once) ---
// (async function loadData() {
//   try {
//     const rawData = await d3.csv("data/astrid_data.csv");

//     // Detect available columns
//     const columns = new Set(rawData.columns);
//     const columnMapping = {
//       track_name: "master_metadata_track_name",
//       artist: "master_metadata_album_artist_name",
//       album: "master_metadata_album_album_name",
//       img: "spotify_track_uri",
//       platform: "platform",
//       skipped: "skipped",
//       shuffle: "shuffle",
//       episode_name: "episode_name",
//       episode_show_name: "episode_show_name",
//       audiobook_title: "audiobook_title",
//       audiobook_chapter_title: "audiobook_chapter_title",
//       reason_start: "reason_start",
//       reason_end: "reason_end",
//       conn_country: "conn_country",
//     };
//     Object.keys(columnMapping).forEach((key) => {
//       requiredColumns[key] = columns.has(columnMapping[key]);
//     });

//     allParsedData = rawData
//       .map((d) => ({
//         ts: new Date(d.ts),
//         ms_played: +d.ms_played,
//         platform: d.platform,
//         conn_country: d.conn_country,
//         artist: d.master_metadata_album_artist_name || "Unknown Artist",
//         track: requiredColumns.track_name
//           ? d.master_metadata_track_name || "Unknown Track"
//           : "N/A",
//         album: d.master_metadata_album_album_name,
//         episode_name: d.episode_name,
//         episode_show_name: d.episode_show_name,
//         audiobook_title: d.audiobook_title,
//         audiobook_chapter_title: d.audiobook_chapter_title,
//         skipped: ["true", "1", true].includes(String(d.skipped).toLowerCase()),
//         shuffle: ["true", "1", true].includes(String(d.shuffle).toLowerCase()),
//         reason_start: d.reason_start,
//         reason_end: d.reason_end,
//         spotify_track_uri: d.spotify_track_uri,
//       }))
//       .filter(
//         (d) =>
//           d.ts instanceof Date &&
//           !isNaN(d.ts) &&
//           typeof d.ms_played === "number" &&
//           !isNaN(d.ms_played) &&
//           d.ms_played >= 0
//       );

//     console.log(`Loaded and parsed ${allParsedData.length} valid records.`);

//     const years = [
//       ...new Set(allParsedData.map((d) => d.ts.getFullYear())),
//     ].sort((a, b) => a - b);
//     console.log("Available years found in data:", years);

//     // Handle no valid data found
//     if (allParsedData.length === 0) {
//       if (calendarDiv)
//         calendarDiv.innerHTML = `<p class="error-message">No valid data found after processing the CSV.</p>`;
//       if (filterInfoSpan) filterInfoSpan.textContent = "No data loaded";
//       const streamgraphChart = document.getElementById("streamgraph-chart");
//       if (streamgraphChart)
//         streamgraphChart.innerHTML = `<p class="empty-message">No data.</p>`;
//       const forceGraphChart = document.getElementById("force-graph-chart");
//       if (forceGraphChart)
//         forceGraphChart.innerHTML = `<p class="empty-message">No data.</p>`;
//       [topArtistsUl, topTracksDiv, timeOfDayDiv, dayOfWeekDiv].forEach((el) => {
//         if (el) el.innerHTML = `<p class="empty-message">No data.</p>`;
//       });
//       return; // Stop execution
//     }

//     // Populate Year Select dropdown
//     if (wrappedYearSelect) {
//       years.forEach((y) => {
//         const opt = document.createElement("option");
//         opt.value = y;
//         opt.textContent = y;
//         wrappedYearSelect.appendChild(opt);
//       });
//     } else {
//       console.error(
//         "Cannot append year options: #wrappedYearSelect not found."
//       );
//     }

//     // --- Initial Load ---
//     const defaultYear =
//       years.length > 0 ? Math.max(...years) : new Date().getFullYear();
//     if (wrappedYearSelect) {
//       wrappedYearSelect.value = defaultYear;
//       // Triggering change will call updateVisualization, which respects USE_TEXT_MODE
//       wrappedYearSelect.dispatchEvent(new Event("change"));
//     }

//     // --- Decide about Timeline ---
//     // Currently, Timeline only has a visual version. It will draw if plot mode is active.
//     // If you want a text summary for the timeline, create drawTimelineAsText and call it here
//     // conditionally based on USE_TEXT_MODE.
//     // if (!USE_TEXT_MODE) {
//     //     console.log("Drawing initial Timeline plot...");
//     //     drawTimeline(allParsedData, 'timeline-chart'); // Example: Assuming a timeline container exists
//     // } else {
//     //     console.log("Drawing initial Timeline text...");
//     //     // drawTimelineAsText(allParsedData, 'timeline-chart'); // Create and call this if needed
//     // }

//     // Initially clear containers that depend on selection (good for both modes)
//     //  const streamgraphContainer = document.getElementById('streamgraph-chart');
//     //  if (streamgraphContainer) {
//     //      streamgraphContainer.innerHTML = '<p class="empty-message">Select a period using the controls above.</p>';
//     //      const descEl = streamgraphContainer.nextElementSibling;
//     //      if (descEl && descEl.classList.contains('chart-description')) {
//     //          descEl.innerHTML = 'Shows Music vs Podcast rate or summary for the selected period.';
//     //      }
//     //  }
//     //  const forceGraphContainer = document.getElementById('force-graph-chart');
//     //  if (forceGraphContainer) {
//     //     forceGraphContainer.innerHTML = '<p class="empty-message">Select a period using the controls above.</p>';
//     //     const descEl = forceGraphContainer.nextElementSibling;
//     //     if (descEl && descEl.classList.contains('chart-description')) {
//     //         descEl.innerHTML = 'Shows artist transitions or summary for the selected period.';
//     //     }
//     //  }
//   } catch (error) {
//     console.error("Error loading or processing data:", error);
//     // Display error messages in relevant containers
//     if (calendarDiv)
//       calendarDiv.innerHTML = `<p class="error-message">Error loading data. Check console.</p>`;
//     if (filterInfoSpan) filterInfoSpan.textContent = "Error loading data";
//     const streamgraphChart = document.getElementById("streamgraph-chart");
//     if (streamgraphChart)
//       streamgraphChart.innerHTML = `<p class="error-message">Error loading data.</p>`;
//     const forceGraphChart = document.getElementById("force-graph-chart");
//     if (forceGraphChart)
//       forceGraphChart.innerHTML = `<p class="error-message">Error loading data.</p>`;
//     [topArtistsUl, topTracksDiv, timeOfDayDiv, dayOfWeekDiv].forEach((el) => {
//       if (el) el.innerHTML = `<p class="error-message">Error loading data.</p>`;
//     });
//   }
// })(); // Immediately invoke the async function

// // --- Tooltip Logic (Only used in plot mode) ---
// const showTooltip = (event, content) => {
//   if (USE_TEXT_MODE) return; // Don't show tooltips in text mode
//   tooltipDiv
//     .style("opacity", 1)
//     .html(content)
//     .style("left", event.pageX + 10 + "px")
//     .style("top", event.pageY - 20 + "px");
// };
// const moveTooltip = (event) => {
//   if (USE_TEXT_MODE) return;
//   tooltipDiv
//     .style("left", event.pageX + 10 + "px")
//     .style("top", event.pageY - 20 + "px");
// };
// const hideTooltip = () => {
//   if (USE_TEXT_MODE) return;
//   tooltipDiv.style("opacity", 0);
// };

// // --- Calendar Dragging Helper Functions (Only used in plot mode) ---
// function getXFromDate(date, firstDayOfGrid, columnWidth) {
//   // ... (implementation remains the same)
//   if (
//     !date ||
//     !firstDayOfGrid ||
//     isNaN(date) ||
//     isNaN(firstDayOfGrid) ||
//     !columnWidth ||
//     columnWidth <= 0
//   )
//     return NaN;
//   const startOfWeekGrid = d3.timeWeek.floor(firstDayOfGrid);
//   const startOfWeekDate = d3.timeWeek.floor(date);
//   if (startOfWeekDate < startOfWeekGrid) return 0;
//   const weekIndex = d3.timeWeek.count(startOfWeekGrid, startOfWeekDate);
//   return weekIndex * columnWidth;
// }

// function getDateFromX(xPos, daysArray, firstDayOfGrid, columnWidth) {
//   // ... (implementation remains the same)
//   if (
//     !daysArray ||
//     daysArray.length === 0 ||
//     !firstDayOfGrid ||
//     !columnWidth ||
//     columnWidth <= 0 ||
//     xPos < -columnWidth / 2
//   )
//     return null;
//   const maxWeekIndex = d3.timeWeek.count(
//     d3.timeWeek.floor(firstDayOfGrid),
//     d3.timeWeek.floor(daysArray[daysArray.length - 1])
//   );
//   const calculatedIndex = Math.floor((xPos + columnWidth / 2) / columnWidth);
//   const weekIndex = Math.max(0, Math.min(calculatedIndex, maxWeekIndex));
//   const startOfWeekGrid = d3.timeWeek.floor(firstDayOfGrid);
//   const targetWeekStartDate = d3.timeWeek.offset(startOfWeekGrid, weekIndex);
//   let foundDate = null;
//   const firstDayInArray = daysArray[0];
//   const lastDayInArray = daysArray[daysArray.length - 1];
//   for (const day of daysArray) {
//     if (d3.timeWeek.floor(day).getTime() === targetWeekStartDate.getTime()) {
//       foundDate = day;
//       break;
//     }
//   }
//   if (!foundDate) {
//     if (targetWeekStartDate <= firstDayInArray) return firstDayInArray;
//     else if (targetWeekStartDate >= d3.timeWeek.floor(lastDayInArray))
//       return lastDayInArray;
//     else {
//       foundDate = daysArray
//         .slice()
//         .reverse()
//         .find((d) => d < targetWeekStartDate);
//       return foundDate || lastDayInArray;
//     }
//   }
//   return foundDate;
// }

// // --- Filter Info Label Update (Used in both modes) ---
// function updateFilterInfoLabel(startDate, endDate) {
//   if (!filterInfoSpan) return;
//   if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
//     filterInfoSpan.textContent = `${formatDate(startDate)} → ${formatDate(
//       endDate
//     )}`;
//   } else if (currentViewData && currentViewData.length > 0) {
//     // If no specific selection, show the full range of the current view
//     const [minD, maxD] = d3.extent(currentViewData, (d) => d.ts);
//     if (minD && maxD) {
//       filterInfoSpan.textContent = `${formatDate(minD)} → ${formatDate(
//         maxD
//       )} (Full View)`;
//     } else {
//       filterInfoSpan.textContent = "Full selected range";
//     }
//   } else {
//     filterInfoSpan.textContent = "No selection or data";
//   }
// }

// // --- Plotting Functions (Only called if USE_TEXT_MODE is false) ---

// function drawCalendar(data, initialStartDate, initialEndDate) {
//   calendarDiv.innerHTML = "";
//   legendDiv.innerHTML = "";
//   svgInstance = null;
//   allDaysInCalendar = [];
//   calendarStartDay = null;
//   currentCalendarHeight = 0; // Reset plot-specific globals

//   const listeningData = data.filter((d) => d.ms_played > 0);
//   if (listeningData.length === 0) {
//     if (calendarDiv)
//       calendarDiv.innerHTML = `<p class="empty-message">No listening data for this period.</p>`;
//     // No need to call handleBrushUpdate here, updateVisualization handles clearing
//     updateFilterInfoLabel(initialStartDate, initialEndDate);
//     return;
//   }
//   const dailyData = d3.rollups(
//     listeningData,
//     (v) => d3.sum(v, (d) => d.ms_played / 60000),
//     (d) => formatDay(d.ts)
//   );
//   const valueMap = new Map(dailyData);
//   const dataStartDate = new Date(initialStartDate);
//   const dataEndDate = new Date(initialEndDate);

//   if (
//     !dataStartDate ||
//     !dataEndDate ||
//     isNaN(dataStartDate) ||
//     isNaN(dataEndDate) ||
//     dataStartDate > dataEndDate
//   ) {
//     console.error(
//       "drawCalendar: Invalid date range received.",
//       dataStartDate,
//       dataEndDate
//     );
//     if (calendarDiv)
//       calendarDiv.innerHTML = `<p class="error-message">Invalid date range.</p>`;
//     return;
//   }
//   const firstDayOfMonthStart = d3.timeMonth.floor(dataStartDate);
//   const lastDayOfMonthEnd = d3.timeMonth.offset(
//     d3.timeMonth.floor(dataEndDate),
//     1
//   );
//   allDaysInCalendar = d3.timeDays(firstDayOfMonthStart, lastDayOfMonthEnd);
//   if (allDaysInCalendar.length === 0) {
//     console.error("drawCalendar: No days generated for grid.");
//     if (calendarDiv)
//       calendarDiv.innerHTML = `<p class="error-message">Could not generate grid days.</p>`;
//     return;
//   }
//   calendarStartDay = allDaysInCalendar[0]; // Set plot-specific global
//   const endDay = allDaysInCalendar[allDaysInCalendar.length - 1];
//   const months = d3.timeMonths(calendarStartDay, endDay);
//   const weekCount = d3.timeWeek.count(calendarStartDay, endDay) + 1;
//   cellWidthWithPadding = cellSize + cellPadding; // Ensure calculated
//   const width = weekCount * cellWidthWithPadding + leftPadding + 20;
//   currentCalendarHeight = 7 * cellWidthWithPadding; // Set plot-specific global
//   const height = currentCalendarHeight + topPadding + 30;
//   const maxMinutes = d3.max(valueMap.values());
//   calendarColorScale.domain([0, maxMinutes || 1]);

//   const svg = d3
//     .select("#calendar")
//     .append("svg")
//     .attr("width", width)
//     .attr("height", height)
//     .append("g")
//     .attr("transform", `translate(${leftPadding}, ${topPadding})`);
//   svgInstance = svg; // Set plot-specific global

//   const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
//   svg
//     .selectAll(".day-label")
//     .data(d3.range(7))
//     .enter()
//     .append("text")
//     .attr("class", "day-label")
//     .attr("x", -15)
//     .attr(
//       "y",
//       (d) => d * cellWidthWithPadding + cellWidthWithPadding / 2 - cellSize / 2
//     )
//     .attr("dy", "0.35em")
//     .text((d) => dayLabels[d]);

//   svg
//     .selectAll(".month-label")
//     .data(months)
//     .enter()
//     .append("text")
//     .attr("class", "month-label")
//     .attr("x", (d) =>
//       getXFromDate(
//         d3.max([calendarStartDay, d3.timeWeek.floor(d)]),
//         calendarStartDay,
//         cellWidthWithPadding
//       )
//     )
//     .attr("y", -10)
//     .text(formatMonth);

//   const cells = svg
//     .selectAll(".day-cell")
//     .data(allDaysInCalendar)
//     .enter()
//     .append("rect")
//     .attr("class", "day-cell")
//     .attr("width", cellSize)
//     .attr("height", cellSize)
//     .attr("rx", 2)
//     .attr("ry", 2)
//     .attr("x", (d) => getXFromDate(d, calendarStartDay, cellWidthWithPadding))
//     .attr("y", (d) => d.getDay() * cellWidthWithPadding)
//     .attr("fill", noDataColor)
//     .attr("stroke", "#fff")
//     .attr("stroke-width", 0.5)
//     .on("mouseover", (event, d) => {
//       const key = formatDay(d);
//       const valueMins = valueMap.get(key) || 0;
//       showTooltip(
//         event,
//         `${formatDate(d)}<br><b>Listened: ${formatTime(valueMins)}</b>`
//       );
//       d3.select(event.currentTarget)
//         .attr("stroke", "#333")
//         .attr("stroke-width", 1.5);
//     })
//     .on("mousemove", moveTooltip)
//     .on("mouseout", (event) => {
//       hideTooltip();
//       d3.select(event.currentTarget)
//         .attr("stroke", "#fff")
//         .attr("stroke-width", 0.5);
//     });

//   cells
//     .transition()
//     .duration(500)
//     .attr("fill", (d) => {
//       const key = formatDay(d);
//       const value = valueMap.get(key);
//       return value === undefined || value <= 0
//         ? noDataColor
//         : calendarColorScale(value);
//     });

//   drawLegend(legendDiv, calendarColorScale, maxMinutes);

//   // Set selected dates (used by handles and filter function)
//   selectedStartDate = dataStartDate;
//   selectedEndDate = dataEndDate;

//   drawHandles(selectedStartDate, selectedEndDate); // Draw handles for interaction
//   updateFilterInfoLabel(selectedStartDate, selectedEndDate); // Update label
// }

// function drawHandles(startDate, endDate) {
//   // This function is only relevant in plot mode
//   if (
//     !svgInstance ||
//     !calendarStartDay ||
//     !startDate ||
//     !endDate ||
//     isNaN(startDate) ||
//     isNaN(endDate) ||
//     currentCalendarHeight <= 0
//   )
//     return;
//   // ... (rest of handle drawing logic) ...
//   const startX = getXFromDate(
//     startDate,
//     calendarStartDay,
//     cellWidthWithPadding
//   );
//   const endHandleDateForPositioning = d3.timeDay.offset(endDate, 1);
//   const safeEndPosDate =
//     endHandleDateForPositioning <= startDate
//       ? d3.timeDay.offset(startDate, 1)
//       : endHandleDateForPositioning;
//   let endX = getXFromDate(
//     safeEndPosDate,
//     calendarStartDay,
//     cellWidthWithPadding
//   );
//   if (isNaN(endX))
//     endX =
//       getXFromDate(endDate, calendarStartDay, cellWidthWithPadding) +
//       cellWidthWithPadding;
//   endX = Math.max(endX, startX + handleWidth);
//   if (isNaN(startX) || isNaN(endX)) {
//     console.error("drawHandles: NaN X position!", { startX, endX });
//     return;
//   }
//   let startHandleGroup = svgInstance.select(".start-handle-group");
//   if (startHandleGroup.empty()) {
//     startHandleGroup = svgInstance
//       .append("g")
//       .attr("class", "start-handle-group");
//     startHandleGroup
//       .append("line")
//       .attr("class", "drag-handle start-handle")
//       .attr("y1", -cellPadding)
//       .attr("stroke", handleColor)
//       .attr("stroke-width", handleWidth)
//       .attr("stroke-linecap", "round");
//     startHandleGroup
//       .append("line")
//       .attr("class", "drag-grab-area")
//       .attr("y1", -cellPadding)
//       .attr("stroke", "transparent")
//       .attr("stroke-width", handleGrabAreaWidth)
//       .style("cursor", "ew-resize");
//   }
//   startHandleGroup
//     .attr("transform", `translate(${startX}, 0)`)
//     .selectAll("line")
//     .attr("y2", currentCalendarHeight + cellPadding);
//   startHandleGroup
//     .raise()
//     .on(".drag", null)
//     .call(
//       d3
//         .drag()
//         .on("start", handleDragStart)
//         .on("drag", (event) => handleDrag(event, "start"))
//         .on("end", handleDragEnd)
//     ); // Use correct drag end handler
//   let endHandleGroup = svgInstance.select(".end-handle-group");
//   if (endHandleGroup.empty()) {
//     endHandleGroup = svgInstance.append("g").attr("class", "end-handle-group");
//     endHandleGroup
//       .append("line")
//       .attr("class", "drag-handle end-handle")
//       .attr("y1", -cellPadding)
//       .attr("stroke", handleColor)
//       .attr("stroke-width", handleWidth)
//       .attr("stroke-linecap", "round");
//     endHandleGroup
//       .append("line")
//       .attr("class", "drag-grab-area")
//       .attr("y1", -cellPadding)
//       .attr("stroke", "transparent")
//       .attr("stroke-width", handleGrabAreaWidth)
//       .style("cursor", "ew-resize");
//   }
//   endHandleGroup
//     .attr("transform", `translate(${endX}, 0)`)
//     .selectAll("line")
//     .attr("y2", currentCalendarHeight + cellPadding);
//   endHandleGroup
//     .raise()
//     .on(".drag", null)
//     .call(
//       d3
//         .drag()
//         .on("start", handleDragStart)
//         .on("drag", (event) => handleDrag(event, "end"))
//         .on("end", handleDragEnd)
//     ); // Use correct drag end handler
//   updateHighlightRect();
// }

// function handleDragStart(event) {
//   // Only relevant in plot mode
//   if (!svgInstance) return;
//   d3.select(this)
//     .raise()
//     .select(".drag-handle")
//     .attr("stroke", "black")
//     .attr("stroke-opacity", 0.7);
//   svgInstance.select(".highlight-rect")?.raise();
//   svgInstance.selectAll(".start-handle-group, .end-handle-group").raise();
// }

// function handleDrag(event, handleType) {
//   // Only relevant in plot mode
//   if (
//     !svgInstance ||
//     !calendarStartDay ||
//     allDaysInCalendar.length === 0 ||
//     !selectedStartDate ||
//     !selectedEndDate ||
//     currentCalendarHeight <= 0
//   )
//     return;
//   // ... (rest of handle drag logic) ...
//   const currentX = event.x;
//   let targetDate = getDateFromX(
//     currentX,
//     allDaysInCalendar,
//     calendarStartDay,
//     cellWidthWithPadding
//   );
//   if (!targetDate || isNaN(targetDate)) return;
//   const minDate = allDaysInCalendar[0];
//   const maxDate = allDaysInCalendar[allDaysInCalendar.length - 1];
//   if (targetDate < minDate) targetDate = minDate;
//   if (targetDate > maxDate) targetDate = maxDate;
//   let snappedX;
//   let newStartDate = selectedStartDate;
//   let newEndDate = selectedEndDate;
//   let groupToMove;
//   if (handleType === "start") {
//     targetDate = d3.min([targetDate, selectedEndDate]);
//     newStartDate = targetDate;
//     snappedX = getXFromDate(
//       newStartDate,
//       calendarStartDay,
//       cellWidthWithPadding
//     );
//     groupToMove = svgInstance.select(".start-handle-group");
//     if (!isNaN(snappedX))
//       groupToMove.attr("transform", `translate(${snappedX}, 0)`);
//     else console.error("handleDrag (Start): Invalid snappedX.");
//   } else {
//     targetDate = d3.max([targetDate, selectedStartDate]);
//     newEndDate = targetDate;
//     const endHandleDateForPositioning = d3.timeDay.offset(newEndDate, 1);
//     const safeEndPosDate =
//       endHandleDateForPositioning <= newStartDate
//         ? d3.timeDay.offset(newStartDate, 1)
//         : endHandleDateForPositioning;
//     snappedX = getXFromDate(
//       safeEndPosDate,
//       calendarStartDay,
//       cellWidthWithPadding
//     );
//     if (isNaN(snappedX))
//       snappedX =
//         getXFromDate(newEndDate, calendarStartDay, cellWidthWithPadding) +
//         cellWidthWithPadding;
//     const startXForCompare = getXFromDate(
//       newStartDate,
//       calendarStartDay,
//       cellWidthWithPadding
//     );
//     if (!isNaN(startXForCompare) && !isNaN(snappedX))
//       snappedX = Math.max(snappedX, startXForCompare + handleWidth);
//     else {
//       if (isNaN(snappedX)) return;
//     }
//     groupToMove = svgInstance.select(".end-handle-group");
//     if (!isNaN(snappedX))
//       groupToMove.attr("transform", `translate(${snappedX}, 0)`);
//     else console.error("handleDrag (End): Invalid snappedX.");
//   }
//   // Update global selection state
//   selectedStartDate = newStartDate;
//   selectedEndDate = newEndDate;
//   updateHighlightRect(); // Update visual highlight
//   updateFilterInfoLabel(selectedStartDate, selectedEndDate); // Update text label
// }

// function handleDragEnd(event) {
//   // Renamed back from handleDragEndText
//   // Style handle back (only if in plot mode)
//   if (!USE_TEXT_MODE && svgInstance) {
//     d3.select(this)
//       .select(".drag-handle")
//       .attr("stroke", handleColor)
//       .attr("stroke-opacity", 1.0);
//   }
//   // Update date inputs (useful for both modes)
//   if (startDateInput && selectedStartDate)
//     startDateInput.value = formatDateForInput(selectedStartDate);
//   if (endDateInput && selectedEndDate)
//     endDateInput.value = formatDateForInput(selectedEndDate);

//   // Filter data and update components (respects USE_TEXT_MODE internally)
//   filterDataAndUpdateCharts(selectedStartDate, selectedEndDate);
// }

// function updateHighlightRect() {
//   // Only relevant in plot mode
//   if (
//     USE_TEXT_MODE ||
//     !svgInstance ||
//     !selectedStartDate ||
//     !selectedEndDate ||
//     !calendarStartDay ||
//     isNaN(selectedStartDate) ||
//     isNaN(selectedEndDate) ||
//     currentCalendarHeight <= 0
//   ) {
//     svgInstance?.select(".highlight-rect").remove(); // Remove if it exists but shouldn't
//     return;
//   }
//   // ... (rest of highlight rect logic) ...
//   let highlightRect = svgInstance.select(".highlight-rect");
//   if (highlightRect.empty()) {
//     highlightRect = svgInstance
//       .insert("rect", ":first-child")
//       .attr("class", "highlight-rect")
//       .attr("fill", highlightColor)
//       .attr("pointer-events", "none");
//   }
//   const startX = getXFromDate(
//     selectedStartDate,
//     calendarStartDay,
//     cellWidthWithPadding
//   );
//   const endHandleDateForPositioning = d3.timeDay.offset(selectedEndDate, 1);
//   const safeEndPosDate =
//     endHandleDateForPositioning <= selectedStartDate
//       ? d3.timeDay.offset(selectedStartDate, 1)
//       : endHandleDateForPositioning;
//   let endX = getXFromDate(
//     safeEndPosDate,
//     calendarStartDay,
//     cellWidthWithPadding
//   );
//   if (isNaN(endX))
//     endX =
//       getXFromDate(selectedEndDate, calendarStartDay, cellWidthWithPadding) +
//       cellWidthWithPadding;
//   endX = Math.max(endX, startX);
//   if (isNaN(startX) || isNaN(endX) || isNaN(currentCalendarHeight)) {
//     highlightRect.remove();
//     return;
//   }
//   highlightRect
//     .attr("x", startX)
//     .attr("y", 0)
//     .attr("width", Math.max(0, endX - startX))
//     .attr("height", currentCalendarHeight);
// }

// function drawLegend(container, scale, maxValue) {
//   // Only relevant in plot mode
//   container.innerHTML = "";
//   if (USE_TEXT_MODE || maxValue === undefined || maxValue <= 0) return;
//   // ... (rest of legend drawing logic) ...
//   const legendWidth = 200,
//     legendHeight = 20,
//     legendMargin = { top: 0, right: 10, bottom: 15, left: 10 },
//     barHeight = 8;
//   const legendSvg = d3
//     .select(container)
//     .append("svg")
//     .attr("width", legendWidth)
//     .attr("height", legendHeight + legendMargin.top + legendMargin.bottom);
//   const legendDefs = legendSvg.append("defs");
//   const linearGradient = legendDefs
//     .append("linearGradient")
//     .attr("id", "calendar-gradient");
//   const numStops = 10;
//   const interpolator =
//     typeof scale.interpolator === "function"
//       ? scale.interpolator()
//       : (t) => scale(maxValue * t);
//   linearGradient
//     .selectAll("stop")
//     .data(d3.range(numStops + 1))
//     .enter()
//     .append("stop")
//     .attr("offset", (d) => `${(d / numStops) * 100}%`)
//     .attr("stop-color", (d) => interpolator(d / numStops));
//   legendSvg
//     .append("rect")
//     .attr("x", legendMargin.left)
//     .attr("y", legendMargin.top)
//     .attr("width", legendWidth - legendMargin.left - legendMargin.right)
//     .attr("height", barHeight)
//     .style("fill", "url(#calendar-gradient)")
//     .attr("rx", 2)
//     .attr("ry", 2);
//   legendSvg
//     .append("text")
//     .attr("class", "legend-label")
//     .attr("x", legendMargin.left)
//     .attr("y", legendMargin.top + barHeight + 10)
//     .attr("text-anchor", "start")
//     .text("Less");
//   legendSvg
//     .append("text")
//     .attr("class", "legend-label")
//     .attr("x", legendWidth - legendMargin.right)
//     .attr("y", legendMargin.top + barHeight + 10)
//     .attr("text-anchor", "end")
//     .text("More");
// }

// // Plotting functions for other charts
// function updateTopArtists(data) {
//   const placeholderImg = "https://via.placeholder.com/100";
//   const targetUl = document.getElementById("topArtists");
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
//     targetUl.innerHTML = `<li class="empty-message">No artist data in this period.</li>`;
//     return;
//   }

//   artistData.forEach(([artist, totalMinutes], index) => {
//     const artistTracks = data.filter(
//       (d) =>
//         d.artist &&
//         d.artist.toLowerCase() === artist.toLowerCase() &&
//         d.spotify_track_uri
//     );

//     const topTrack = d3
//       .rollups(
//         artistTracks,
//         (v) => d3.sum(v, (d) => +d.ms_played),
//         (d) => d.master_metadata_track_name
//       )
//       .sort((a, b) => b[1] - a[1])[0];

//     const trackUri = artistTracks.find(
//       (d) => d.master_metadata_track_name === topTrack?.[0]
//     )?.spotify_track_uri;

//     const li = document.createElement("li");

//     if (trackUri && trackUri.includes("spotify:track:")) {
//       const trackId = trackUri.split(":")[2];
//       const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;

//       fetch(oEmbedUrl)
//         .then((res) => res.json())
//         .then((embedData) => {
//           const imgUrl = embedData.thumbnail_url || placeholderImg;
//           li.innerHTML = `
//               <img src="${imgUrl}" alt="${artist}" class="top-artist-img" />
//               <span class="artist-name">${index + 1}. ${artist}</span>
//               <span class="artist-time">(${formatTime(totalMinutes)})</span>
//             `;
//           targetUl.appendChild(li);
//         })
//         .catch(() => {
//           li.innerHTML = `
//               <img src="${placeholderImg}" alt="${artist}" class="top-artist-img" />
//               <span class="artist-name">${index + 1}. ${artist}</span>
//               <span class="artist-time">(${formatTime(totalMinutes)})</span>
//             `;
//           targetUl.appendChild(li);
//         });
//     } else {
//       li.innerHTML = `
//           <img src="${placeholderImg}" alt="${artist}" class="top-artist-img" />
//           <span class="artist-name">${index + 1}. ${artist}</span>
//           <span class="artist-time">(${formatTime(totalMinutes)})</span>
//         `;
//       targetUl.appendChild(li);
//     }
//   });
// }

// // function updateTopTracksChart(data) { /* ... simple list plot version ... */ }
// function updateTopTracksChart2(data) {
//   /* ... sparkline list plot version ... */
//   const targetDiv = document.getElementById("top-tracks-chart");
//   if (!targetDiv) return;
//   targetDiv.innerHTML = ""; // Clear previous content
//   if (!requiredColumns.track_name) {
//     targetDiv.innerHTML = `<p class="error-message">Track name data missing.</p>`;
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
//     targetDiv.innerHTML = `<p class="empty-message">No track data in period.</p>`;
//     return;
//   }

//   const list = d3
//     .select(targetDiv)
//     .append("ol")
//     .attr("class", "top-tracks-sparkline-list");
//   const maxMinutes = trackData[0][1];
//   const sparklineWidth = 80;
//   const sparklineHeight = 12;
//   const sparklineScale = d3
//     .scaleLinear()
//     .domain([0, maxMinutes || 1])
//     .range([0, sparklineWidth]);

//   const items = list.selectAll("li").data(trackData).join("li");
//   items
//     .append("span")
//     .attr("class", "track-info")
//     .html((d) => {
//       const parts = d[0].split("•");
//       const trackName = parts[0] ? parts[0].trim() : "Unknown Track";
//       const artistName = parts[1] ? parts[1].trim() : "Unknown Artist";
//       return `<span class="track-name">${trackName}</span><br><span class="track-artist">${artistName}</span>`;
//     });
//   items
//     .append("span")
//     .attr("class", "track-time")
//     .text((d) => `(${formatTime(d[1])})`);

//   const sparklineSvg = items
//     .append("svg")
//     .attr("class", "sparkline")
//     .attr("width", sparklineWidth)
//     .attr("height", sparklineHeight)
//     .style("vertical-align", "middle")
//     .style("margin-left", "8px");
//   sparklineSvg
//     .append("rect")
//     .attr("x", 0)
//     .attr("y", 0)
//     .attr("width", 0)
//     .attr("height", sparklineHeight)
//     .attr("fill", "#1DB954")
//     .attr("rx", 1)
//     .attr("ry", 1)
//     .on("mouseover", (event, d) =>
//       showTooltip(event, `<b>${d[0]}</b><br>${formatTime(d[1])}`)
//     )
//     .on("mousemove", moveTooltip)
//     .on("mouseout", hideTooltip)
//     .transition()
//     .duration(500)
//     .attr("width", (d) => sparklineScale(d[1]));
// }
// function updateTimeOfDayChart(data) {
//   /* ... plot version ... */
//   const targetDiv = document.getElementById("time-of-day-chart");
//   if (!targetDiv) return;
//   targetDiv.innerHTML = "";
//   if (!data || data.length === 0) {
//     targetDiv.innerHTML = `<p class="empty-message">No data.</p>`;
//     return;
//   }
//   const hourData = d3.rollups(
//     data.filter((d) => d.ms_played > 0),
//     (v) => d3.sum(v, (d) => d.ms_played / 60000),
//     (d) => d.ts.getHours()
//   );
//   const hourMap = new Map(hourData);
//   const completeHourData = d3.range(24).map((h) => [h, hourMap.get(h) || 0]);
//   const containerWidth = targetDiv.parentElement?.clientWidth || 400;
//   const chartWidth = containerWidth > 0 ? containerWidth : 400;
//   const chartHeight = 250;
//   const width = chartWidth - chartMargin.left - chartMargin.right;
//   const height = chartHeight - chartMargin.top - chartMargin.bottom;
//   if (width <= 0 || height <= 0) {
//     targetDiv.innerHTML = `<p class="error-message">Container too small.</p>`;
//     return;
//   }
//   const svg = d3
//     .select(targetDiv)
//     .append("svg")
//     .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
//     .attr("preserveAspectRatio", "xMinYMid meet")
//     .append("g")
//     .attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);
//   const x = d3.scaleBand().range([0, width]).domain(d3.range(24)).padding(0.2);
//   const y = d3
//     .scaleLinear()
//     .domain([0, d3.max(completeHourData, (d) => d[1]) || 1])
//     .range([height, 0])
//     .nice();
//   svg
//     .append("g")
//     .attr("class", "axis axis--x")
//     .attr("transform", `translate(0, ${height})`)
//     .call(d3.axisBottom(x).tickValues(d3.range(0, 24, 3)))
//     .append("text")
//     .attr("class", "axis-label")
//     .attr("x", width / 2)
//     .attr("y", chartMargin.bottom - 15)
//     .attr("text-anchor", "middle")
//     .text("Hour of Day");
//   svg
//     .append("g")
//     .attr("class", "axis axis--y")
//     .call(
//       d3
//         .axisLeft(y)
//         .ticks(5)
//         .tickFormat((d) => formatTime(d))
//     )
//     .append("text")
//     .attr("class", "axis-label")
//     .attr("transform", "rotate(-90)")
//     .attr("y", 0 - chartMargin.left)
//     .attr("x", 0 - height / 2)
//     .attr("dy", "1em")
//     .attr("text-anchor", "middle")
//     .text("Total Listening Time");
//   svg
//     .selectAll(".bar")
//     .data(completeHourData)
//     .enter()
//     .append("rect")
//     .attr("class", "bar")
//     .attr("x", (d) => x(d[0]))
//     .attr("width", x.bandwidth())
//     .attr("y", height)
//     .attr("height", 0)
//     .attr("fill", "#fd7e14")
//     .on("mouseover", (event, d) =>
//       showTooltip(event, `<b>Hour ${d[0]}</b><br>${formatTime(d[1])}`)
//     )
//     .on("mousemove", moveTooltip)
//     .on("mouseout", hideTooltip)
//     .transition()
//     .duration(500)
//     .attr("y", (d) => y(d[1]))
//     .attr("height", (d) => Math.max(0, height - y(d[1])));
// }
// function updateDayOfWeekChart(data) {
//   /* ... plot version ... */
//   const targetDiv = document.getElementById("day-of-week-chart");
//   if (!targetDiv) return;
//   targetDiv.innerHTML = "";
//   if (!data || data.length === 0) {
//     targetDiv.innerHTML = `<p class="empty-message">No data.</p>`;
//     return;
//   }
//   const dayData = d3.rollups(
//     data.filter((d) => d.ms_played > 0),
//     (v) => d3.sum(v, (d) => d.ms_played / 60000),
//     (d) => d.ts.getDay()
//   );
//   const dayMap = new Map(dayData);
//   const completeDayData = d3
//     .range(7)
//     .map((dayIndex) => [dayIndex, dayMap.get(dayIndex) || 0]);
//   const containerWidth = targetDiv.parentElement?.clientWidth || 400;
//   const chartWidth = containerWidth > 0 ? containerWidth : 400;
//   const chartHeight = 250;
//   const width = chartWidth - chartMargin.left - chartMargin.right;
//   const height = chartHeight - chartMargin.top - chartMargin.bottom;
//   if (width <= 0 || height <= 0) {
//     targetDiv.innerHTML = `<p class="error-message">Container too small.</p>`;
//     return;
//   }
//   const svg = d3
//     .select(targetDiv)
//     .append("svg")
//     .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
//     .attr("preserveAspectRatio", "xMinYMid meet")
//     .append("g")
//     .attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);
//   const x = d3.scaleBand().range([0, width]).domain(d3.range(7)).padding(0.2);
//   const y = d3
//     .scaleLinear()
//     .domain([0, d3.max(completeDayData, (d) => d[1]) || 1])
//     .range([height, 0])
//     .nice();
//   svg
//     .append("g")
//     .attr("class", "axis axis--x")
//     .attr("transform", `translate(0, ${height})`)
//     .call(d3.axisBottom(x).tickFormat((d) => dayOfWeekNames[d]))
//     .append("text")
//     .attr("class", "axis-label")
//     .attr("x", width / 2)
//     .attr("y", chartMargin.bottom - 15)
//     .attr("text-anchor", "middle")
//     .text("Day of Week");
//   svg
//     .append("g")
//     .attr("class", "axis axis--y")
//     .call(
//       d3
//         .axisLeft(y)
//         .ticks(5)
//         .tickFormat((d) => formatTime(d))
//     )
//     .append("text")
//     .attr("class", "axis-label")
//     .attr("transform", "rotate(-90)")
//     .attr("y", 0 - chartMargin.left)
//     .attr("x", 0 - height / 2)
//     .attr("dy", "1em")
//     .attr("text-anchor", "middle")
//     .text("Total Listening Time");
//   svg
//     .selectAll(".bar")
//     .data(completeDayData)
//     .enter()
//     .append("rect")
//     .attr("class", "bar")
//     .attr("x", (d) => x(d[0]))
//     .attr("width", x.bandwidth())
//     .attr("y", height)
//     .attr("height", 0)
//     .attr("fill", "#6f42c1")
//     .on("mouseover", (event, d) =>
//       showTooltip(
//         event,
//         `<b>${dayOfWeekNames[d[0]]}</b><br>${formatTime(d[1])}`
//       )
//     )
//     .on("mousemove", moveTooltip)
//     .on("mouseout", hideTooltip)
//     .transition()
//     .duration(500)
//     .attr("y", (d) => y(d[1]))
//     .attr("height", (d) => Math.max(0, height - y(d[1])));
// }
// async function drawStreamgraph(filteredData, containerId) {
//   /* ... plot version ... */
//   const container = document.getElementById(containerId);
//   if (!container) return;
//   container.innerHTML = "";
//   if (!filteredData || filteredData.length === 0) {
//     container.innerHTML =
//       '<p class="empty-message">No data for streamgraph.</p>';
//     const descEl = container.nextElementSibling;
//     if (descEl && descEl.classList.contains("chart-description"))
//       descEl.innerHTML = "Select period above.";
//     return;
//   }
//   const streamDataProcessed = filteredData
//     .map((d) => {
//       let contentType = "Music";
//       if (d.episode_name && String(d.episode_name).trim() !== "")
//         contentType = "Podcast";
//       return { ...d, contentType: contentType };
//     })
//     .filter((d) => d.ms_played > 0);
//   if (streamDataProcessed.length === 0) {
//     container.innerHTML = '<p class="empty-message">No Music/Podcast data.</p>';
//     return;
//   }
//   const contentTypes = ["Music", "Podcast"]; // Keep consistent
//   const [minDate, maxDate] = d3.extent(streamDataProcessed, (d) => d.ts);
//   const timeDiffDays =
//     maxDate && minDate ? (maxDate - minDate) / (1000 * 60 * 60 * 24) : 0;
//   const timeAggregator =
//     timeDiffDays > 60 ? d3.timeDay.floor : d3.timeHour.floor;
//   const timeFormatString = timeDiffDays > 60 ? "%Y-%m-%d" : "%H:%M %a %d";

//   const aggregatedData = Array.from(
//     d3.group(streamDataProcessed, (d) => timeAggregator(d.ts)),
//     ([timeBin, values]) => {
//       const entry = { timeBin: new Date(timeBin) };
//       let totalMsPlayedInBin = 0;
//       contentTypes.forEach((type) => (entry[type] = 0));
//       values.forEach((v) => {
//         if (entry.hasOwnProperty(v.contentType)) {
//           entry[v.contentType] += v.ms_played;
//           totalMsPlayedInBin += v.ms_played;
//         }
//       });
//       entry.totalMinutes = totalMsPlayedInBin / 60000;
//       contentTypes.forEach((type) => {
//         entry[type] =
//           totalMsPlayedInBin > 0 ? entry[type] / totalMsPlayedInBin : 0;
//       });
//       return entry;
//     }
//   ).sort((a, b) => a.timeBin - b.timeBin);
//   if (aggregatedData.length === 0) {
//     container.innerHTML = '<p class="empty-message">No aggregated data.</p>';
//     return;
//   }

//   const margin = { top: 20, right: 30, bottom: 40, left: 50 };
//   const containerWidth = container.clientWidth || 800;
//   const height = 300 - margin.top - margin.bottom;
//   const width = containerWidth - margin.left - margin.right;
//   if (width <= 0 || height <= 0) {
//     container.innerHTML = `<p class="error-message">Container too small.</p>`;
//     return;
//   }
//   const svg = d3
//     .select(container)
//     .append("svg")
//     .attr(
//       "viewBox",
//       `0 0 ${containerWidth} ${height + margin.top + margin.bottom}`
//     )
//     .attr("preserveAspectRatio", "xMinYMid meet")
//     .append("g")
//     .attr("transform", `translate(${margin.left}, ${margin.top})`);
//   const xScale = d3
//     .scaleTime()
//     .domain(d3.extent(aggregatedData, (d) => d.timeBin))
//     .range([0, width]);
//   const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);
//   const colorMap = { Music: "#1DB954", Podcast: "#6f42c1" };
//   const colorScale = d3
//     .scaleOrdinal()
//     .domain(contentTypes)
//     .range(contentTypes.map((type) => colorMap[type]));
//   const stack = d3
//     .stack()
//     .keys(contentTypes)
//     .offset(d3.stackOffsetNone)
//     .order(d3.stackOrderInsideOut);
//   let series;
//   try {
//     series = stack(aggregatedData);
//   } catch (error) {
//     console.error("Streamgraph stacking error:", error);
//     container.innerHTML = '<p class="error-message">Stacking error.</p>';
//     return;
//   }
//   if (series.length === 0 || !series[0] || series[0].length === 0) {
//     container.innerHTML =
//       '<p class="empty-message">No stack layers generated.</p>';
//     return;
//   }

//   const areaGen = d3
//     .area()
//     .x((d) => xScale(d.data.timeBin))
//     .y0((d) => yScale(d[0]))
//     .y1((d) => yScale(d[1]))
//     .curve(d3.curveBasis);
//   svg
//     .selectAll(".stream-layer")
//     .data(series)
//     .enter()
//     .append("path")
//     .attr("class", (d) => `stream-layer ${String(d.key).toLowerCase()}-layer`)
//     .attr("d", areaGen)
//     .attr("fill", (d) => colorScale(d.key))
//     .attr("stroke", "#fff")
//     .attr("stroke-width", 0.5)
//     .on("mouseover", (event, d_layer) => {
//       /* ... tooltip logic ... */
//     })
//     .on("mousemove", moveTooltip)
//     .on("mouseout", (event, d) => {
//       /* ... tooltip logic ... */
//     });
//   let xAxisTicks;
//   if (timeDiffDays <= 2) xAxisTicks = d3.timeHour.every(6);
//   else if (timeDiffDays <= 14) xAxisTicks = d3.timeDay.every(1);
//   else if (timeDiffDays <= 90) xAxisTicks = d3.timeWeek.every(1);
//   else xAxisTicks = d3.timeMonth.every(1);
//   svg
//     .append("g")
//     .attr("class", "axis axis--x")
//     .attr("transform", `translate(0, ${height})`)
//     .call(
//       d3
//         .axisBottom(xScale)
//         .ticks(xAxisTicks)
//         .tickFormat(d3.timeFormat(timeDiffDays > 30 ? "%b %Y" : "%a %d"))
//     )
//     .append("text")
//     .attr("class", "axis-label")
//     .attr("x", width / 2)
//     .attr("y", margin.bottom - 10)
//     .attr("text-anchor", "middle")
//     .text("Date / Time");
//   const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%"));
//   svg
//     .append("g")
//     .attr("class", "axis axis--y")
//     .call(yAxis)
//     .append("text")
//     .attr("class", "axis-label")
//     .attr("transform", "rotate(-90)")
//     .attr("y", 0 - margin.left)
//     .attr("x", 0 - height / 2)
//     .attr("dy", "1em")
//     .attr("text-anchor", "middle")
//     .text("Listening Time Rate (%)");
//   const legendContainer = svg
//     .append("g")
//     .attr("class", "streamgraph-legend")
//     .attr("transform", `translate(${width - 100}, ${-10})`);
//   const legendItems = legendContainer
//     .selectAll(".legend-item")
//     .data(contentTypes)
//     .enter()
//     .append("g")
//     .attr("class", "legend-item")
//     .attr("transform", (d, i) => `translate(0, ${i * 15})`);
//   legendItems
//     .append("rect")
//     .attr("x", 0)
//     .attr("y", 0)
//     .attr("width", 10)
//     .attr("height", 10)
//     .attr("fill", (d) => colorScale(d));
//   legendItems
//     .append("text")
//     .attr("x", 15)
//     .attr("y", 5)
//     .attr("dy", "0.35em")
//     .style("font-size", "10px")
//     .text((d) => d);
//   const descriptionElement = container.nextElementSibling;
//   if (
//     descriptionElement &&
//     descriptionElement.classList.contains("chart-description")
//   )
//     descriptionElement.innerHTML =
//       "Proportional listening rate (%) between Music and Podcasts.";
// }
// // async function drawForceGraph(filteredData, containerId, topN = 10) { /* ... simple plot version ... */ }
// async function drawForceGraph2(filteredData, containerId, topN = 10) {
//   /* ... enhanced plot version ... */
//   const container = document.getElementById(containerId);
//   if (!container) {
//     console.error(`ForceGraph Error: Container #${containerId} not found.`);
//     return;
//   }
//   container.innerHTML = "";

//   if (!filteredData || filteredData.length < 2) {
//     container.innerHTML =
//       '<p class="empty-message">Not enough data for transitions.</p>';
//     const descEl = container.nextElementSibling;
//     if (descEl && descEl.classList.contains("chart-description"))
//       descEl.innerHTML = "Select period above.";
//     return;
//   }
//   const musicData = filteredData
//     .filter((d) => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0)
//     .sort((a, b) => a.ts - b.ts);
//   if (musicData.length < 2) {
//     container.innerHTML =
//       '<p class="empty-message">Not enough music plays.</p>';
//     return;
//   }
//   const artistCounts = d3.rollup(
//     musicData,
//     (v) => v.length,
//     (d) => d.artist
//   );
//   const topArtistsMap = new Map(
//     Array.from(artistCounts.entries())
//       .sort(([, countA], [, countB]) => countB - countA)
//       .slice(0, topN)
//   );
//   if (topArtistsMap.size < 2) {
//     container.innerHTML = `<p class="empty-message">Fewer than 2 top artists.</p>`;
//     return;
//   }
//   const transitions = new Map();
//   for (let i = 0; i < musicData.length - 1; i++) {
//     const sourceArtist = musicData[i].artist;
//     const targetArtist = musicData[i + 1].artist;
//     if (
//       topArtistsMap.has(sourceArtist) &&
//       topArtistsMap.has(targetArtist) &&
//       sourceArtist !== targetArtist
//     ) {
//       const key = `${sourceArtist}:::${targetArtist}`;
//       transitions.set(key, (transitions.get(key) || 0) + 1);
//     }
//   }
//   if (transitions.size === 0) {
//     container.innerHTML =
//       '<p class="empty-message">No transitions between top artists.</p>';
//     return;
//   }
//   const nodes = Array.from(topArtistsMap.keys()).map((artist) => ({
//     id: artist,
//     playCount: topArtistsMap.get(artist) || 0,
//   }));
//   const links = Array.from(transitions.entries()).map(([key, count]) => {
//     const [source, target] = key.split(":::");
//     return { source: source, target: target, value: count };
//   });

//   const margin = { top: 10, right: 10, bottom: 10, left: 10 };
//   const containerWidth = container.clientWidth || 600;
//   const containerHeight = 400;
//   const width = containerWidth - margin.left - margin.right;
//   const height = containerHeight - margin.top - margin.bottom;
//   if (width <= 0 || height <= 0) {
//     container.innerHTML = '<p class="error-message">Container too small.</p>';
//     return;
//   }

//   const svg = d3
//     .select(container)
//     .append("svg")
//     .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
//     .attr("preserveAspectRatio", "xMinYMid meet")
//     .style("max-width", "100%")
//     .style("height", "auto");
//   const mainGroup = svg
//     .append("g")
//     .attr("transform", `translate(${margin.left}, ${margin.top})`);
//   const zoomableGroup = mainGroup.append("g");
//   mainGroup
//     .append("rect")
//     .attr("width", width)
//     .attr("height", height)
//     .attr("fill", "none")
//     .attr("pointer-events", "all");
//   zoomableGroup
//     .append("defs")
//     .append("marker")
//     .attr("id", "arrowhead")
//     .attr("viewBox", "-0 -5 10 10")
//     .attr("refX", 15)
//     .attr("refY", 0)
//     .attr("orient", "auto")
//     .attr("markerWidth", 6)
//     .attr("markerHeight", 6)
//     .attr("xoverflow", "visible")
//     .append("svg:path")
//     .attr("d", "M 0,-5 L 10 ,0 L 0,5")
//     .attr("fill", "#999")
//     .style("stroke", "none");

//   const minRadius = 5,
//     maxRadius = 15;
//   const playCountExtent = d3.extent(nodes, (d) => d.playCount);
//   const nodeRadiusScale = d3
//     .scaleSqrt()
//     .domain([playCountExtent[0] || 0, playCountExtent[1] || 1])
//     .range([minRadius, maxRadius]);
//   const nodeColorScale = d3
//     .scaleSequential(d3.interpolateViridis)
//     .domain([playCountExtent[1] || 1, 0]);
//   const maxStrokeWidth = 6;
//   const linkWidthScale = d3
//     .scaleLinear()
//     .domain([0, d3.max(links, (d) => d.value) || 1])
//     .range([1, maxStrokeWidth]);

//   const simulation = d3
//     .forceSimulation(nodes)
//     .force(
//       "link",
//       d3
//         .forceLink(links)
//         .id((d) => d.id)
//         .distance(90)
//         .strength(
//           (link) =>
//             1 / Math.min(link.source.playCount || 1, link.target.playCount || 1)
//         )
//     ) // Added || 1 for safety
//     .force("charge", d3.forceManyBody().strength(-180))
//     .force("center", d3.forceCenter(width / 2, height / 2))
//     .force(
//       "collide",
//       d3
//         .forceCollide()
//         .radius((d) => nodeRadiusScale(d.playCount) + 6)
//         .strength(0.8)
//     );

//   const linkedByIndex = {};
//   links.forEach((d) => {
//     linkedByIndex[`${d.source.id || d.source},${d.target.id || d.target}`] = 1;
//   }); // Handle both string/object before simulation runs
//   function areNeighbors(a, b) {
//     return (
//       linkedByIndex[`${a.id},${b.id}`] ||
//       linkedByIndex[`${b.id},${a.id}`] ||
//       a.id === b.id
//     );
//   }

//   const link = zoomableGroup
//     .append("g")
//     .attr("class", "force-links")
//     .attr("stroke", "#999")
//     .attr("stroke-opacity", 0.5)
//     .selectAll("line")
//     .data(links)
//     .join("line")
//     .attr("stroke-width", (d) => linkWidthScale(d.value))
//     .attr("marker-end", "url(#arrowhead)");
//   link
//     .append("title")
//     .text(
//       (d) =>
//         `${d.source.id || d.source} → ${d.target.id || d.target}\n${
//           d.value
//         } transitions`
//     );

//   const node = zoomableGroup
//     .append("g")
//     .attr("class", "force-nodes")
//     .attr("stroke", "#fff")
//     .attr("stroke-width", 1.5)
//     .selectAll("circle")
//     .data(nodes)
//     .join("circle")
//     .attr("r", (d) => nodeRadiusScale(d.playCount))
//     .attr("fill", (d) => nodeColorScale(d.playCount))
//     .call(drag(simulation));
//   node.append("title").text((d) => `${d.id}\n${d.playCount} plays`);

//   const labels = zoomableGroup
//     .append("g")
//     .attr("class", "force-labels")
//     .attr("font-family", "sans-serif")
//     .attr("font-size", 10)
//     .attr("fill", "#333")
//     .attr("stroke", "white")
//     .attr("stroke-width", 0.3)
//     .attr("paint-order", "stroke")
//     .attr("pointer-events", "none")
//     .selectAll("text")
//     .data(nodes)
//     .join("text")
//     .attr("dx", (d) => nodeRadiusScale(d.playCount) + 4)
//     .attr("dy", "0.35em")
//     .text((d) => d.id);

//   // Hover Interaction functions (highlight, unhighlight, etc.)
//   node.on("mouseover", highlight).on("mouseout", unhighlight);
//   link.on("mouseover", highlightLink).on("mouseout", unhighlightLink);
//   // ... (highlight/unhighlight function implementations remain the same) ...
//   function highlight(event, d_hovered) {
//     const opacity = 0.15; // How much to fade others
//     node.style("opacity", (n) => (areNeighbors(d_hovered, n) ? 1 : opacity));
//     node.style("stroke", (n) => (n === d_hovered ? "black" : "#fff")); // Highlight border of hovered
//     node.style("stroke-width", (n) => (n === d_hovered ? 2.5 : 1.5));

//     link.style("stroke-opacity", (l) =>
//       l.source === d_hovered || l.target === d_hovered ? 0.9 : opacity * 0.5
//     );
//     // Arrowhead selection needs to happen within the link selection
//     link
//       .filter((l) => l.source === d_hovered || l.target === d_hovered)
//       .each(function () {
//         d3.select(this).attr("marker-end", "url(#arrowhead-highlight)"); // Use a highlighted marker maybe? Or just change color below
//       });
//     zoomableGroup.select("#arrowhead path").style("fill", "#555"); // Simpler: change def color (affects all though) - Better to handle within selection

//     labels.style("opacity", (n) => (areNeighbors(d_hovered, n) ? 1 : opacity));
//   }
//   function unhighlight() {
//     node.style("opacity", 1).style("stroke", "#fff").style("stroke-width", 1.5);
//     link.style("stroke-opacity", 0.5);
//     zoomableGroup.select("#arrowhead path").style("fill", "#999"); // Restore default arrow color
//     labels.style("opacity", 1);
//   }
//   function highlightLink(event, d_hovered) {
//     /* ... */
//   }
//   function unhighlightLink(event, d_hovered) {
//     /* ... */
//   }

//   simulation.on("tick", () => {
//     link
//       .attr("x1", (d) => d.source.x)
//       .attr("y1", (d) => d.source.y)
//       .attr("x2", (d) => d.target.x)
//       .attr("y2", (d) => d.target.y);
//     node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
//     labels.attr("x", (d) => d.x).attr("y", (d) => d.y);
//   });

//   function zoomed(event) {
//     zoomableGroup.attr("transform", event.transform);
//   }
//   const zoom = d3
//     .zoom()
//     .scaleExtent([0.2, 8])
//     .extent([
//       [0, 0],
//       [width, height],
//     ])
//     .translateExtent([
//       [0, 0],
//       [width, height],
//     ])
//     .on("zoom", zoomed);
//   svg.call(zoom);
//   svg.on("dblclick.zoom", null);

//   function drag(simulation) {
//     /* ... drag function implementation remains the same ... */
//     function dragstarted(event, d) {
//       if (!event.active) simulation.alphaTarget(0.3).restart();
//       d.fx = d.x;
//       d.fy = d.y;
//       d3.select(this).raise();
//     }
//     function dragged(event, d) {
//       d.fx = event.x;
//       d.fy = event.y;
//     }
//     function dragended(event, d) {
//       if (!event.active) simulation.alphaTarget(0);
//       if (!event.sourceEvent || !event.sourceEvent.type.includes("zoom")) {
//         d.fx = null;
//         d.fy = null;
//       }
//       if (d3.select(this).style("opacity") == 1) {
//         highlight(event, d);
//       }
//     }
//     return d3
//       .drag()
//       .on("start", dragstarted)
//       .on("drag", dragged)
//       .on("end", dragended);
//   }

//   const descEl = container.nextElementSibling;
//   if (descEl && descEl.classList.contains("chart-description")) {
//     descEl.innerHTML = `Transitions between top ${nodes.length} artists. Size/color = plays. Thickness = transitions. Hover/Pan/Zoom.`;
//   }
// }
// async function drawTimeline(fullData, containerId) {
//   /* ... plot version ... */
//   const container = document.getElementById(containerId);
//   if (!container) {
//     console.error(
//       `drawTimeline Error: Container element with ID "${containerId}" not found.`
//     );
//     return;
//   }
//   container.innerHTML = ""; // Clear first
//   if (!fullData || fullData.length === 0) {
//     container.innerHTML =
//       '<p class="empty-message">No data available for Timeline.</p>';
//     return;
//   }
//   const latestTs = d3.max(fullData, (d) => d.ts);
//   if (!latestTs) {
//     container.innerHTML =
//       '<p class="empty-message">No valid timestamps found for Timeline.</p>';
//     return;
//   }
//   const twentyFourHoursAgo = new Date(latestTs.getTime() - 24 * 60 * 60 * 1000);
//   const timelineData = fullData.filter(
//     (d) => d.ts >= twentyFourHoursAgo && d.ms_played > 0
//   );
//   if (timelineData.length === 0) {
//     container.innerHTML =
//       '<p class="empty-message">No listening events in the last 24 hours of data.</p>';
//     return;
//   }
//   const margin = { top: 10, right: 30, bottom: 30, left: 30 };
//   const containerWidth = container.clientWidth || 800;
//   const height = 100 - margin.top - margin.bottom;
//   const width = containerWidth - margin.left - margin.right;
//   if (width <= 0 || height <= 0) {
//     container.innerHTML =
//       '<p class="error-message">Container too small for Timeline chart.</p>';
//     return;
//   }
//   const svg = d3
//     .select(container)
//     .append("svg")
//     .attr(
//       "viewBox",
//       `0 0 ${containerWidth} ${height + margin.top + margin.bottom}`
//     )
//     .attr("preserveAspectRatio", "xMinYMid meet")
//     .append("g")
//     .attr("transform", `translate(${margin.left}, ${margin.top})`);
//   const xScale = d3
//     .scaleTime()
//     .domain([twentyFourHoursAgo, latestTs])
//     .range([0, width]);
//   const platforms = [
//     ...new Set(timelineData.map((d) => d.platform || "Unknown")),
//   ];
//   const colorScale = d3
//     .scaleOrdinal()
//     .domain(platforms)
//     .range(d3.schemeCategory10);
//   svg
//     .append("g")
//     .attr("class", "axis axis--x")
//     .attr("transform", `translate(0, ${height})`)
//     .call(
//       d3
//         .axisBottom(xScale)
//         .ticks(d3.timeHour.every(3))
//         .tickFormat(d3.timeFormat("%H:%M"))
//     );
//   const tapeHeight = height * 0.6;
//   const tapeY = (height - tapeHeight) / 2;
//   svg
//     .selectAll(".timeline-event")
//     .data(timelineData)
//     .enter()
//     .append("rect")
//     .attr("class", "timeline-event")
//     .attr("x", (d) => xScale(d.ts))
//     .attr("y", tapeY)
//     .attr("width", (d) => {
//       const startX = xScale(d.ts);
//       const endTs = new Date(d.ts.getTime() + d.ms_played);
//       const effectiveEndX = xScale(endTs > latestTs ? latestTs : endTs);
//       return Math.max(1, effectiveEndX - startX);
//     })
//     .attr("height", tapeHeight)
//     .attr("fill", (d) => colorScale(d.platform || "Unknown"))
//     .attr("stroke", (d) => (d.skipped ? handleColor : "#333"))
//     .attr("stroke-width", (d) => (d.skipped ? 1.5 : 0.5))
//     .on("mouseover", (event, d) => {
//       d3.select(event.currentTarget).attr(
//         "stroke-width",
//         d.skipped ? 2.5 : 1.5
//       );
//       const content = `<b>${
//         d.track ||
//         d.episode_name ||
//         d.audiobook_chapter_title ||
//         "Unknown Title"
//       }</b><br>Artist/Show: ${
//         d.artist || d.episode_show_name || d.audiobook_title || "N/A"
//       }<br>Album: ${d.album || "N/A"}<br>Duration: ${formatTime(
//         d.ms_played / 60000
//       )}<br>Time: ${d3.timeFormat("%H:%M:%S")(d.ts)}<br>Platform: ${
//         d.platform || "Unknown"
//       }<br>Skipped: ${d.skipped ? "Yes" : "No"} <br>Reason Start: ${
//         d.reason_start || "N/A"
//       }<br>Reason End: ${d.reason_end || "N/A"}`;
//       showTooltip(event, content);
//     })
//     .on("mousemove", moveTooltip)
//     .on("mouseout", (event, d) => {
//       d3.select(event.currentTarget).attr(
//         "stroke-width",
//         d.skipped ? 1.5 : 0.5
//       );
//       hideTooltip();
//     });
// }

// // --- Text Generating Functions (Only called if USE_TEXT_MODE is true) ---

// function drawCalendarAsText(data, initialStartDate, initialEndDate) {
//   const container = document.getElementById("calendar");
//   const legendContainer = document.getElementById("legend");
//   if (!container || !legendContainer) return;

//   container.innerHTML = "";
//   legendContainer.innerHTML = "";

//   const listeningData = data.filter((d) => d.ms_played > 0);
//   if (listeningData.length === 0) {
//     container.innerHTML = `<p class="empty-message">No listening data found for this period: <strong>${formatDate(
//       initialStartDate
//     )} to ${formatDate(initialEndDate)}</strong>.</p>`;
//     return;
//   }

//   const dailyData = d3.rollups(
//     listeningData,
//     (v) => d3.sum(v, (d) => d.ms_played / 60000),
//     (d) => formatDay(d.ts)
//   );

//   const valueMap = new Map(dailyData);
//   const totalMinutes = d3.sum(valueMap.values());
//   const numberOfDaysWithListening = valueMap.size;

//   const totalDaysInPeriod = d3.timeDay.count(
//     initialStartDate,
//     d3.timeDay.offset(initialEndDate, 1)
//   );

//   const averageMinutesPerListeningDay =
//     totalMinutes / (numberOfDaysWithListening || 1);
//   const averageMinutesOverall = totalMinutes / (totalDaysInPeriod || 1);

//   let peakDayStr = null;
//   let maxMinutesOnPeakDay = 0;
//   valueMap.forEach((minutes, dayStr) => {
//     if (minutes > maxMinutesOnPeakDay) {
//       maxMinutesOnPeakDay = minutes;
//       peakDayStr = dayStr;
//     }
//   });

//   const monthlyTotals = new Map();
//   valueMap.forEach((minutes, dayStr) => {
//     const date = new Date(dayStr);
//     const monthKey = d3.timeMonth.floor(date).toISOString();
//     monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + minutes);
//   });

//   let peakMonthKey = null;
//   let maxMinutesInPeakMonth = 0;
//   monthlyTotals.forEach((total, key) => {
//     if (total > maxMinutesInPeakMonth) {
//       maxMinutesInPeakMonth = total;
//       peakMonthKey = key;
//     }
//   });

//   let textContent = `<h3 style="color: var(--spotify-color)">Your Listening Summary</h3>`;
//   textContent += `<p>From <strong">${formatDate(
//     initialStartDate
//   )}</strong> to <strong ">${formatDate(
//     initialEndDate
//   )}</strong>, you listened for a total of <strong ">${formatTime(
//     totalMinutes
//   )}</strong>.</p>`;
//   textContent += `<p>You had activity on <strong style="color: var(--dark-green-color);">${numberOfDaysWithListening}</strong> days out of ${totalDaysInPeriod}.</p>`;
//   textContent += `<p>Average per day: <strong style="color: var(--dark-green-color);">${formatTime(
//     averageMinutesOverall
//   )}</strong>. Listening days average: <strong style="color: var(--dark-green-color);">${formatTime(
//     averageMinutesPerListeningDay
//   )}</strong>.</p>`;

//   if (peakDayStr) {
//     textContent += `<p>Peak day: <strong>${formatDate(
//       new Date(peakDayStr)
//     )}</strong> with <strong style="color: var(--dark-green-color);">${formatTime(
//       maxMinutesOnPeakDay
//     )}</strong>.</p>`;
//   }

//   if (peakMonthKey) {
//     textContent += `<p>Peak month: <strong>${formatFullMonthYear(
//       new Date(peakMonthKey)
//     )}</strong> (<strong style="color: var(--dark-green-color);">${formatTime(
//       maxMinutesInPeakMonth
//     )}</strong>).</p>`;
//   } else {
//     textContent += `<p>No peak month could be determined from the data.</p>`;
//   }

//   container.innerHTML = textContent;
//   updateFilterInfoLabel(initialStartDate, initialEndDate);
// }

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

// function updateTimeOfDayChartAsText(data) {
//   const targetDiv = document.getElementById("time-of-day-chart");
//   if (!targetDiv) return;
//   targetDiv.innerHTML = "";

//   if (!data || data.length === 0) {
//     targetDiv.innerHTML = `<p class="empty-message" style="color: var(--dark-green-color);">No listening data for time of day.</p>`;
//     return;
//   }

//   const hourData = d3.rollups(
//     data.filter((d) => d.ms_played > 0),
//     (v) => d3.sum(v, (d) => d.ms_played / 60000),
//     (d) => d.ts.getHours()
//   );

//   const hourMap = new Map(hourData.sort((a, b) => d3.descending(a[1], b[1])));
//   if (hourMap.size === 0) {
//     targetDiv.innerHTML = `<p class="empty-message">No listening activity by hour.</p>`;
//     return;
//   }

//   const totalMinutes = d3.sum(hourMap.values());
//   const peakHour = hourMap.keys().next().value;
//   const peakMinutes = hourMap.get(peakHour);

//   let textContent = `<h4 style="color: var(--spotify-color);">Listening by Time of Day</h4>`;
//   textContent += `<p>Total: <strong>${formatTime(totalMinutes)}</strong></p>`;
//   textContent += `<p>Peak hour: <strong style="color: var(--dark-green-color);">${peakHour}:00 - ${
//     peakHour + 1
//   }:00</strong> (${formatTime(peakMinutes)}).</p>`;
//   textContent += `<ul style="padding-left: 1rem;">`;

//   let count = 0;
//   for (const [hour, minutes] of hourMap.entries()) {
//     if (count < 3) {
//       textContent += `<li><strong>${hour}:00 - ${
//         hour + 1
//       }:00</strong>: ${formatTime(minutes)}</li>`;
//       count++;
//     } else break;
//   }

//   textContent += `</ul>`;
//   targetDiv.innerHTML = textContent;
// }

// function updateDayOfWeekChartAsText(data) {
//   const targetDiv = document.getElementById("day-of-week-chart");
//   if (!targetDiv) return;
//   targetDiv.innerHTML = "";

//   if (!data || data.length === 0) {
//     targetDiv.innerHTML = `<p class="empty-message" style="color: var(--dark-green-color);">No listening data for days of the week.</p>`;
//     return;
//   }

//   const dayData = d3.rollups(
//     data.filter((d) => d.ms_played > 0),
//     (v) => d3.sum(v, (d) => d.ms_played / 60000),
//     (d) => d.ts.getDay()
//   );

//   const dayMap = new Map(dayData.sort((a, b) => d3.descending(a[1], b[1])));
//   if (dayMap.size === 0) {
//     targetDiv.innerHTML = `<p class="empty-message">No activity by day recorded.</p>`;
//     return;
//   }

//   const totalMinutes = d3.sum(dayMap.values());
//   const peakDayIndex = dayMap.keys().next().value;
//   const peakMinutes = dayMap.get(peakDayIndex);

//   let textContent = `<h4 style="color: var(--spotify-color);">Listening by Day of Week</h4>`;
//   textContent += `<p>Total: <strong>${formatTime(totalMinutes)}</strong></p>`;
//   textContent += `<p>Most active: <strong style="color: var(--dark-green-color);">${
//     dayOfWeekNames[peakDayIndex]
//   }</strong> (${formatTime(peakMinutes)}).</p>`;
//   textContent += `<ol style="padding-left: 1rem;">`;

//   for (const [dayIndex, minutes] of dayMap.entries()) {
//     textContent += `<li><strong>${
//       dayOfWeekNames[dayIndex]
//     }</strong>: ${formatTime(minutes)}</li>`;
//   }

//   for (let i = 0; i < 7; i++) {
//     if (!dayMap.has(i)) {
//       textContent += `<li><strong>${dayOfWeekNames[i]}</strong>: ${formatTime(
//         0
//       )}</li>`;
//     }
//   }

//   textContent += `</ol>`;
//   targetDiv.innerHTML = textContent;
// }

// function drawStreamgraphAsText(filteredData, containerId) {
//   const container = document.getElementById(containerId);
//   if (!container) return;
//   container.innerHTML = "";
//   if (!filteredData || filteredData.length === 0) {
//     container.innerHTML = '<p class="empty-message">No data.</p>';
//     return;
//   }
//   const streamDataProcessed = filteredData
//     .map((d) => {
//       let contentType = "Music";
//       if (d.episode_name && String(d.episode_name).trim() !== "")
//         contentType = "Podcast";
//       return { ...d, contentType: contentType };
//     })
//     .filter((d) => d.ms_played > 0);
//   if (streamDataProcessed.length === 0) {
//     container.innerHTML = '<p class="empty-message">No Music/Podcast data.</p>';
//     return;
//   }
//   const timeByType = d3.rollup(
//     streamDataProcessed,
//     (v) => d3.sum(v, (d) => d.ms_played),
//     (d) => d.contentType
//   );
//   const totalMsPlayed = d3.sum(timeByType.values());
//   const musicMs = timeByType.get("Music") || 0;
//   const podcastMs = timeByType.get("Podcast") || 0;
//   const musicPercent = totalMsPlayed > 0 ? (musicMs / totalMsPlayed) * 100 : 0;
//   const podcastPercent =
//     totalMsPlayed > 0 ? (podcastMs / totalMsPlayed) * 100 : 0;
//   let textContent = `<h4>Music vs Podcast Summary</h4><ul>`;
//   textContent += `<li><strong>Music:</strong> ${formatTime(
//     musicMs / 60000
//   )} (${musicPercent.toFixed(1)}%)</li>`;
//   textContent += `<li><strong>Podcast:</strong> ${formatTime(
//     podcastMs / 60000
//   )} (${podcastPercent.toFixed(1)}%)</li>`;
//   textContent += `</ul><p>Total considered: ${formatTime(
//     totalMsPlayed / 60000
//   )}.</p>`;
//   container.innerHTML = textContent;
//   const descEl = container.nextElementSibling;
//   if (descEl && descEl.classList.contains("chart-description"))
//     descEl.innerHTML = "Total time breakdown for Music/Podcasts.";
// }

// function drawForceGraphAsText(filteredData, containerId, topN = 10) {
//   const container = document.getElementById(containerId);
//   if (!container) return;
//   container.innerHTML = "";

//   if (!filteredData || filteredData.length < 2) {
//     container.innerHTML =
//       '<p class="empty-message">Not enough data to show transitions.</p>';
//     return;
//   }

//   const musicData = filteredData
//     .filter((d) => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0)
//     .sort((a, b) => a.ts - b.ts);

//   if (musicData.length < 2) {
//     container.innerHTML =
//       '<p class="empty-message">Not enough plays to show transitions.</p>';
//     return;
//   }

//   const artistCounts = d3.rollup(
//     musicData,
//     (v) => v.length,
//     (d) => d.artist
//   );

//   const topArtistsMap = new Map(
//     Array.from(artistCounts.entries())
//       .sort(([, a], [, b]) => b - a)
//       .slice(0, topN)
//   );

//   if (topArtistsMap.size < 2) {
//     container.innerHTML = `<p class="empty-message">Too few artists to show transitions.</p>`;
//     return;
//   }

//   const transitions = new Map();
//   for (let i = 0; i < musicData.length - 1; i++) {
//     const source = musicData[i].artist;
//     const target = musicData[i + 1].artist;

//     if (
//       topArtistsMap.has(source) &&
//       topArtistsMap.has(target) &&
//       source !== target
//     ) {
//       const key = `${source}:::${target}`;
//       transitions.set(key, (transitions.get(key) || 0) + 1);
//     }
//   }

//   if (transitions.size === 0) {
//     container.innerHTML =
//       '<p class="empty-message">No artist transitions found.</p>';
//     return;
//   }

//   const sortedTransitions = Array.from(transitions.entries()).sort((a, b) =>
//     d3.descending(a[1], b[1])
//   );

//   let textContent = `<h4>Most Frequent Artist Transitions</h4>`;
//   textContent += `<p>These are the artists you most often switched between while listening:</p><ol>`;

//   const maxToShow = 10;
//   sortedTransitions.slice(0, maxToShow).forEach(([key, count]) => {
//     const [from, to] = key.split(":::");
//     textContent += `<li><strong>${from}</strong> → <strong>${to}</strong> (${count} times)</li>`;
//   });

//   textContent += `</ol>`;
//   container.innerHTML = textContent;

//   const descEl = container.nextElementSibling;
//   if (descEl && descEl.classList.contains("chart-description")) {
//     descEl.innerHTML = `Your most common switches between artists, based on ${topArtistsMap.size} of your most played artists.`;
//   }
// }

// // --- Main Update Triggers ---

// // Updates PLOT components based on filtered data
// function handleBrushUpdate(filteredChartData) {
//   const dataToUpdate = filteredChartData || [];
//   updateTopArtists(dataToUpdate);
//   updateTopTracksChart2(dataToUpdate); // Using sparkline version for plots
//   updateTimeOfDayChart(dataToUpdate);
//   updateDayOfWeekChart(dataToUpdate);
//   drawStreamgraph(dataToUpdate, "streamgraph-chart");
//   drawForceGraph2(dataToUpdate, "force-graph-chart");
// }

// // Updates TEXT summary components based on filtered data
// function handleBrushUpdateAsText(filteredChartData) {
//   const dataToUpdate = filteredChartData || [];
//   console.log("Updating text components...");
//   updateTopArtistsAsText(dataToUpdate);
//   updateTopTracksAsText(dataToUpdate);
//   updateTimeOfDayChartAsText(dataToUpdate);
//   updateDayOfWeekChartAsText(dataToUpdate);
//   drawStreamgraphAsText(dataToUpdate, "streamgraph-chart");
//   drawForceGraphAsText(dataToUpdate, "force-graph-chart");
// }

// // --- Core Visualization Update Function (Handles Mode Switching) ---
// // Called when the main date range (year dropdown, date inputs) changes.
// function updateVisualization(filteredData) {
//   // Renamed from updateVisualizationText
//   const chartsToClear = [
//     topArtistsUl,
//     topTracksDiv,
//     timeOfDayDiv,
//     dayOfWeekDiv,
//     document.getElementById("streamgraph-chart"),
//     document.getElementById("force-graph-chart"),
//   ];
//   if (calendarDiv) calendarDiv.innerHTML = ""; // Clear main display area
//   if (legendDiv) legendDiv.innerHTML = ""; // Clear legend area

//   selectedStartDate = null;
//   selectedEndDate = null; // Reset selection state
//   currentViewData = filteredData || []; // Store the data for the current view

//   // Handle empty/invalid data for this period
//   if (!filteredData || filteredData.length === 0) {
//     if (calendarDiv)
//       calendarDiv.innerHTML = `<p class="empty-message">No data for selected period.</p>`;
//     chartsToClear.forEach((el) => {
//       if (el) el.innerHTML = `<p class="empty-message">No data.</p>`;
//     });
//     updateFilterInfoLabel(null, null);
//     // Clear dependent components using the appropriate handler based on mode
//     if (USE_TEXT_MODE) handleBrushUpdateAsText([]);
//     else handleBrushUpdate([]);
//     return;
//   }

//   // Determine the date range of the incoming data
//   const [viewStartDate, viewEndDate] = d3.extent(filteredData, (d) => d.ts);

//   if (
//     !viewStartDate ||
//     !viewEndDate ||
//     isNaN(viewStartDate) ||
//     isNaN(viewEndDate)
//   ) {
//     console.error("updateVisualization: Invalid date range in data.");
//     if (calendarDiv)
//       calendarDiv.innerHTML = `<p class="error-message">Invalid date range in data.</p>`;
//     chartsToClear.forEach((el) => {
//       if (el) el.innerHTML = `<p class="empty-message">No data.</p>`;
//     });
//     updateFilterInfoLabel(null, null);
//     // Clear dependent components based on mode
//     if (USE_TEXT_MODE) handleBrushUpdateAsText([]);
//     else handleBrushUpdate([]);
//     return;
//   }

//   // --- MODE SWITCH ---
//   if (USE_TEXT_MODE) {
//     console.log("Rendering in Text Mode");
//     // 1. Display the main calendar summary text
//     drawCalendarAsText(filteredData, viewStartDate, viewEndDate);
//     // 2. Update all other text components with the full initial range data
//     handleBrushUpdateAsText(filteredData);
//     // 3. Update the filter label to show the full range
//     updateFilterInfoLabel(viewStartDate, viewEndDate);
//   } else {
//     console.log("Rendering in Plot Mode");
//     // 1. Draw the interactive visual calendar
//     // This function internally sets selectedStartDate/EndDate and calls drawHandles
//     drawCalendar(filteredData, viewStartDate, viewEndDate);
//     // 2. Filter data and update plots for the initial full range displayed by the calendar
//     // Pass the dates explicitly to ensure the correct initial range is used
//     filterDataAndUpdateCharts(viewStartDate, viewEndDate);
//     // updateFilterInfoLabel is called within drawCalendar or filterDataAndUpdateCharts
//   }
// }

// // --- Filter Data and Update Dependent Components ---
// // Called by updateVisualization (in plot mode) or handleDragEnd (plot mode)
// function filterDataAndUpdateCharts(startDate, endDate) {
//   // Renamed from filterDataAndUpdateChartsText
//   const validStartDate =
//     startDate instanceof Date && !isNaN(startDate)
//       ? startDate
//       : selectedStartDate;
//   const validEndDate =
//     endDate instanceof Date && !isNaN(endDate) ? endDate : selectedEndDate;

//   if (
//     !validStartDate ||
//     !validEndDate ||
//     !currentViewData ||
//     isNaN(validStartDate) ||
//     isNaN(validEndDate) ||
//     validStartDate > validEndDate
//   ) {
//     console.warn("filterDataAndUpdateCharts: Invalid date range or no data.", {
//       validStartDate,
//       validEndDate,
//     });
//     if (USE_TEXT_MODE) handleBrushUpdateAsText([]);
//     else handleBrushUpdate([]);
//     updateFilterInfoLabel(validStartDate, validEndDate);
//     return;
//   }

//   const filterStart = d3.timeDay.floor(validStartDate);
//   const filterEnd = d3.timeDay.offset(d3.timeDay.floor(validEndDate), 1);
//   const filtered = currentViewData.filter((d) => {
//     const dDate = d.ts;
//     return (
//       dDate instanceof Date &&
//       !isNaN(dDate) &&
//       dDate >= filterStart &&
//       dDate < filterEnd
//     );
//   });

//   console.log(
//     `Filtered data from ${formatDate(validStartDate)} to ${formatDate(
//       validEndDate
//     )}: ${filtered.length} records.`
//   );
//   updateFilterInfoLabel(validStartDate, validEndDate); // Update label

//   // --- MODE SWITCH ---
//   // Call the appropriate update handler based on the global mode
//   if (USE_TEXT_MODE) {
//     handleBrushUpdateAsText(filtered);
//   } else {
//     handleBrushUpdate(filtered); // CORRECTED: Call plot handler in plot mode
//   }
// }

// // --- Event Listeners ---
// if (wrappedYearSelect) {
//   wrappedYearSelect.onchange = () => {
//     const selectedYearValue = wrappedYearSelect.value;
//     if (!selectedYearValue) {
//       console.warn("Empty year selected.");
//       // Optionally clear or show all data: updateVisualization(allParsedData);
//       return;
//     }
//     const selectedYear = +selectedYearValue;
//     if (!selectedYear || isNaN(selectedYear)) {
//       console.warn("Invalid year selected:", selectedYearValue);
//       updateVisualization([]);
//       return;
//     }
//     const yearStart = new Date(selectedYear, 0, 1);
//     const yearEndFilter = new Date(selectedYear + 1, 0, 1);
//     const filteredByYear = allParsedData.filter(
//       (d) => d.ts >= yearStart && d.ts < yearEndFilter
//     );
//     // Update date inputs to reflect the selected year
//     if (startDateInput) startDateInput.value = formatDateForInput(yearStart);
//     if (endDateInput)
//       endDateInput.value = formatDateForInput(new Date(selectedYear, 11, 31));
//     // Call the main update function which handles the mode switch
//     updateVisualization(filteredByYear); // Use the renamed function
//   };
// } else {
//   console.error("Cannot attach change listener: #wrappedYearSelect not found.");
// }

// if (applyRangeBtn) {
//   // Check if button exists
//   applyRangeBtn.onclick = () => {
//     const startStr = startDateInput.value;
//     const endStr = endDateInput.value;
//     const startMs = Date.parse(startStr);
//     const endMs = Date.parse(endStr);
//     let start = !isNaN(startMs) ? d3.timeDay.floor(new Date(startMs)) : null;
//     let end = !isNaN(endMs) ? d3.timeDay.floor(new Date(endMs)) : null;
//     if (!start || !end) {
//       alert("Invalid date format. Please use YYYY-MM-DD.");
//       return;
//     }
//     if (start > end) {
//       console.warn("Start date was after end date, swapping them.");
//       [start, end] = [end, start]; // Swap
//       startDateInput.value = formatDateForInput(start); // Update inputs
//       endDateInput.value = formatDateForInput(end);
//     }
//     // Calculate end filter date (exclusive)
//     const filterEnd = d3.timeDay.offset(end, 1);
//     // Clear year selection as date range takes precedence
//     if (wrappedYearSelect) wrappedYearSelect.value = "";
//     // Filter the *entire* dataset by the selected range
//     const filteredByRange = allParsedData.filter(
//       (d) => d.ts >= start && d.ts < filterEnd
//     );
//     // Call the main update function which handles the mode switch
//     updateVisualization(filteredByRange); // Use the renamed function
//   };
// } else {
//   console.error("Cannot attach click listener: #applyRangeBtn not found.");
// }


// --- Configuration ---
const USE_TEXT_MODE = true; // SET TO true FOR TEXT, false FOR PLOTS
// --- End Configuration ---

const cellSize = 15;
const cellPadding = 1.5;
const leftPadding = 40;
const topPadding = 25;
const noDataColor = "#ebedf0";
const calendarColorScale = d3.scaleSequential(d3.interpolateBlues);
const chartMargin = { top: 20, right: 20, bottom: 60, left: 70 };

// --- Handle Configuration (Only relevant for plot mode) ---
const handleWidth = 3;
const handleColor = "#e63946";
const handleGrabAreaWidth = 10;
const highlightColor = "rgba(108, 117, 125, 0.2)";

// --- DOM Elements ---
const wrappedYearSelect = document.getElementById("wrappedYearSelect");
console.log("Found #wrappedYearSelect element:", wrappedYearSelect);
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const applyRangeBtn = document.getElementById("applyRangeBtn");
const calendarDiv = document.getElementById("calendar");
const legendDiv = document.getElementById("legend");
const topArtistsContainer = document.getElementById("top-artists-chart"); // Corrected ID
const tooltipDiv = d3.select("#tooltip"); // Keep using d3.select for the tooltip div
const topTracksDiv = document.getElementById("top-tracks-chart");
const timeOfDayDiv = document.getElementById("time-of-day-chart");
const dayOfWeekDiv = document.getElementById("day-of-week-chart");
const filterInfoSpan = document.getElementById("current-filter-info");
const streamgraphContainer = document.getElementById("streamgraph-chart"); // Added
const forceGraphContainer = document.getElementById("force-graph-chart"); // Added
const forceGraphSlider = document.getElementById("forceGraphSlider"); // Added for Force Graph Top N
const forceGraphSliderValue = document.getElementById("forceGraphSliderValue"); // Added

// --- Helper Functions ---
const formatDay = d3.timeFormat("%Y-%m-%d");
const formatDate = d3.timeFormat("%a, %b %d, %Y");
const formatMonth = d3.timeFormat("%b"); // Short month name
const formatFullMonthYear = d3.timeFormat("%B %Y"); // Full month name + year
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

// --- Global variables ---
let allParsedData = [];
// Column detection - simplified for brevity, assuming necessary columns exist
let requiredColumns = {
  track_name: true, // Assume true for simplicity, original check is good practice
  artist: true,
  album: true,
  img: true,
  platform: true,
  skipped: true,
  shuffle: true,
  episode_name: true,
  episode_show_name: true,
  audiobook_title: true,
  audiobook_chapter_title: true,
  reason_start: true,
  reason_end: true,
  conn_country: true,
};
let currentViewData = []; // Data currently displayed (filtered by year/range)
let selectedStartDate = null; // Start date of the user's selection within the calendar view
let selectedEndDate = null; // End date of the user's selection within the calendar view

// Plot-mode specific globals
let svgInstance = null;
let allDaysInCalendar = [];
let calendarStartDay = null;
let cellWidthWithPadding = cellSize + cellPadding;
let currentCalendarHeight = 0;
let overallMinDate = null; // Store overall min date
let overallMaxDate = null; // Store overall max date

// --- Data Processing (Runs once) ---
(async function loadData() {
  try {
    const rawData = await d3.csv("data/astrid_data.csv");

    // Basic column check (keep original logic if needed)
    const columns = new Set(rawData.columns);
    requiredColumns.track_name = columns.has("master_metadata_track_name");
    requiredColumns.artist = columns.has("master_metadata_album_artist_name");
    requiredColumns.album = columns.has("master_metadata_album_album_name");
    requiredColumns.img = columns.has("spotify_track_uri"); // Use URI for img lookup later
    requiredColumns.platform = columns.has("platform");
    requiredColumns.skipped = columns.has("skipped");
    requiredColumns.shuffle = columns.has("shuffle");
    requiredColumns.episode_name = columns.has("episode_name");
    requiredColumns.episode_show_name = columns.has("episode_show_name");
    requiredColumns.audiobook_title = columns.has("audiobook_title");
    requiredColumns.audiobook_chapter_title = columns.has(
      "audiobook_chapter_title"
    );
    requiredColumns.reason_start = columns.has("reason_start");
    requiredColumns.reason_end = columns.has("reason_end");
    requiredColumns.conn_country = columns.has("conn_country");

    allParsedData = rawData
      .map((d) => ({
        ts: new Date(d.ts),
        ms_played: +d.ms_played,
        platform: d.platform || "Unknown",
        conn_country: d.conn_country || "Unknown",
        artist: d.master_metadata_album_artist_name || "Unknown Artist",
        track: requiredColumns.track_name
          ? d.master_metadata_track_name || "Unknown Track"
          : "N/A",
        album: d.master_metadata_album_album_name || "Unknown Album",
        episode_name: d.episode_name || null,
        episode_show_name: d.episode_show_name || null,
        audiobook_title: d.audiobook_title || null,
        audiobook_chapter_title: d.audiobook_chapter_title || null,
        skipped: ["true", "1", true].includes(String(d.skipped).toLowerCase()),
        shuffle: ["true", "1", true].includes(String(d.shuffle).toLowerCase()),
        reason_start: d.reason_start || "N/A",
        reason_end: d.reason_end || "N/A",
        spotify_track_uri: d.spotify_track_uri || null,
      }))
      .filter(
        (d) =>
          d.ts instanceof Date &&
          !isNaN(d.ts) &&
          typeof d.ms_played === "number" &&
          !isNaN(d.ms_played) &&
          d.ms_played >= 0
      );

    // Sort data once after parsing
    allParsedData.sort((a, b) => a.ts - b.ts);

    console.log(`Loaded and parsed ${allParsedData.length} valid records.`);

    // Handle no valid data found
    if (allParsedData.length === 0) {
      if (calendarDiv)
        calendarDiv.innerHTML = `<p class="error-message">No valid data found.</p>`;
      if (filterInfoSpan) filterInfoSpan.textContent = "No data loaded";
      [
        topArtistsContainer,
        topTracksDiv,
        timeOfDayDiv,
        dayOfWeekDiv,
        streamgraphContainer,
        forceGraphContainer,
      ].forEach((el) => {
        if (el) el.innerHTML = `<p class="empty-message">No data.</p>`;
      });
      // Disable controls if no data
      [
        wrappedYearSelect,
        startDateInput,
        endDateInput,
        applyRangeBtn,
        forceGraphSlider,
      ].forEach((el) => {
        if (el) el.disabled = true;
      });
      return; // Stop execution
    }

    // --- Determine Overall Date Range ---
    overallMinDate = d3.min(allParsedData, (d) => d.ts);
    overallMaxDate = d3.max(allParsedData, (d) => d.ts);
    const years = [
      ...new Set(allParsedData.map((d) => d.ts.getFullYear())),
    ].sort((a, b) => a - b);
    console.log("Available years found in data:", years);

    // --- Populate Year Select ---
    if (wrappedYearSelect) {
      // Add "All Time" Option FIRST
      const allTimeOption = document.createElement("option");
      allTimeOption.value = "all";
      allTimeOption.textContent = "All Time";
      wrappedYearSelect.appendChild(allTimeOption); // Append, will be selected later

      years.forEach((y) => {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        wrappedYearSelect.appendChild(opt);
      });
      wrappedYearSelect.value = "all"; // Set default selection to "All Time"
    } else {
      console.error("Cannot modify dropdown: #wrappedYearSelect not found.");
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
      console.log(`Set initial date range: ${minDateStr} to ${maxDateStr}`);
    } else {
      console.error("Could not set initial date input values.");
    }

    // --- Setup Force Graph Slider ---
    // Set initial display value (assuming default value is set in HTML)
    if (forceGraphSlider && forceGraphSliderValue) {
        forceGraphSliderValue.textContent = forceGraphSlider.value;
    } else {
        console.warn("Force graph slider or value display not found.");
    }

    // --- Initial Load ---
    // Directly call updateVisualization with the full dataset
    console.log("Triggering initial visualization with full data range...");
    updateVisualization(allParsedData);

    // --- Attach Event Listeners AFTER initial setup ---
    setupEventListeners(); // Call function to attach listeners
  } catch (error) {
    console.error("Error loading or processing data:", error);
    // Display error messages in relevant containers
    if (calendarDiv)
      calendarDiv.innerHTML = `<p class="error-message">Error loading data. Check console.</p>`;
    if (filterInfoSpan) filterInfoSpan.textContent = "Error loading data";
    [
      topArtistsContainer,
      topTracksDiv,
      timeOfDayDiv,
      dayOfWeekDiv,
      streamgraphContainer,
      forceGraphContainer,
    ].forEach((el) => {
      if (el) el.innerHTML = `<p class="error-message">Error loading data.</p>`;
    });
    // Disable controls on error
    [
      wrappedYearSelect,
      startDateInput,
      endDateInput,
      applyRangeBtn,
      forceGraphSlider,
    ].forEach((el) => {
      if (el) el.disabled = true;
    });
  }
})(); // Immediately invoke the async function

// --- Tooltip Logic (Only used in plot mode) ---
const showTooltip = (event, content) => {
  if (USE_TEXT_MODE) return; // Don't show tooltips in text mode
  tooltipDiv
    .style("opacity", 1)
    .html(content)
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 20 + "px");
};
const moveTooltip = (event) => {
  if (USE_TEXT_MODE) return;
  tooltipDiv
    .style("left", event.pageX + 10 + "px")
    .style("top", event.pageY - 20 + "px");
};
const hideTooltip = () => {
  if (USE_TEXT_MODE) return;
  tooltipDiv.style("opacity", 0);
};

// --- Calendar Dragging Helper Functions (Only used in plot mode) ---
function getXFromDate(date, firstDayOfGrid, columnWidth) {
  if (
    !date ||
    !firstDayOfGrid ||
    isNaN(date) ||
    isNaN(firstDayOfGrid) ||
    !columnWidth ||
    columnWidth <= 0
  )
    return NaN;
  const startOfWeekGrid = d3.timeWeek.floor(firstDayOfGrid);
  const startOfWeekDate = d3.timeWeek.floor(date);
  // Handle dates before the grid start (shouldn't happen with correct filtering but safe)
  if (startOfWeekDate < startOfWeekGrid) return 0;
  const weekIndex = d3.timeWeek.count(startOfWeekGrid, startOfWeekDate);
  return weekIndex * columnWidth;
}

function getDateFromX(xPos, daysArray, firstDayOfGrid, columnWidth) {
  if (
    !daysArray ||
    daysArray.length === 0 ||
    !firstDayOfGrid ||
    !columnWidth ||
    columnWidth <= 0 ||
    xPos < -columnWidth / 2
  )
    return null;

  const startOfWeekGrid = d3.timeWeek.floor(firstDayOfGrid);
  const lastDayInArray = daysArray[daysArray.length - 1];
  const maxWeekIndex = d3.timeWeek.count(startOfWeekGrid, d3.timeWeek.floor(lastDayInArray));

  // Calculate the target week index based on the x position
  // Add half width to snap correctly when clicking between weeks
  const calculatedIndex = Math.floor((xPos + columnWidth / 2) / columnWidth);
  const weekIndex = Math.max(0, Math.min(calculatedIndex, maxWeekIndex));

  // Calculate the start date of the target week
  const targetWeekStartDate = d3.timeWeek.offset(startOfWeekGrid, weekIndex);

  // Find the *first* day within the daysArray that falls into the target week
  // This handles gaps in the calendar grid correctly
  let foundDate = null;
  for (const day of daysArray) {
      if (d3.timeWeek.floor(day).getTime() === targetWeekStartDate.getTime()) {
          foundDate = day;
          break; // Found the first day in that week
      }
  }

  // If no exact match found in that week (e.g., dragging beyond the last week with data)
  if (!foundDate) {
      const firstDayInArray = daysArray[0];
      if (targetWeekStartDate <= firstDayInArray) {
          return firstDayInArray; // Snap to the very beginning
      } else {
          return lastDayInArray; // Snap to the very end
      }
  }

  return foundDate;
}


// --- Filter Info Label Update (Used in both modes) ---
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

// --- Plotting Functions (Only called if USE_TEXT_MODE is false) ---

function drawCalendar(data, initialStartDate, initialEndDate) {
  calendarDiv.innerHTML = "";
  legendDiv.innerHTML = "";
  svgInstance = null;
  allDaysInCalendar = [];
  calendarStartDay = null;
  currentCalendarHeight = 0; // Reset plot-specific globals

  const listeningData = data.filter((d) => d.ms_played > 0);
  if (listeningData.length === 0) {
    if (calendarDiv)
      calendarDiv.innerHTML = `<p class="empty-message">No listening data for this period.</p>`;
    updateFilterInfoLabel(initialStartDate, initialEndDate); // Show the range even if empty
    return;
  }

  // Aggregate data by day
  const dailyData = d3.rollups(
    listeningData,
    (v) => d3.sum(v, (d) => d.ms_played / 60000), // Sum minutes played per day
    (d) => formatDay(d.ts) // Key by YYYY-MM-DD string
  );
  const valueMap = new Map(dailyData);

  // Ensure valid date range for the grid
  const dataStartDate = new Date(initialStartDate);
  const dataEndDate = new Date(initialEndDate);
  if (
    !dataStartDate || !dataEndDate || isNaN(dataStartDate) || isNaN(dataEndDate) || dataStartDate > dataEndDate
  ) {
    console.error("drawCalendar: Invalid date range provided.", dataStartDate, dataEndDate);
    if (calendarDiv) calendarDiv.innerHTML = `<p class="error-message">Invalid date range.</p>`;
    return;
  }

  // Calculate the range of days for the calendar grid (full months spanning the data)
  const firstDayOfMonthStart = d3.timeMonth.floor(dataStartDate);
  const lastDayOfMonthEnd = d3.timeMonth.offset(d3.timeMonth.floor(dataEndDate), 1); // End is exclusive
  allDaysInCalendar = d3.timeDays(firstDayOfMonthStart, lastDayOfMonthEnd);

  if (allDaysInCalendar.length === 0) {
    console.error("drawCalendar: No days generated for grid.");
    if (calendarDiv) calendarDiv.innerHTML = `<p class="error-message">Could not generate grid days.</p>`;
    return;
  }
  calendarStartDay = allDaysInCalendar[0]; // Store the first day shown in the grid

  // Calculate dimensions
  const endDay = allDaysInCalendar[allDaysInCalendar.length - 1];
  const months = d3.timeMonths(calendarStartDay, endDay);
  const weekCount = d3.timeWeek.count(calendarStartDay, endDay) + 1;
  cellWidthWithPadding = cellSize + cellPadding;
  const width = weekCount * cellWidthWithPadding + leftPadding + 20; // +20 for right padding
  currentCalendarHeight = 7 * cellWidthWithPadding;
  const height = currentCalendarHeight + topPadding + 30; // +30 for bottom padding/labels

  // Color scale based on max minutes in this view
  const maxMinutes = d3.max(valueMap.values()) || 1; // Default to 1 if no data
  calendarColorScale.domain([0, maxMinutes]);

  // Create SVG
  const svg = d3
    .select("#calendar")
    .append("svg")
    .attr("width", width) // Use calculated width/height for SVG element
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${leftPadding}, ${topPadding})`);
  svgInstance = svg; // Store SVG group reference

  // Day labels (S, M, T, W, T, F, S)
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  svg
    .selectAll(".day-label")
    .data(d3.range(7))
    .enter()
    .append("text")
    .attr("class", "day-label") // Add class for styling
    .attr("x", -15) // Position left of the grid
    .attr("y", (d) => d * cellWidthWithPadding + cellWidthWithPadding / 2) // Center vertically
    .attr("dy", "0.35em") // Vertical alignment tweak
    .style("text-anchor", "middle")
    .text((d) => dayLabels[d]);

  // Month labels
  svg
    .selectAll(".month-label")
    .data(months)
    .enter()
    .append("text")
    .attr("class", "month-label") // Add class for styling
    .attr("x", (d) => {
      // Position at the start of the first week of the month within the grid
       const firstWeekOfMonth = d3.timeWeek.floor(d);
       const firstVisibleDayOfMonth = d3.max([calendarStartDay, firstWeekOfMonth]);
       return getXFromDate(firstVisibleDayOfMonth, calendarStartDay, cellWidthWithPadding);
    })
    .attr("y", -10) // Position above the grid
    .text(formatMonth);

  // Calendar day cells
  const cells = svg
    .selectAll(".day-cell")
    .data(allDaysInCalendar)
    .enter()
    .append("rect")
    .attr("class", "day-cell") // Add class for styling
    .attr("width", cellSize)
    .attr("height", cellSize)
    .attr("rx", 2) // Rounded corners
    .attr("ry", 2)
    .attr("x", (d) => getXFromDate(d, calendarStartDay, cellWidthWithPadding))
    .attr("y", (d) => d.getDay() * cellWidthWithPadding)
    .attr("fill", (d) => { // Initial fill based on data
        const key = formatDay(d);
        const value = valueMap.get(key);
        return value === undefined || value <= 0 ? noDataColor : calendarColorScale(value);
    })
    .attr("stroke", "#fff") // Light border for separation
    .attr("stroke-width", 0.5)
     .style("cursor", "pointer") // Indicate interactivity
    .on("mouseover", (event, d) => {
      if (USE_TEXT_MODE) return;
      const key = formatDay(d);
      const valueMins = valueMap.get(key) || 0;
      showTooltip(event, `${formatDate(d)}<br><b>Listened: ${formatTime(valueMins)}</b>`);
      d3.select(event.currentTarget).attr("stroke", "#333").attr("stroke-width", 1.5); // Highlight border
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", (event) => {
      if (USE_TEXT_MODE) return;
      hideTooltip();
      d3.select(event.currentTarget).attr("stroke", "#fff").attr("stroke-width", 0.5); // Restore border
    });

  // Draw Legend
  drawLegend(legendDiv, calendarColorScale, maxMinutes);

  // Set initial selection state for dragging (full range of this view)
  selectedStartDate = dataStartDate;
  selectedEndDate = dataEndDate;

  // Draw draggable handles
  if (!USE_TEXT_MODE) { // Only draw handles in plot mode
      drawHandles(selectedStartDate, selectedEndDate);
  }
  updateFilterInfoLabel(selectedStartDate, selectedEndDate); // Update label initially
}

function drawHandles(startDate, endDate) {
  if (USE_TEXT_MODE || !svgInstance || !calendarStartDay || !startDate || !endDate || isNaN(startDate) || isNaN(endDate) || currentCalendarHeight <= 0) return;

  // Calculate X positions for handles
  const startX = getXFromDate(startDate, calendarStartDay, cellWidthWithPadding);
  // Position end handle AFTER the last selected day's column
  const endHandleDateForPositioning = d3.timeDay.offset(endDate, 1);
  // Ensure end handle doesn't go before start handle if selection is single day
   const safeEndPosDate = endHandleDateForPositioning <= startDate ? d3.timeDay.offset(startDate, 1) : endHandleDateForPositioning;
  let endX = getXFromDate(safeEndPosDate, calendarStartDay, cellWidthWithPadding);

  // Fallback if end date is somehow outside the grid calculation
   if (isNaN(endX)) {
       endX = getXFromDate(endDate, calendarStartDay, cellWidthWithPadding) + cellWidthWithPadding;
   }
   // Ensure endX is at least slightly after startX
   endX = Math.max(endX, startX + handleWidth);

  if (isNaN(startX) || isNaN(endX)) {
    console.error("drawHandles: NaN X position calculated.", { startX, endX });
    return;
  }

  // --- Start Handle ---
  let startHandleGroup = svgInstance.select(".start-handle-group");
  if (startHandleGroup.empty()) {
    startHandleGroup = svgInstance.append("g").attr("class", "start-handle-group");
    // Visible handle line
    startHandleGroup.append("line")
      .attr("class", "drag-handle start-handle")
      .attr("y1", -cellPadding) // Extend slightly above/below cells
      .attr("stroke", handleColor)
      .attr("stroke-width", handleWidth)
      .attr("stroke-linecap", "round");
    // Invisible wider grab area
    startHandleGroup.append("line")
      .attr("class", "drag-grab-area")
      .attr("y1", -cellPadding)
      .attr("stroke", "transparent")
      .attr("stroke-width", handleGrabAreaWidth)
      .style("cursor", "ew-resize");
  }
  // Position and set height
  startHandleGroup
    .attr("transform", `translate(${startX}, 0)`)
    .selectAll("line")
    .attr("y2", currentCalendarHeight + cellPadding); // Extend slightly below cells

  // Attach drag behavior
  startHandleGroup.raise().on(".drag", null).call(
    d3.drag()
      .on("start", handleDragStart)
      .on("drag", (event) => handleDrag(event, "start"))
      .on("end", handleDragEndPlot) // Use plot-specific end handler
  );

  // --- End Handle ---
  let endHandleGroup = svgInstance.select(".end-handle-group");
  if (endHandleGroup.empty()) {
    endHandleGroup = svgInstance.append("g").attr("class", "end-handle-group");
    // Visible handle line
    endHandleGroup.append("line")
      .attr("class", "drag-handle end-handle")
      .attr("y1", -cellPadding)
      .attr("stroke", handleColor)
      .attr("stroke-width", handleWidth)
      .attr("stroke-linecap", "round");
    // Invisible wider grab area
    endHandleGroup.append("line")
      .attr("class", "drag-grab-area")
      .attr("y1", -cellPadding)
      .attr("stroke", "transparent")
      .attr("stroke-width", handleGrabAreaWidth)
      .style("cursor", "ew-resize");
  }
  // Position and set height
  endHandleGroup
    .attr("transform", `translate(${endX}, 0)`)
    .selectAll("line")
    .attr("y2", currentCalendarHeight + cellPadding);

  // Attach drag behavior
  endHandleGroup.raise().on(".drag", null).call(
    d3.drag()
      .on("start", handleDragStart)
      .on("drag", (event) => handleDrag(event, "end"))
      .on("end", handleDragEndPlot) // Use plot-specific end handler
  );

  // Update the highlight rectangle
  updateHighlightRect();
}

function handleDragStart(event) {
  if (USE_TEXT_MODE || !svgInstance) return;
  d3.select(this).raise().select(".drag-handle").attr("stroke", "black").attr("stroke-opacity", 0.7);
  svgInstance.select(".highlight-rect")?.raise(); // Ensure highlight is below handles
  svgInstance.selectAll(".start-handle-group, .end-handle-group").raise(); // Ensure handles are on top
}

function handleDrag(event, handleType) {
  if (USE_TEXT_MODE || !svgInstance || !calendarStartDay || allDaysInCalendar.length === 0 || !selectedStartDate || !selectedEndDate || currentCalendarHeight <= 0) return;

  const currentX = event.x;
  // Find the date corresponding to the dragged position
  let targetDate = getDateFromX(currentX, allDaysInCalendar, calendarStartDay, cellWidthWithPadding);

  if (!targetDate || isNaN(targetDate)) return; // Invalid date from position

  // Clamp target date to the bounds of the calendar grid
  const minDate = allDaysInCalendar[0];
  const maxDate = allDaysInCalendar[allDaysInCalendar.length - 1];
  targetDate = targetDate < minDate ? minDate : targetDate > maxDate ? maxDate : targetDate;

  let snappedX; // The X position corresponding to the snapped date
  let newStartDate = selectedStartDate;
  let newEndDate = selectedEndDate;
  let groupToMove;

  if (handleType === "start") {
    // Start handle cannot go past end handle
    targetDate = d3.min([targetDate, selectedEndDate]);
    newStartDate = targetDate;
    snappedX = getXFromDate(newStartDate, calendarStartDay, cellWidthWithPadding);
    groupToMove = svgInstance.select(".start-handle-group");
  } else { // handleType === 'end'
    // End handle cannot go before start handle
    targetDate = d3.max([targetDate, selectedStartDate]);
    newEndDate = targetDate;
    // Calculate position for end handle (after the selected day's column)
    const endHandleDateForPositioning = d3.timeDay.offset(newEndDate, 1);
    const safeEndPosDate = endHandleDateForPositioning <= newStartDate ? d3.timeDay.offset(newStartDate, 1) : endHandleDateForPositioning;
    snappedX = getXFromDate(safeEndPosDate, calendarStartDay, cellWidthWithPadding);
     // Fallback if end date is somehow outside grid
    if (isNaN(snappedX)) {
       snappedX = getXFromDate(newEndDate, calendarStartDay, cellWidthWithPadding) + cellWidthWithPadding;
    }
    // Ensure end handle X is visually after start handle X
    const startXForCompare = getXFromDate(newStartDate, calendarStartDay, cellWidthWithPadding);
    if (!isNaN(startXForCompare) && !isNaN(snappedX)) {
       snappedX = Math.max(snappedX, startXForCompare + handleWidth);
    } else if (isNaN(snappedX)) {
       console.error("handleDrag (End): Invalid snappedX calculation.");
       return; // Don't move if calculation fails
    }
    groupToMove = svgInstance.select(".end-handle-group");
  }

  // Move the handle group visually if snappedX is valid
  if (!isNaN(snappedX)) {
      groupToMove.attr("transform", `translate(${snappedX}, 0)`);
  } else {
       console.error(`handleDrag (${handleType}): Invalid snappedX.`);
  }

  // Update global selection state
  selectedStartDate = newStartDate;
  selectedEndDate = newEndDate;

  updateHighlightRect(); // Update visual highlight area
  updateFilterInfoLabel(selectedStartDate, selectedEndDate); // Update text label in real-time
}

// --- Plot Mode Drag End Handler --- (Needs to be defined before setupEventListeners)
function handleDragEndPlot(event) {
  if (USE_TEXT_MODE) return; // Do nothing if in text mode

  // Style handle back
  if (svgInstance) {
    d3.select(this)
      .select(".drag-handle")
      .attr("stroke", handleColor)
      .attr("stroke-opacity", 1.0);
  }

  // Update date inputs (useful feedback)
  if (startDateInput && selectedStartDate)
    startDateInput.value = formatDateForInput(selectedStartDate);
  if (endDateInput && selectedEndDate)
    endDateInput.value = formatDateForInput(selectedEndDate);

  // Filter data for the dragged selection and update dependent plots
  // Crucially, use the filterDataAndUpdateCharts which calls handleBrushUpdate (plot updates)
  filterDataAndUpdateCharts(selectedStartDate, selectedEndDate);
}

// Assign the correct drag end handler (needed for d3.drag().on('end', ...))
const handleDragEnd = handleDragEndPlot; // Make sure handleDragEnd refers to the plot version


function updateHighlightRect() {
  if (USE_TEXT_MODE || !svgInstance || !selectedStartDate || !selectedEndDate || !calendarStartDay || isNaN(selectedStartDate) || isNaN(selectedEndDate) || currentCalendarHeight <= 0) {
    svgInstance?.select(".highlight-rect").remove();
    return;
  }

  let highlightRect = svgInstance.select(".highlight-rect");
  if (highlightRect.empty()) {
    highlightRect = svgInstance.insert("rect", ":first-child") // Insert behind cells/handles
      .attr("class", "highlight-rect")
      .attr("fill", highlightColor)
      .attr("pointer-events", "none");
  }

  // Calculate X positions based on current selection
  const startX = getXFromDate(selectedStartDate, calendarStartDay, cellWidthWithPadding);
  const endHandleDateForPositioning = d3.timeDay.offset(selectedEndDate, 1);
   const safeEndPosDate = endHandleDateForPositioning <= selectedStartDate ? d3.timeDay.offset(selectedStartDate, 1) : endHandleDateForPositioning;
  let endX = getXFromDate(safeEndPosDate, calendarStartDay, cellWidthWithPadding);
   if (isNaN(endX)) {
       endX = getXFromDate(selectedEndDate, calendarStartDay, cellWidthWithPadding) + cellWidthWithPadding;
   }
   endX = Math.max(endX, startX); // Ensure endX >= startX

  if (isNaN(startX) || isNaN(endX) || isNaN(currentCalendarHeight)) {
    console.warn("updateHighlightRect: Invalid dimensions, removing rect.", {startX, endX, currentCalendarHeight});
    highlightRect.remove();
    return;
  }

  // Update rectangle position and size
  highlightRect
    .attr("x", startX)
    .attr("y", 0) // Align with top of cells
    .attr("width", Math.max(0, endX - startX)) // Ensure non-negative width
    .attr("height", currentCalendarHeight); // Span full height of day cells
}

function drawLegend(container, scale, maxValue) {
  container.innerHTML = ""; // Clear previous legend
  if (USE_TEXT_MODE || maxValue === undefined || maxValue <= 0) return; // Don't draw in text mode or if no max value

  const legendWidth = 200, legendHeight = 20;
  const legendMargin = { top: 0, right: 10, bottom: 15, left: 10 };
  const barHeight = 8;

  const legendSvg = d3.select(container)
    .append("svg")
    .attr("width", legendWidth)
    .attr("height", legendHeight + legendMargin.top + legendMargin.bottom);

  const legendDefs = legendSvg.append("defs");

  // Create the linear gradient
  const linearGradient = legendDefs.append("linearGradient")
      .attr("id", "calendar-gradient");

  // Get the interpolator function from the scale
  const interpolator = typeof scale.interpolator === 'function'
      ? scale.interpolator()
      : (t) => scale(scale.domain()[0] + t * (scale.domain()[1] - scale.domain()[0])); // Fallback for sequential scale

  // Create color stops for the gradient
  const numStops = 10;
  linearGradient.selectAll("stop")
    .data(d3.range(numStops + 1))
    .enter().append("stop")
    .attr("offset", d => `${(d / numStops) * 100}%`)
    .attr("stop-color", d => interpolator(d / numStops)); // Use interpolator directly

  // Draw the gradient rectangle
  legendSvg.append("rect")
      .attr("x", legendMargin.left)
      .attr("y", legendMargin.top)
      .attr("width", legendWidth - legendMargin.left - legendMargin.right)
      .attr("height", barHeight)
      .style("fill", "url(#calendar-gradient)")
      .attr("rx", 2).attr("ry", 2); // Slightly rounded ends

  // Add labels
  legendSvg.append("text")
      .attr("class", "legend-label")
      .attr("x", legendMargin.left)
      .attr("y", legendMargin.top + barHeight + 10) // Position below bar
      .attr("text-anchor", "start")
      .text("Less");

  legendSvg.append("text")
      .attr("class", "legend-label")
      .attr("x", legendWidth - legendMargin.right)
      .attr("y", legendMargin.top + barHeight + 10) // Position below bar
      .attr("text-anchor", "end")
      .text("More");
}


// Plotting functions for other charts
function updateTopArtists(data) {
  const placeholderImg = "https://via.placeholder.com/100"; // URL for placeholder image
  const targetContainer = document.getElementById("top-artists-chart"); // Target the DIV container
  if (!targetContainer) {
    console.error("Top artists container not found.");
    return;
  }
  targetContainer.innerHTML = ""; // Clear previous content

  if (!data || data.length === 0) {
    targetContainer.innerHTML = `<p class="empty-message">No data.</p>`;
    return;
  }

  // Aggregate listening time per artist
  const artistData = d3
    .rollups(
      data.filter(
        (d) => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0
      ), // Filter valid artists with playtime
      (v) => d3.sum(v, (d) => d.ms_played / 60000), // Sum minutes played
      (d) => d.artist // Group by artist name
    )
    .sort((a, b) => d3.descending(a[1], b[1])) // Sort descending by minutes
    .slice(0, 5); // Take top 5

  if (artistData.length === 0) {
    targetContainer.innerHTML = `<p class="empty-message">No artist data in this period.</p>`;
    return;
  }

  // Create an ordered list inside the container
  const list = document.createElement("ol");
  list.classList.add('top-list'); // Add general styling class
  targetContainer.appendChild(list);

  // Process each top artist
  artistData.forEach(([artist, totalMinutes], index) => {
    const li = document.createElement("li");
    li.classList.add('top-list-item'); // Add item styling class

    // Find *any* track entry for this artist with a valid Spotify track URI to fetch album art
    const trackWithUri = data.find(
      (d) =>
        d.artist === artist &&
        d.spotify_track_uri &&
        d.spotify_track_uri.startsWith("spotify:track:")
    );

    // Function to render the list item content (used as callback for fetch)
    const renderContent = (imgUrl) => {
      li.innerHTML = `
          <span class="top-list-rank">${index + 1}.</span>
          <img src="${imgUrl}" alt="${artist}" class="top-list-img" />
          <span class="top-list-name">${artist}</span>
          <span class="top-list-time">(${formatTime(totalMinutes)})</span>
        `;
       list.appendChild(li); // Append AFTER innerHTML is set
    };

    // Fetch album art using oEmbed if a track URI was found
    if (trackWithUri) {
      const trackId = trackWithUri.spotify_track_uri.split(":")[2];
      const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;

      fetch(oEmbedUrl)
        .then(res => res.ok ? res.json() : Promise.reject('oEmbed fetch failed')) // Check if fetch was successful
        .then(embedData => {
          renderContent(embedData?.thumbnail_url || placeholderImg); // Use fetched URL or fallback
        })
        .catch(error => {
          console.warn(`oEmbed fetch failed for ${artist}:`, error);
          renderContent(placeholderImg); // Fallback on error
        });
    } else {
      // If no track URI found for this artist, use placeholder immediately
      renderContent(placeholderImg);
    }
  });
}


function updateTopTracksChart2(data) {
   const targetDiv = document.getElementById("top-tracks-chart");
   if (!targetDiv) return;
   targetDiv.innerHTML = ""; // Clear previous content

   if (!requiredColumns.track_name) {
     targetDiv.innerHTML = `<p class="error-message">Track name data missing.</p>`;
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
       (v) => ({
           totalMinutes: d3.sum(v, d => d.ms_played / 60000),
           // Store one spotify_track_uri if available for image fetching
           uri: v.find(i => i.spotify_track_uri?.startsWith("spotify:track:"))?.spotify_track_uri
       }),
       (d) => `${d.track} • ${d.artist}` // Group by track + artist
     )
     .sort(([, a], [, b]) => d3.descending(a.totalMinutes, b.totalMinutes)) // Sort by totalMinutes
     .slice(0, 5); // Take top 5

   if (trackData.length === 0) {
     targetDiv.innerHTML = `<p class="empty-message">No track data in period.</p>`;
     return;
   }

   const list = d3.select(targetDiv).append("ol")
     .attr("class", "top-list top-tracks-sparkline-list"); // Add classes

   const maxMinutes = trackData[0]?.[1]?.totalMinutes || 1; // Max time for scaling
   const sparklineWidth = 80;
   const sparklineHeight = 12;
   const sparklineScale = d3.scaleLinear().domain([0, maxMinutes]).range([0, sparklineWidth]);
   const placeholderImg = "https://via.placeholder.com/100"; // Define placeholder

   const items = list.selectAll("li")
     .data(trackData)
     .join("li")
     .attr('class', 'top-list-item'); // Add item class

    // Process each track item asynchronously to fetch image
    items.each(function([trackArtistKey, trackInfo], i) {
        const li = d3.select(this);
        const parts = trackArtistKey.split("•");
        const trackName = parts[0]?.trim() || "Unknown Track";
        const artistName = parts[1]?.trim() || "Unknown Artist";

        const renderContent = (imgUrl) => {
             li.html(`
                <span class="top-list-rank">${i + 1}.</span>
                <img src="${imgUrl}" alt="${trackName}" class="top-list-img" />
                <span class="top-list-info">
                    <span class="top-list-name">${trackName}</span>
                    <span class="top-list-artist">${artistName}</span>
                </span>
                <span class="time-sparkline-container">
                     <span class="top-list-time">(${formatTime(trackInfo.totalMinutes)})</span>
                     <svg class="sparkline" width="${sparklineWidth}" height="${sparklineHeight}">
                         <rect x="0" y="0" width="${Math.max(0, sparklineScale(trackInfo.totalMinutes))}" height="${sparklineHeight}" fill="#1DB954" rx="1" ry="1"></rect>
                     </svg>
                </span>
             `);

            // Add tooltip to the sparkline rect after rendering
            li.select('.sparkline rect')
                .on("mouseover", (event) => showTooltip(event, `<b>${trackName}</b><br>${formatTime(trackInfo.totalMinutes)}`))
                .on("mousemove", moveTooltip)
                .on("mouseout", hideTooltip);
        };

         // Fetch image using the stored URI
        if (trackInfo.uri) {
            const trackId = trackInfo.uri.split(":")[2];
            const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
            fetch(oEmbedUrl)
                .then(res => res.ok ? res.json() : Promise.reject('oEmbed fetch failed'))
                .then(embedData => renderContent(embedData?.thumbnail_url || placeholderImg))
                .catch(error => {
                    console.warn(`oEmbed failed for ${trackName}:`, error);
                    renderContent(placeholderImg);
                });
        } else {
            renderContent(placeholderImg); // Use placeholder if no URI
        }
    });
}


function updateTimeOfDayChart(data) {
  const targetDiv = document.getElementById("time-of-day-chart");
  if (!targetDiv) return;
  targetDiv.innerHTML = "";
  if (!data || data.length === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No data.</p>`;
    return;
  }

  // Aggregate minutes played per hour
  const hourData = d3.rollups(
    data.filter((d) => d.ms_played > 0),
    (v) => d3.sum(v, (d) => d.ms_played / 60000),
    (d) => d.ts.getHours() // Group by hour (0-23)
  );
  const hourMap = new Map(hourData);

  // Ensure all 24 hours are present, defaulting to 0 if no data
  const completeHourData = d3.range(24).map((h) => [h, hourMap.get(h) || 0]);

  // Chart dimensions based on parent container
  const containerWidth = targetDiv.parentElement?.clientWidth || 400;
  const chartWidth = containerWidth; // Use full container width
  const chartHeight = 250; // Fixed height
  const width = chartWidth - chartMargin.left - chartMargin.right;
  const height = chartHeight - chartMargin.top - chartMargin.bottom;

  if (width <= 0 || height <= 0) {
    targetDiv.innerHTML = `<p class="error-message">Chart container is too small.</p>`;
    return;
  }

  // Create SVG
  const svg = d3.select(targetDiv).append("svg")
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`) // Responsive SVG
    .attr("preserveAspectRatio", "xMinYMid meet")
    .append("g")
    .attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);

  // Scales
  const x = d3.scaleBand()
    .range([0, width])
    .domain(d3.range(24)) // Domain is 0-23 hours
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(completeHourData, d => d[1]) || 1]) // Max minutes or 1
    .range([height, 0])
    .nice(); // Adjust domain for nicer ticks

  // X Axis
  svg.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x)
        .tickValues(d3.range(0, 24, 3)) // Show ticks every 3 hours (0, 3, 6...)
        .tickFormat(d => `${d}:00`) // Format as H:00
     )
    .append("text") // X axis label
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", chartMargin.bottom - 15) // Position below axis line
      .attr("text-anchor", "middle")
      .text("Hour of Day");

  // Y Axis
  svg.append("g")
    .attr("class", "axis axis--y")
    .call(d3.axisLeft(y)
        .ticks(5) // Suggest 5 ticks
        .tickFormat(formatTime) // Use custom time formatter
     )
    .append("text") // Y axis label
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - chartMargin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em") // Adjust vertical position
      .attr("text-anchor", "middle")
      .text("Total Listening Time");

  // Bars
  svg.selectAll(".bar")
    .data(completeHourData)
    .enter().append("rect")
      .attr("class", "bar time-of-day-bar") // Add specific class
      .attr("x", d => x(d[0]))
      .attr("width", x.bandwidth())
      .attr("y", height) // Start from bottom for transition
      .attr("height", 0)
      .attr("fill", "#fd7e14") // Use a distinct color
      .on("mouseover", (event, d) => showTooltip(event, `<b>Hour ${d[0]}</b><br>${formatTime(d[1])}`))
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip)
    .transition() // Animate height
      .duration(500)
      .attr("y", d => y(d[1]))
      .attr("height", d => Math.max(0, height - y(d[1]))); // Use Math.max for safety
}


function updateDayOfWeekChart(data) {
  const targetDiv = document.getElementById("day-of-week-chart");
  if (!targetDiv) return;
  targetDiv.innerHTML = "";
  if (!data || data.length === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No data.</p>`;
    return;
  }

  // Aggregate minutes played per day of week
  const dayData = d3.rollups(
    data.filter((d) => d.ms_played > 0),
    (v) => d3.sum(v, (d) => d.ms_played / 60000),
    (d) => d.ts.getDay() // Group by day index (0=Sun, 6=Sat)
  );
  const dayMap = new Map(dayData);

  // Ensure all 7 days are present, defaulting to 0
  const completeDayData = d3.range(7).map((dayIndex) => [dayIndex, dayMap.get(dayIndex) || 0]);

   // Chart dimensions
  const containerWidth = targetDiv.parentElement?.clientWidth || 400;
  const chartWidth = containerWidth;
  const chartHeight = 250;
  const width = chartWidth - chartMargin.left - chartMargin.right;
  const height = chartHeight - chartMargin.top - chartMargin.bottom;

  if (width <= 0 || height <= 0) {
    targetDiv.innerHTML = `<p class="error-message">Chart container is too small.</p>`;
    return;
  }

  // Create SVG
  const svg = d3.select(targetDiv).append("svg")
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
    .attr("preserveAspectRatio", "xMinYMid meet")
    .append("g")
    .attr("transform", `translate(${chartMargin.left}, ${chartMargin.top})`);

  // Scales
  const x = d3.scaleBand()
    .range([0, width])
    .domain(d3.range(7)) // Domain 0-6 for days
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(completeDayData, d => d[1]) || 1])
    .range([height, 0])
    .nice();

  // X Axis
  svg.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickFormat(d => dayOfWeekNames[d])) // Use day names
    .append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", chartMargin.bottom - 15)
      .attr("text-anchor", "middle")
      .text("Day of Week");

  // Y Axis
  svg.append("g")
    .attr("class", "axis axis--y")
    .call(d3.axisLeft(y).ticks(5).tickFormat(formatTime))
    .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - chartMargin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
      .text("Total Listening Time");

  // Bars
  svg.selectAll(".bar")
    .data(completeDayData)
    .enter().append("rect")
      .attr("class", "bar day-of-week-bar") // Add specific class
      .attr("x", d => x(d[0]))
      .attr("width", x.bandwidth())
      .attr("y", height) // Start from bottom
      .attr("height", 0)
      .attr("fill", "#6f42c1") // Use another distinct color
      .on("mouseover", (event, d) => showTooltip(event, `<b>${dayOfWeekNames[d[0]]}</b><br>${formatTime(d[1])}`))
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip)
    .transition() // Animate height
      .duration(500)
      .attr("y", d => y(d[1]))
      .attr("height", d => Math.max(0, height - y(d[1])));
}


async function drawStreamgraph(filteredData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = ""; // Clear previous content

  if (!filteredData || filteredData.length === 0) {
    container.innerHTML = '<p class="empty-message">No data for streamgraph.</p>';
    // Optionally update description
    return;
  }

  // Classify data as Music or Podcast
  const streamDataProcessed = filteredData
    .map((d) => {
      // Simple check: if episode_name exists and is not empty, it's a podcast
      let contentType = (d.episode_name && String(d.episode_name).trim() !== "") ? "Podcast" : "Music";
      // Add audiobook check if needed:
      // if (d.audiobook_title && String(d.audiobook_title).trim() !== "") contentType = "Audiobook";
      return { ...d, contentType: contentType };
    })
    .filter((d) => d.ms_played > 0); // Only include items with playtime

  if (streamDataProcessed.length === 0) {
    container.innerHTML = '<p class="empty-message">No Music/Podcast data with playtime found.</p>';
    return;
  }

  const contentTypes = ["Music", "Podcast"]; // Define the layers (add "Audiobook" if needed)
  const [minDate, maxDate] = d3.extent(streamDataProcessed, (d) => d.ts);

   // Determine time aggregation level based on range
  const timeDiffDays = maxDate && minDate ? (maxDate - minDate) / (1000 * 60 * 60 * 24) : 0;
   // More granular for shorter periods, daily for longer
  const timeAggregator = timeDiffDays > 90 ? d3.timeWeek.floor : // Weekly for > 3 months
                         timeDiffDays > 7 ? d3.timeDay.floor :   // Daily for > 1 week
                         d3.timeHour.floor;                      // Hourly for <= 1 week

  // Aggregate data by time bins and content type (calculating proportions)
  const aggregatedData = Array.from(
    d3.group(streamDataProcessed, (d) => timeAggregator(d.ts)), // Group by time bin
    ([timeBin, values]) => {
      const entry = { timeBin: new Date(timeBin) }; // Store the date object
      let totalMsPlayedInBin = 0;
      contentTypes.forEach((type) => (entry[type] = 0)); // Initialize counts for types

      // Sum ms_played for each type within the bin
      values.forEach((v) => {
        if (entry.hasOwnProperty(v.contentType)) {
          entry[v.contentType] += v.ms_played;
          totalMsPlayedInBin += v.ms_played;
        }
      });

      // Calculate proportion for each type (handle division by zero)
      contentTypes.forEach((type) => {
        entry[type] = totalMsPlayedInBin > 0 ? entry[type] / totalMsPlayedInBin : 0;
      });
      return entry;
    }
  ).sort((a, b) => a.timeBin - b.timeBin); // Ensure data is sorted by time

  if (aggregatedData.length === 0) {
    container.innerHTML = '<p class="empty-message">No aggregated data for streamgraph.</p>';
    return;
  }

  // Chart dimensions
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const containerWidth = container.clientWidth || 800;
  const height = 300 - margin.top - margin.bottom; // Fixed height
  const width = containerWidth - margin.left - margin.right;

  if (width <= 0 || height <= 0) {
    container.innerHTML = `<p class="error-message">Chart container too small.</p>`;
    return;
  }

  // Create SVG
  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${containerWidth} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMinYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Scales
  const xScale = d3.scaleTime()
    .domain(d3.extent(aggregatedData, d => d.timeBin)) // Use actual min/max time bins
    .range([0, width]);

  const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]); // Proportions 0% to 100%

  // Color scale for layers
  const colorMap = { Music: "#1DB954", Podcast: "#6f42c1" /* Add Audiobook color if needed */ };
  const colorScale = d3.scaleOrdinal()
    .domain(contentTypes)
    .range(contentTypes.map(type => colorMap[type] || "#cccccc")); // Default color

  // Stacking function (use stackOffsetExpand for proportions)
  const stack = d3.stack()
    .keys(contentTypes)
    .offset(d3.stackOffsetExpand) // Normalize to proportions [0, 1]
    .order(d3.stackOrderNone); // Maintain specified order

  let series;
  try {
      series = stack(aggregatedData);
  } catch(error) {
      console.error("Streamgraph stacking error:", error, aggregatedData);
      container.innerHTML = '<p class="error-message">Error creating stack layers.</p>';
      return;
  }

  if (!series || series.length === 0 || !series[0] || series[0].length === 0) {
    container.innerHTML = '<p class="empty-message">No stack layers generated.</p>';
    return;
  }

  // Area generator
  const areaGen = d3.area()
    .x(d => xScale(d.data.timeBin))
    .y0(d => yScale(d[0])) // Bottom of area slice
    .y1(d => yScale(d[1])) // Top of area slice
    .curve(d3.curveBasis); // Smooth curves

  // Draw layers
  svg.selectAll(".stream-layer")
    .data(series)
    .enter().append("path")
      .attr("class", d => `stream-layer ${String(d.key).toLowerCase()}-layer`) // Class for styling/selection
      .attr("d", areaGen)
      .attr("fill", d => colorScale(d.key))
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.5)
      .on("mouseover", (event, d_layer) => { // Tooltip on layer hover
          // Find the closest data point in time to the mouse position
          const [xPos] = d3.pointer(event);
          const hoveredTime = xScale.invert(xPos);
          const bisectDate = d3.bisector(d => d.data.timeBin).left;
          const index = bisectDate(d_layer, hoveredTime, 1);
          const d0 = d_layer[index - 1];
          const d1 = d_layer[index];
          const d_point = (d1 && (hoveredTime - d0.data.timeBin > d1.data.timeBin - hoveredTime)) ? d1 : d0;

          if (d_point) {
             const percentage = (d_point[1] - d_point[0]) * 100;
             const timeFormatted = d3.timeFormat(timeDiffDays > 1 ? "%a %b %d, %H:%M" : "%H:%M")(d_point.data.timeBin);
             showTooltip(event, `<b>${d_layer.key}</b><br>${timeFormatted}<br>${percentage.toFixed(1)}%`);
          }
          d3.select(event.currentTarget).attr('fill-opacity', 0.85); // Highlight layer
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", (event) => {
          hideTooltip();
          d3.select(event.currentTarget).attr('fill-opacity', 1); // Restore opacity
      });

  // X Axis (adjust ticks based on time range)
   let xAxisTicks;
   if (timeDiffDays <= 1) xAxisTicks = d3.timeHour.every(3);
   else if (timeDiffDays <= 7) xAxisTicks = d3.timeDay.every(1);
   else if (timeDiffDays <= 90) xAxisTicks = d3.timeWeek.every(1);
   else xAxisTicks = d3.timeMonth.every(1);

  svg.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale)
        .ticks(xAxisTicks)
        .tickFormat(d3.timeFormat(timeDiffDays > 30 ? "%b %Y" : // Month/Year for long range
                                   timeDiffDays > 1 ? "%a %d" :   // Day Abbr/Num for medium
                                   "%H:%M"                  // Hour/Min for short
                   ))
     )
    .append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", margin.bottom - 10)
      .attr("text-anchor", "middle")
      .text("Date / Time");

  // Y Axis (Percentage)
  svg.append("g")
    .attr("class", "axis axis--y")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".0%"))) // Format as percentage
    .append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
      .text("Listening Time Rate (%)");

  // Legend
  const legendContainer = svg.append("g")
    .attr("class", "streamgraph-legend")
    .attr("transform", `translate(${width - 100}, ${-10})`); // Position top-right

  const legendItems = legendContainer.selectAll(".legend-item")
    .data(contentTypes)
    .enter().append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 15})`); // Stack vertically

  legendItems.append("rect")
    .attr("x", 0).attr("y", 0)
    .attr("width", 10).attr("height", 10)
    .attr("fill", d => colorScale(d));

  legendItems.append("text")
    .attr("x", 15).attr("y", 5) // Position text next to color swatch
    .attr("dy", "0.35em")
    .style("font-size", "10px")
    .text(d => d);

  // Update description
   const descriptionElement = container.nextElementSibling;
   if (descriptionElement && descriptionElement.classList.contains('chart-description')) {
       descriptionElement.innerHTML = 'Proportional listening rate (%) between Music and Podcasts over time.';
   }
}


async function drawForceGraph2(filteredData, containerId, topN = 10) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`ForceGraph Error: Container #${containerId} not found.`);
    return;
  }
  container.innerHTML = ""; // Clear previous graph

  if (!filteredData || filteredData.length < 2) {
    container.innerHTML = '<p class="empty-message">Not enough data for transitions.</p>';
    return;
  }

  // Filter for music plays with known artists and sort by time
  const musicData = filteredData
    .filter((d) => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0 && !d.episode_name) // Exclude podcasts
    .sort((a, b) => a.ts - b.ts); // Crucial: sort by timestamp

  if (musicData.length < 2) {
    container.innerHTML = '<p class="empty-message">Not enough music plays for transitions.</p>';
    return;
  }

  // Find the top N artists based on *play count* in the filtered data
  const artistCounts = d3.rollup(musicData, (v) => v.length, (d) => d.artist);
  const topArtistsSet = new Set(
    Array.from(artistCounts.entries())
      .sort(([, countA], [, countB]) => countB - countA) // Sort by count descending
      .slice(0, topN) // Take top N
      .map(([artist]) => artist) // Get just the artist names
  );

  if (topArtistsSet.size < 2) {
    container.innerHTML = `<p class="empty-message">Fewer than 2 top artists found (need at least 2 for transitions).</p>`;
    return;
  }

  // Calculate transitions between the TOP N artists ONLY
  const transitions = new Map();
  for (let i = 0; i < musicData.length - 1; i++) {
    const sourceArtist = musicData[i].artist;
    const targetArtist = musicData[i + 1].artist;

    // Check if BOTH source and target are in the top N set and are different
    if (topArtistsSet.has(sourceArtist) && topArtistsSet.has(targetArtist) && sourceArtist !== targetArtist) {
      const key = `${sourceArtist}:::${targetArtist}`; // Unique key for transition direction
      transitions.set(key, (transitions.get(key) || 0) + 1); // Increment count
    }
  }

  if (transitions.size === 0) {
    container.innerHTML = '<p class="empty-message">No transitions found between the selected top artists.</p>';
    return;
  }

  // Prepare nodes and links for the force simulation
  const nodes = Array.from(topArtistsSet).map((artist) => ({
    id: artist,
    playCount: artistCounts.get(artist) || 0, // Get play count for sizing/coloring
  }));

  const links = Array.from(transitions.entries()).map(([key, count]) => {
    const [source, target] = key.split(":::");
    return { source: source, target: target, value: count }; // value = transition count
  });

  // Chart dimensions
  const margin = { top: 10, right: 10, bottom: 10, left: 10 };
  const containerWidth = container.clientWidth || 600;
  const containerHeight = 400; // Fixed height or calculate based on container
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  if (width <= 0 || height <= 0) {
    container.innerHTML = '<p class="error-message">Chart container too small.</p>';
    return;
  }

  // Create SVG
  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
    .attr("preserveAspectRatio", "xMinYMid meet")
    .style("max-width", "100%")
    .style("height", "auto"); // Make SVG responsive

  const mainGroup = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
  const zoomableGroup = mainGroup.append("g"); // Group for zooming/panning

  // Add background rect for zoom events ONLY if not in text mode
  if (!USE_TEXT_MODE) {
      mainGroup.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all"); // Capture all pointer events for zoom
  }

  // Arrowhead definition
  zoomableGroup.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "-0 -5 10 10")
    .attr("refX", 15) // Position arrowhead relative to node edge
    .attr("refY", 0)
    .attr("orient", "auto")
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("xoverflow", "visible")
    .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5") // Arrow shape
      .attr("fill", "#999")
      .style("stroke", "none");

  // Scales for node size and link width
  const minRadius = 5, maxRadius = 15;
  const playCountExtent = d3.extent(nodes, d => d.playCount);
  const nodeRadiusScale = d3.scaleSqrt() // Use sqrt scale for area perception
    .domain([playCountExtent[0] || 0, playCountExtent[1] || 1])
    .range([minRadius, maxRadius]);

  const nodeColorScale = d3.scaleSequential(d3.interpolateViridis) // Example color scale
    .domain([playCountExtent[1] || 1, playCountExtent[0] || 0]); // Invert domain for color meaning if desired

  const maxStrokeWidth = 6;
  const linkWidthScale = d3.scaleLinear()
    .domain([0, d3.max(links, d => d.value) || 1])
    .range([1, maxStrokeWidth]); // Min/max link thickness

  // Force simulation setup
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links)
      .id(d => d.id) // Link nodes by 'id' property
      .distance(90) // Desired link distance
      // Optional: Adjust strength based on node degree or link value
      // .strength(link => 1 / Math.min(link.source.playCount || 1, link.target.playCount || 1))
    )
    .force("charge", d3.forceManyBody().strength(-180)) // Repulsion force
    .force("center", d3.forceCenter(width / 2, height / 2)) // Center nodes
    .force("collide", d3.forceCollide() // Prevent overlap
      .radius(d => nodeRadiusScale(d.playCount) + 6) // Collision radius based on node size + padding
      .strength(0.8)
    );

  // --- Interaction Helpers ---
  const linkedByIndex = {}; // For efficient neighbor lookup
  links.forEach(d => {
      // Store links using node objects after simulation resolves IDs if necessary
      // Or ensure links are created with object references if possible initially
       const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
       const targetId = typeof d.target === 'object' ? d.target.id : d.target;
       linkedByIndex[`${sourceId},${targetId}`] = 1;
  });

  function areNeighbors(a, b) {
    return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;
  }

  // --- Draw Links ---
  const link = zoomableGroup.append("g")
    .attr("class", "force-links")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.5)
    .selectAll("line")
    .data(links)
    .join("line")
      .attr("stroke-width", d => linkWidthScale(d.value))
      .attr("marker-end", "url(#arrowhead)"); // Add arrowhead

  // Tooltip for links
  link.append("title").text(d => `${d.source.id} → ${d.target.id}\n${d.value} transitions`);


  // --- Draw Nodes ---
  const node = zoomableGroup.append("g")
      .attr("class", "force-nodes")
      .attr("stroke", "#fff") // White border for contrast
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("circle")
        .attr("r", d => nodeRadiusScale(d.playCount))
        .attr("fill", d => nodeColorScale(d.playCount))
        .style("cursor", "pointer") // Indicate draggable
        .call(drag(simulation)); // Attach drag behavior

   // Tooltip for nodes
  node.append("title").text(d => `${d.id}\n${d.playCount} plays`);

  // --- Draw Labels (optional) ---
  const labels = zoomableGroup.append("g")
      .attr("class", "force-labels")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
      .attr("fill", "#333")
      // Optional: Add stroke for better readability on complex backgrounds
      // .attr("stroke", "white")
      // .attr("stroke-width", 0.3)
      // .attr("paint-order", "stroke")
      .attr("pointer-events", "none") // Labels don't block interaction
      .selectAll("text")
      .data(nodes)
      .join("text")
        .attr("dx", d => nodeRadiusScale(d.playCount) + 4) // Offset from node edge
        .attr("dy", "0.35em") // Center vertically
        .text(d => d.id);

  // --- Hover Interaction ---
  if (!USE_TEXT_MODE) { // Only add hover effects in plot mode
      node.on("mouseover", highlight)
          .on("mouseout", unhighlight);
      // Optional: Add link hover if needed
      // link.on("mouseover", highlightLink).on("mouseout", unhighlightLink);
  }

  function highlight(event, d_hovered) {
      const opacity = 0.15; // How much to fade non-neighbors
      // Fade non-neighbor nodes and their labels
      node.style("opacity", n => areNeighbors(d_hovered, n) ? 1 : opacity);
      labels.style("opacity", n => areNeighbors(d_hovered, n) ? 1 : opacity);

      // Highlight border of the hovered node
      node.style("stroke", n => (n === d_hovered) ? "black" : "#fff")
          .style("stroke-width", n => (n === d_hovered) ? 2.5 : 1.5);

      // Highlight connected links
      link.style("stroke-opacity", l => (l.source === d_hovered || l.target === d_hovered) ? 0.9 : opacity * 0.5)
          .style("stroke", l => (l.source === d_hovered || l.target === d_hovered) ? "#555" : "#999"); // Darken highlighted links slightly

      // Optional: Highlight arrowheads of connected links
       // zoomableGroup.select("#arrowhead path").style("fill", "#555"); // This changes all arrows, better to target specific links if needed
  }

  function unhighlight() {
      node.style("opacity", 1).style("stroke", "#fff").style("stroke-width", 1.5);
      labels.style("opacity", 1);
      link.style("stroke-opacity", 0.5).style("stroke", "#999");
       // zoomableGroup.select("#arrowhead path").style("fill", "#999"); // Restore default arrowhead color
  }
  // function highlightLink(event, d_hovered) { /* ... */ }
  // function unhighlightLink(event, d_hovered) { /* ... */ }

  // --- Simulation Tick ---
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
    labels
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });

  // --- Zooming and Panning ---
   function zoomed(event) {
       zoomableGroup.attr("transform", event.transform); // Apply zoom transform to the group
   }

   const zoom = d3.zoom()
       .scaleExtent([0.2, 8]) // Min/max zoom levels
       .extent([[0, 0], [width, height]]) // Viewport extent
       .translateExtent([[0, 0], [width, height]]) // Limit panning
       .on("zoom", zoomed);

   // Apply zoom ONLY if not in text mode
   if (!USE_TEXT_MODE) {
       svg.call(zoom);
       svg.on("dblclick.zoom", null); // Disable double-click zoom reset if needed
   }


  // --- Drag Function ---
  function drag(simulation) {
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart(); // Heat up simulation on drag start
        d.fx = d.x; // Fix node position horizontally
        d.fy = d.y; // Fix node position vertically
        d3.select(this).raise(); // Bring dragged node to front
    }
    function dragged(event, d) {
        d.fx = event.x; // Update fixed position during drag
        d.fy = event.y;
    }
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0); // Cool down simulation
        // Only unfix position if it wasn't part of a zoom/pan event
       // if (!event.sourceEvent || !event.sourceEvent.type.includes("zoom")) {
             d.fx = null; // Unfix position
             d.fy = null;
       // }
        // Optional: Re-apply highlight after dragging if needed
        // if (!USE_TEXT_MODE && d3.select(this).style("opacity") == 1) {
        //    highlight(event, d);
        // }
    }
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
  }

  // Update description
  const descEl = container.nextElementSibling;
  if (descEl && descEl.classList.contains('chart-description')) {
      descEl.innerHTML = `Transitions between top ${nodes.length} artists. Size/color = plays. Thickness = transitions. ${USE_TEXT_MODE ? '' : 'Hover/Pan/Zoom.'}`;
  }
}


// --- Text Generating Functions (Only called if USE_TEXT_MODE is true) ---

function drawCalendarAsText(data, initialStartDate, initialEndDate) {
  const container = document.getElementById("calendar");
  const legendContainer = document.getElementById("legend");
  if (!container || !legendContainer) return;

  container.innerHTML = ""; // Clear previous text
  legendContainer.innerHTML = ""; // Clear legend area

  const listeningData = data.filter((d) => d.ms_played > 0);
  if (listeningData.length === 0) {
    container.innerHTML = `<p class="empty-message">No listening data found for this period: <strong>${formatDate(
      initialStartDate
    )} to ${formatDate(initialEndDate)}</strong>.</p>`;
    return;
  }

  // Aggregate data
  const dailyData = d3.rollups(
    listeningData,
    (v) => d3.sum(v, (d) => d.ms_played / 60000), // Sum minutes
    (d) => formatDay(d.ts) // Group by day string
  );
  const valueMap = new Map(dailyData);
  const totalMinutes = d3.sum(valueMap.values());
  const numberOfDaysWithListening = valueMap.size;

  // Calculate total days in the period (inclusive)
  const totalDaysInPeriod = d3.timeDay.count(initialStartDate, d3.timeDay.offset(initialEndDate, 1));

  // Calculate averages
  const averageMinutesPerListeningDay = totalMinutes / (numberOfDaysWithListening || 1);
  const averageMinutesOverall = totalMinutes / (totalDaysInPeriod || 1);

  // Find peak day
  let peakDayStr = null;
  let maxMinutesOnPeakDay = 0;
  valueMap.forEach((minutes, dayStr) => {
    if (minutes > maxMinutesOnPeakDay) {
      maxMinutesOnPeakDay = minutes;
      peakDayStr = dayStr;
    }
  });

  // Find peak month
  const monthlyTotals = d3.rollup(
      listeningData,
      v => d3.sum(v, d => d.ms_played / 60000), // Sum minutes
      d => d3.timeMonth.floor(d.ts) // Group by month start date object
  );
  let peakMonthDate = null;
  let maxMinutesInPeakMonth = 0;
  monthlyTotals.forEach((total, monthDate) => {
      if (total > maxMinutesInPeakMonth) {
          maxMinutesInPeakMonth = total;
          peakMonthDate = monthDate;
      }
  });


  // Construct summary text
  let textContent = `<h3 style="color: var(--spotify-color); margin-bottom: 0.5em;">Your Listening Summary</h3>`; // Use variable if defined
  textContent += `<p>From <strong>${formatDate(initialStartDate)}</strong> to <strong>${formatDate(initialEndDate)}</strong>:</p>`;
  textContent += `<ul style="margin-top: 0.5em; padding-left: 1.5em;">`; // Basic list styling
  textContent += `<li>Total listening: <strong style="color: var(--dark-green-color);">${formatTime(totalMinutes)}</strong></li>`;
  textContent += `<li>Active days: <strong style="color: var(--dark-green-color);">${numberOfDaysWithListening}</strong> out of ${totalDaysInPeriod}</li>`;
  textContent += `<li>Average (overall): <strong style="color: var(--dark-green-color);">${formatTime(averageMinutesOverall)}</strong>/day</li>`;
  textContent += `<li>Average (active days): <strong style="color: var(--dark-green-color);">${formatTime(averageMinutesPerListeningDay)}</strong>/day</li>`;

  if (peakDayStr) {
    textContent += `<li>Peak Day: <strong>${formatDate(new Date(peakDayStr + "T00:00:00"))}</strong> (${formatTime(maxMinutesOnPeakDay)})</li>`; // Ensure date parsing includes time for safety
  }
  if (peakMonthDate) {
      textContent += `<li>Peak Month: <strong>${formatFullMonthYear(peakMonthDate)}</strong> (${formatTime(maxMinutesInPeakMonth)})</li>`;
  }
  textContent += `</ul>`;

  container.innerHTML = textContent;
  updateFilterInfoLabel(initialStartDate, initialEndDate); // Ensure label is updated
}


// function updateTopArtistsAsText(data) {
//   const placeholderImg = "https://via.placeholder.com/40"; // Smaller placeholder for text list
//   const targetContainer = document.getElementById("top-artists-chart"); // Target the DIV
//   if (!targetContainer) return;
//   targetContainer.innerHTML = ""; // Clear

//   if (!data || data.length === 0) {
//     targetContainer.innerHTML = `<p class="empty-message">No data.</p>`;
//     return;
//   }

//   const artistData = d3.rollups(
//       data.filter(d => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0),
//       v => d3.sum(v, d => d.ms_played / 60000),
//       d => d.artist
//     )
//     .sort((a, b) => d3.descending(a[1], b[1]))
//     .slice(0, 5);

//   if (artistData.length === 0) {
//     targetContainer.innerHTML = `<p class="empty-message">No artist data.</p>`;
//     return;
//   }

//   // Create list inside container
//   const list = document.createElement("ol"); // Use ordered list
//   list.classList.add('top-list-text'); // Add class for styling
//   list.style.listStyle = "none"; // Remove default numbering
//   list.style.padding = "0";
//   targetContainer.appendChild(list);

//   artistData.forEach(([artist, totalMinutes], index) => {
//     const li = document.createElement("li");
//     li.classList.add('top-list-item-text'); // Styling class
//     li.style.display = "flex";
//     li.style.alignItems = "center";
//     li.style.marginBottom = "0.5em"; // Spacing

//     const trackWithUri = data.find(
//       d => d.artist === artist && d.spotify_track_uri?.startsWith("spotify:track:")
//     );

//     const renderContent = (imgUrl) => {
//       li.innerHTML = `
//           <img src="${imgUrl}" alt="${artist}" class="top-list-img-text" style="width: 40px; height: 40px; margin-right: 10px; border-radius: 4px;" />
//           <span class="top-list-info-text">
//               <span class="top-list-rank-text">${index + 1}.</span>
//               <span class="top-list-name-text">${artist}</span>
//           </span>
//           <span class="top-list-time-text" style="margin-left: auto; color: #6c757d;">(${formatTime(totalMinutes)})</span>
//         `;
//       list.appendChild(li);
//     };

//     if (trackWithUri) {
//         const trackId = trackWithUri.spotify_track_uri.split(":")[2];
//         const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
//         fetch(oEmbedUrl)
//             .then(res => res.ok ? res.json() : Promise.reject('oEmbed fetch failed'))
//             .then(embedData => renderContent(embedData?.thumbnail_url || placeholderImg))
//             .catch(() => renderContent(placeholderImg)); // Fallback
//     } else {
//       renderContent(placeholderImg); // Fallback
//     }
//   });
// }


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

//    // Rollup to get time and a sample URI per track/artist combo
//    const trackDataRollup = d3.rollups(
//        data.filter(d => d.track && d.track !== "Unknown Track" && d.track !== "N/A" && d.ms_played > 0),
//        v => ({
//            totalMinutes: d3.sum(v, d => d.ms_played / 60000),
//            uri: v.find(i => i.spotify_track_uri?.startsWith("spotify:track:"))?.spotify_track_uri
//        }),
//        d => `${d.track} • ${d.artist}` // Key by track and artist
//    );

//   const trackData = Array.from(trackDataRollup)
//     .sort(([, a], [, b]) => d3.descending(a.totalMinutes, b.totalMinutes))
//     .slice(0, 5);

//   if (trackData.length === 0) {
//     targetDiv.innerHTML = `<p class="empty-message">No track data.</p>`;
//     return;
//   }

//   const placeholderImg = "https://via.placeholder.com/40"; // Smaller placeholder

//   // Create list inside container
//   const list = document.createElement("ol");
//   list.classList.add('top-list-text');
//   list.style.listStyle = "none";
//   list.style.padding = "0";
//   targetDiv.appendChild(list);

//   trackData.forEach(([trackArtistKey, trackInfo], index) => {
//     const parts = trackArtistKey.split("•");
//     const trackName = parts[0]?.trim() || "Unknown Track";
//     const artistName = parts[1]?.trim() || "Unknown Artist";

//     const li = document.createElement("li");
//     li.classList.add('top-list-item-text');
//     li.style.display = "flex";
//     li.style.alignItems = "center";
//     li.style.marginBottom = "0.5em";

//     const renderContent = (imgUrl) => {
//       li.innerHTML = `
//         <img src="${imgUrl}" alt="${trackName}" class="top-list-img-text" style="width: 40px; height: 40px; margin-right: 10px; border-radius: 4px;" />
//         <span class="top-list-info-text">
//             <span class="top-list-rank-text">${index + 1}.</span>
//             <span class="top-list-name-text">${trackName}</span><br>
//             <span class="top-list-artist-text" style="font-size: 0.9em; color: #6c757d;">${artistName}</span>
//         </span>
//         <span class="top-list-time-text" style="margin-left: auto; color: #6c757d;">(${formatTime(trackInfo.totalMinutes)})</span>
//       `;
//       list.appendChild(li);
//     };

//     if (trackInfo.uri) {
//         const trackId = trackInfo.uri.split(":")[2];
//         const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
//         fetch(oEmbedUrl)
//             .then(res => res.ok ? res.json() : Promise.reject('oEmbed fetch failed'))
//             .then(embedData => renderContent(embedData?.thumbnail_url || placeholderImg))
//             .catch(() => renderContent(placeholderImg));
//     } else {
//       renderContent(placeholderImg); // Fallback if no URI found during rollup
//     }
//   });
// }

// --- Text Generating Functions (Only called if USE_TEXT_MODE is true) ---

// ... (drawCalendarAsText remains the same) ...

function updateTopArtistsAsText(data) {
  const placeholderImg = "https://via.placeholder.com/40"; // Smaller placeholder
  const targetContainer = document.getElementById("top-artists-chart");
  if (!targetContainer) return;
  targetContainer.innerHTML = "";

  if (!data || data.length === 0) {
    targetContainer.innerHTML = `<p class="empty-message">No data.</p>`;
    return;
  }

  const artistData = d3.rollups(
      data.filter(d => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0),
      v => d3.sum(v, d => d.ms_played / 60000),
      d => d.artist
    )
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(0, 5);

  if (artistData.length === 0) {
    targetContainer.innerHTML = `<p class="empty-message">No artist data.</p>`;
    return;
  }

  const list = document.createElement("ol");
  list.classList.add('top-list-text');
  list.style.listStyle = "none";
  list.style.padding = "0";
  targetContainer.appendChild(list);

  artistData.forEach(([artist, totalMinutes], index) => {
    const li = document.createElement("li");
    li.classList.add('top-list-item-text');
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.marginBottom = "0.5em";

    // --- Create and Append LI Synchronously with Placeholder ---
    li.innerHTML = `
        <img src="${placeholderImg}" alt="${artist}" class="top-list-img-text" style="width: 40px; height: 40px; margin-right: 10px; border-radius: 4px;" />
        <span class="top-list-info-text">
            <span class="top-list-rank-text">${index + 1}.</span>
            <span class="top-list-name-text">${artist}</span>
        </span>
        <span class="top-list-time-text" style="margin-left: auto; color: #6c757d;">(${formatTime(totalMinutes)})</span>
    `;
    list.appendChild(li); // Append immediately in sorted order

    // --- Find URI and Fetch Image Asynchronously ---
    const trackWithUri = data.find(
      d => d.artist === artist && d.spotify_track_uri?.startsWith("spotify:track:")
    );

    if (trackWithUri) {
      const trackId = trackWithUri.spotify_track_uri.split(":")[2];
      const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;

      fetch(oEmbedUrl)
        .then(res => res.ok ? res.json() : Promise.reject('oEmbed fetch failed'))
        .then(embedData => {
          // Find the image element within the already appended LI
          const imgElement = li.querySelector('.top-list-img-text');
          if (imgElement && embedData?.thumbnail_url) {
            imgElement.src = embedData.thumbnail_url; // Update src
          }
        })
        .catch(error => {
             console.warn(`oEmbed fetch failed for artist ${artist}:`, error);
             // Placeholder remains if fetch fails
        });
    }
    // If no trackWithUri, the placeholder remains, no fetch needed.
  });
}


function updateTopTracksAsText(data) {
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

   const trackDataRollup = d3.rollups(
       data.filter(d => d.track && d.track !== "Unknown Track" && d.track !== "N/A" && d.ms_played > 0),
       v => ({
           totalMinutes: d3.sum(v, d => d.ms_played / 60000),
           uri: v.find(i => i.spotify_track_uri?.startsWith("spotify:track:"))?.spotify_track_uri
       }),
       d => `${d.track} • ${d.artist}` // Key by track and artist
   );

  const trackData = Array.from(trackDataRollup)
    .sort(([, a], [, b]) => d3.descending(a.totalMinutes, b.totalMinutes))
    .slice(0, 5);

  if (trackData.length === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No track data.</p>`;
    return;
  }

  const placeholderImg = "https://via.placeholder.com/40";

  const list = document.createElement("ol");
  list.classList.add('top-list-text');
  list.style.listStyle = "none";
  list.style.padding = "0";
  targetDiv.appendChild(list);

  trackData.forEach(([trackArtistKey, trackInfo], index) => {
    const parts = trackArtistKey.split("•");
    const trackName = parts[0]?.trim() || "Unknown Track";
    const artistName = parts[1]?.trim() || "Unknown Artist";

    const li = document.createElement("li");
    li.classList.add('top-list-item-text');
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.marginBottom = "0.5em";

    // --- Create and Append LI Synchronously with Placeholder ---
    li.innerHTML = `
      <img src="${placeholderImg}" alt="${trackName}" class="top-list-img-text" style="width: 40px; height: 40px; margin-right: 10px; border-radius: 4px;" />
      <span class="top-list-info-text">
          <span class="top-list-rank-text">${index + 1}.</span>
          <span class="top-list-name-text">${trackName}</span><br>
          <span class="top-list-artist-text" style="font-size: 0.9em; color: #6c757d;">${artistName}</span>
      </span>
      <span class="top-list-time-text" style="margin-left: auto; color: #6c757d;">(${formatTime(trackInfo.totalMinutes)})</span>
    `;
    list.appendChild(li); // Append immediately in sorted order

    // --- Find URI and Fetch Image Asynchronously ---
    if (trackInfo.uri) {
        const trackId = trackInfo.uri.split(":")[2];
        const oEmbedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
        fetch(oEmbedUrl)
            .then(res => res.ok ? res.json() : Promise.reject('oEmbed fetch failed'))
            .then(embedData => {
                 // Find the image element within the already appended LI
                 const imgElement = li.querySelector('.top-list-img-text');
                 if (imgElement && embedData?.thumbnail_url) {
                    imgElement.src = embedData.thumbnail_url; // Update src
                 }
            })
            .catch(error => {
                console.warn(`oEmbed failed for track ${trackName}:`, error);
                // Placeholder remains if fetch fails
            });
    }
     // If no trackInfo.uri, the placeholder remains, no fetch needed.
  });
}

// ... (rest of the text functions: updateTimeOfDayChartAsText, updateDayOfWeekChartAsText, etc.) ...

// ... (rest of the script: handleBrushUpdate, handleBrushUpdateAsText, updateVisualization, etc.) ...


function updateTimeOfDayChartAsText(data) {
  const targetDiv = document.getElementById("time-of-day-chart");
  if (!targetDiv) return;
  targetDiv.innerHTML = "";

  if (!data || data.length === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No data.</p>`;
    return;
  }

  const hourData = d3.rollups(
    data.filter((d) => d.ms_played > 0),
    (v) => d3.sum(v, (d) => d.ms_played / 60000), // Sum minutes
    (d) => d.ts.getHours() // Group by hour
  );

  // Sort by hour (0-23) for ordered display, then find peak
  const sortedHourData = Array.from(hourData).sort((a, b) => a[0] - b[0]);
  const hourMap = new Map(sortedHourData);

  if (hourMap.size === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No activity by hour.</p>`;
    return;
  }

  const totalMinutes = d3.sum(hourMap.values());
  // Find peak hour from the original (unsorted by hour) rollup
  const peakHourEntry = Array.from(hourData).sort((a, b) => d3.descending(a[1], b[1]))[0];
  const peakHour = peakHourEntry ? peakHourEntry[0] : "N/A";
  const peakMinutes = peakHourEntry ? peakHourEntry[1] : 0;

  // Construct text
  let textContent = `<h4 style="color: var(--spotify-color); margin-bottom: 0.3em;">Time of Day Summary</h4>`;
  textContent += `<p style="margin-bottom: 0.5em;">Total listening: <strong>${formatTime(totalMinutes)}</strong></p>`;
  if (peakHour !== "N/A") {
      textContent += `<p>Peak hour: <strong style="color: var(--dark-green-color);">${peakHour}:00 - ${peakHour + 1}:00</strong> (${formatTime(peakMinutes)})</p>`;
  }
  // Optional: List top 3 hours if needed, or show full list
  textContent += `<ul style="padding-left: 1.5em; margin-top: 0.5em;">`;
  sortedHourData.forEach(([hour, minutes]) => {
      if (minutes > 0) { // Only list hours with listening time
          textContent += `<li><strong>${hour}:00 - ${hour + 1}:00:</strong> ${formatTime(minutes)}</li>`;
      }
  });
  textContent += `</ul>`;

  targetDiv.innerHTML = textContent;
}


function updateDayOfWeekChartAsText(data) {
  const targetDiv = document.getElementById("day-of-week-chart");
  if (!targetDiv) return;
  targetDiv.innerHTML = "";

  if (!data || data.length === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No data.</p>`;
    return;
  }

  const dayData = d3.rollups(
    data.filter((d) => d.ms_played > 0),
    (v) => d3.sum(v, (d) => d.ms_played / 60000), // Sum minutes
    (d) => d.ts.getDay() // Group by day index
  );
  const dayMap = new Map(dayData);

  if (dayMap.size === 0) {
    targetDiv.innerHTML = `<p class="empty-message">No activity by day.</p>`;
    return;
  }

  const totalMinutes = d3.sum(dayMap.values());
  // Find peak day
  const peakDayEntry = Array.from(dayData).sort((a, b) => d3.descending(a[1], b[1]))[0];
  const peakDayIndex = peakDayEntry ? peakDayEntry[0] : -1;
  const peakMinutes = peakDayEntry ? peakDayEntry[1] : 0;

  // Construct text
  let textContent = `<h4 style="color: var(--spotify-color); margin-bottom: 0.3em;">Day of Week Summary</h4>`;
  textContent += `<p style="margin-bottom: 0.5em;">Total listening: <strong>${formatTime(totalMinutes)}</strong></p>`;
   if (peakDayIndex !== -1) {
      textContent += `<p>Most active day: <strong style="color: var(--dark-green-color);">${dayOfWeekNames[peakDayIndex]}</strong> (${formatTime(peakMinutes)})</p>`;
   }

  // List all days for comparison
  textContent += `<ul style="padding-left: 1.5em; margin-top: 0.5em;">`;
  for (let i = 0; i < 7; i++) { // Loop through Sun (0) to Sat (6)
      const minutes = dayMap.get(i) || 0;
      textContent += `<li><strong>${dayOfWeekNames[i]}:</strong> ${formatTime(minutes)}</li>`;
  }
  textContent += `</ul>`;

  targetDiv.innerHTML = textContent;
}


function drawStreamgraphAsText(filteredData, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = ""; // Clear previous content

  if (!filteredData || filteredData.length === 0) {
    container.innerHTML = '<p class="empty-message">No data.</p>';
    return;
  }

  // Classify data and filter for playtime
  const streamDataProcessed = filteredData
    .map((d) => {
      let contentType = (d.episode_name && String(d.episode_name).trim() !== "") ? "Podcast" : "Music";
      // Add Audiobook classification if needed
      return { ...d, contentType: contentType };
    })
    .filter((d) => d.ms_played > 0);

  if (streamDataProcessed.length === 0) {
    container.innerHTML = '<p class="empty-message">No Music/Podcast data with playtime.</p>';
    return;
  }

  // Calculate total time per content type
  const timeByType = d3.rollup(
    streamDataProcessed,
    (v) => d3.sum(v, (d) => d.ms_played), // Sum milliseconds
    (d) => d.contentType
  );

  const totalMsPlayed = d3.sum(timeByType.values());
  const musicMs = timeByType.get("Music") || 0;
  const podcastMs = timeByType.get("Podcast") || 0;
  // Add audiobookMs if needed

  // Calculate percentages (handle division by zero)
  const musicPercent = totalMsPlayed > 0 ? (musicMs / totalMsPlayed) * 100 : 0;
  const podcastPercent = totalMsPlayed > 0 ? (podcastMs / totalMsPlayed) * 100 : 0;
  // Add audiobookPercent if needed

  // Construct summary text
  let textContent = `<h4 style="color: var(--spotify-color); margin-bottom: 0.3em;">Content Type Summary</h4>`;
  textContent += `<p style="margin-bottom: 0.5em;">Total listening: <strong>${formatTime(totalMsPlayed / 60000)}</strong></p>`;
  textContent += `<ul style="padding-left: 1.5em; margin-top: 0em;">`;
  textContent += `<li><strong>Music:</strong> ${formatTime(musicMs / 60000)} <span style="color: #6c757d;">(${musicPercent.toFixed(1)}%)</span></li>`;
  textContent += `<li><strong>Podcast:</strong> ${formatTime(podcastMs / 60000)} <span style="color: #6c757d;">(${podcastPercent.toFixed(1)}%)</span></li>`;
  // Add Audiobook list item if needed
  textContent += `</ul>`;

  container.innerHTML = textContent;

  // Update description
  const descEl = container.nextElementSibling;
  if (descEl && descEl.classList.contains('chart-description')) {
      descEl.innerHTML = 'Breakdown of total listening time by content type.';
  }
}


function drawForceGraphAsText(filteredData, containerId, topN = 10) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = ""; // Clear previous content

  if (!filteredData || filteredData.length < 2) {
    container.innerHTML = '<p class="empty-message">Not enough data.</p>';
    return;
  }

  // Filter for music and sort by time
  const musicData = filteredData
    .filter((d) => d.artist && d.artist !== "Unknown Artist" && d.ms_played > 0 && !d.episode_name)
    .sort((a, b) => a.ts - b.ts);

  if (musicData.length < 2) {
    container.innerHTML = '<p class="empty-message">Not enough music plays.</p>';
    return;
  }

  // Find top N artists by play count
  const artistCounts = d3.rollup(musicData, (v) => v.length, (d) => d.artist);
  const topArtistsSet = new Set(
    Array.from(artistCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([artist]) => artist)
  );

  if (topArtistsSet.size < 2) {
    container.innerHTML = `<p class="empty-message">Fewer than 2 top artists.</p>`;
    return;
  }

  // Calculate transitions between top N artists
  const transitions = new Map();
  for (let i = 0; i < musicData.length - 1; i++) {
    const source = musicData[i].artist;
    const target = musicData[i + 1].artist;
    if (topArtistsSet.has(source) && topArtistsSet.has(target) && source !== target) {
      const key = `${source}:::${target}`;
      transitions.set(key, (transitions.get(key) || 0) + 1);
    }
  }

  if (transitions.size === 0) {
    container.innerHTML = '<p class="empty-message">No transitions found between top artists.</p>';
    return;
  }

  // Sort transitions by frequency
  const sortedTransitions = Array.from(transitions.entries()).sort((a, b) => d3.descending(a[1], b[1]));

  // Construct text summary
  let textContent = `<h4 style="color: var(--spotify-color); margin-bottom: 0.3em;">Top Artist Transitions (Top ${topArtistsSet.size})</h4>`;
  textContent += `<p style="margin-bottom: 0.5em;">Most frequent artist switches:</p>`;
  textContent += `<ol style="padding-left: 1.5em; margin-top: 0em;">`; // Use ordered list

  const maxToShow = 10; // Limit how many transitions to show
  sortedTransitions.slice(0, maxToShow).forEach(([key, count]) => {
    const [from, to] = key.split(":::");
    textContent += `<li><strong>${from}</strong> → <strong>${to}</strong> (${count} times)</li>`;
  });

  textContent += `</ol>`;
  if (sortedTransitions.length > maxToShow) {
      textContent += `<p style="font-size: 0.9em; color: #6c757d;">...and ${sortedTransitions.length - maxToShow} more unique transitions.</p>`;
  }
  container.innerHTML = textContent;

  // Update description
  const descEl = container.nextElementSibling;
  if (descEl && descEl.classList.contains('chart-description')) {
      descEl.innerHTML = `Your most common switches between your top ${topArtistsSet.size} most played artists.`;
  }
}


// --- Main Update Triggers ---

// Updates PLOT components based on filtered data from calendar interaction
function handleBrushUpdate(filteredChartData) {
  const dataToUpdate = filteredChartData || [];
  const topNForce = forceGraphSlider ? parseInt(forceGraphSlider.value, 10) : 10; // Get current slider value

  console.log("Updating plots with brushed data:", dataToUpdate.length, "records");
  updateTopArtists(dataToUpdate);
  updateTopTracksChart2(dataToUpdate); // Using sparkline version for plots
  updateTimeOfDayChart(dataToUpdate);
  updateDayOfWeekChart(dataToUpdate);
  drawStreamgraph(dataToUpdate, "streamgraph-chart");
  drawForceGraph2(dataToUpdate, "force-graph-chart", topNForce); // Pass Top N
}

// Updates TEXT summary components based on filtered data
function handleBrushUpdateAsText(filteredChartData) {
  const dataToUpdate = filteredChartData || [];
  const topNForce = forceGraphSlider ? parseInt(forceGraphSlider.value, 10) : 10; // Get current slider value

  console.log("Updating text components with filtered data:", dataToUpdate.length, "records");
  updateTopArtistsAsText(dataToUpdate);
  updateTopTracksAsText(dataToUpdate);
  updateTimeOfDayChartAsText(dataToUpdate);
  updateDayOfWeekChartAsText(dataToUpdate);
  drawStreamgraphAsText(dataToUpdate, "streamgraph-chart");
  drawForceGraphAsText(dataToUpdate, "force-graph-chart", topNForce); // Pass Top N
}

// --- Core Visualization Update Function (Handles Mode Switching) ---
// Called when the main date range (year dropdown, date inputs, or initial load) changes.
function updateVisualization(dataForView) {
  const chartsToClear = [
    topArtistsContainer, // Use the container element
    topTracksDiv,
    timeOfDayDiv,
    dayOfWeekDiv,
    streamgraphContainer,
    forceGraphContainer,
  ];
  if (calendarDiv) calendarDiv.innerHTML = ""; // Clear main display area
  if (legendDiv) legendDiv.innerHTML = ""; // Clear legend area

  selectedStartDate = null; // Reset selection state from calendar drag
  selectedEndDate = null;
  currentViewData = dataForView || []; // Store the data for the current view

  // Handle empty/invalid data for this period
  if (!currentViewData || currentViewData.length === 0) {
    if (calendarDiv)
      calendarDiv.innerHTML = `<p class="empty-message">No data for selected period.</p>`;
    chartsToClear.forEach((el) => {
      if (el) el.innerHTML = `<p class="empty-message">No data.</p>`;
    });
    updateFilterInfoLabel(null, null); // Clear label or show default
    // Clear dependent components using the appropriate handler based on mode
    if (USE_TEXT_MODE) handleBrushUpdateAsText([]);
    else handleBrushUpdate([]);
    return;
  }

  // Determine the date range of the incoming data for the current view
  const [viewStartDate, viewEndDate] = d3.extent(currentViewData, (d) => d.ts);

  if (!viewStartDate || !viewEndDate || isNaN(viewStartDate) || isNaN(viewEndDate)) {
    console.error("updateVisualization: Invalid date range in data.", viewStartDate, viewEndDate);
    if (calendarDiv) calendarDiv.innerHTML = `<p class="error-message">Invalid date range in data.</p>`;
    chartsToClear.forEach((el) => {
      if (el) el.innerHTML = `<p class="empty-message">No data.</p>`;
    });
    updateFilterInfoLabel(null, null);
    if (USE_TEXT_MODE) handleBrushUpdateAsText([]);
    else handleBrushUpdate([]);
    return;
  }

  // Set the global selection to the full range of the current view initially (important for plot mode)
  selectedStartDate = viewStartDate;
  selectedEndDate = viewEndDate;

  // --- MODE SWITCH ---
  if (USE_TEXT_MODE) {
    console.log("Rendering in Text Mode for range:", formatDate(viewStartDate), "to", formatDate(viewEndDate));
    // 1. Display the main calendar summary text for the full range
    drawCalendarAsText(currentViewData, viewStartDate, viewEndDate);
    // 2. Update all other text components with the full range data
    handleBrushUpdateAsText(currentViewData);
    // 3. Update the filter label (already done by drawCalendarAsText)
  } else {
    console.log("Rendering in Plot Mode for range:", formatDate(viewStartDate), "to", formatDate(viewEndDate));
    // 1. Draw the interactive visual calendar for the full range
    drawCalendar(currentViewData, viewStartDate, viewEndDate);
    // 2. Update plots for the initial full range displayed by the calendar
    handleBrushUpdate(currentViewData); // Pass the full view data initially
    // 3. Update filter label (drawCalendar calls updateFilterInfoLabel)
  }
}

// --- Filter Data and Update Dependent Components (Plot Mode Drag) ---
// Called ONLY by handleDragEndPlot in plot mode after dragging handles.
function filterDataAndUpdateCharts(startDate, endDate) {
    // This function ONLY handles updates triggered by calendar handle drags in PLOT MODE.
    if (USE_TEXT_MODE) {
        console.warn("filterDataAndUpdateCharts called unexpectedly in text mode.");
        return; // Should not happen
    }

    const validStartDate = startDate instanceof Date && !isNaN(startDate) ? startDate : selectedStartDate;
    const validEndDate = endDate instanceof Date && !isNaN(endDate) ? endDate : selectedEndDate;

    if (!validStartDate || !validEndDate || !currentViewData || isNaN(validStartDate) || isNaN(validEndDate) || validStartDate > validEndDate) {
        console.warn("filterDataAndUpdateCharts (Plot Mode Drag): Invalid date range or no data.", { validStartDate, validEndDate });
        // Update plots with empty data if range becomes invalid during drag
        handleBrushUpdate([]);
        updateFilterInfoLabel(validStartDate, validEndDate); // Show the invalid range attempt
        return;
    }

    const filterStart = d3.timeDay.floor(validStartDate);
    const filterEnd = d3.timeDay.offset(d3.timeDay.floor(validEndDate), 1); // Exclusive end

    // Filter from the data currently loaded into the main calendar view (currentViewData)
    const filtered = currentViewData.filter(d => {
        const dDate = d.ts;
        return dDate instanceof Date && !isNaN(dDate) && dDate >= filterStart && dDate < filterEnd;
    });

    console.log(`Filtered plot data (drag) from ${formatDate(validStartDate)} to ${formatDate(validEndDate)}: ${filtered.length} records.`);
    updateFilterInfoLabel(validStartDate, validEndDate); // Update label

    // Update the dependent plot components ONLY
    handleBrushUpdate(filtered);
}


// --- Event Listener Setup Function ---
function setupEventListeners() {
  // Year Select Dropdown
  if (wrappedYearSelect) {
    wrappedYearSelect.onchange = () => {
      const selectedValue = wrappedYearSelect.value;

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
    console.error("Cannot attach change listener: #wrappedYearSelect not found.");
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

      // Ensure start is before end
      if (start > end) {
        alert("Start date must be before or the same as the end date.");
        return; // Make user correct it
      }

      // Clamp selected range to overall available data range
      start = (!overallMinDate || start < overallMinDate) ? overallMinDate : start;
      end = (!overallMaxDate || end > overallMaxDate) ? overallMaxDate : end;

      // Update inputs if clamping occurred
      startDateInput.value = formatDateForInput(start);
      endDateInput.value = formatDateForInput(end);

      const filterEnd = d3.timeDay.offset(end, 1); // Exclusive end date for filtering

      // Clear year selection as custom date range takes precedence
      if (wrappedYearSelect) wrappedYearSelect.value = "";

      // Filter the *entire* dataset by the selected (and clamped) range
      const filteredByRange = allParsedData.filter(
        (d) => d.ts >= start && d.ts < filterEnd
      );

      console.log(`Apply Range button clicked. Updating view.`);
      updateVisualization(filteredByRange); // Update the main view
    };
  } else {
    console.error("Cannot attach click listener: #applyRangeBtn not found.");
  }

   // Force Graph Slider Listener (Only updates Force Graph)
  if (forceGraphSlider) {
    forceGraphSlider.addEventListener('input', () => {
      const topN = forceGraphSlider.value;
      if (forceGraphSliderValue) forceGraphSliderValue.textContent = topN; // Update the displayed value

      // Re-render only the force graph with the new Top N value, using currentViewData
      // Call the appropriate rendering function based on the mode
      if (currentViewData && currentViewData.length > 0) { // Only update if there's data
           if (USE_TEXT_MODE) {
               drawForceGraphAsText(currentViewData, 'force-graph-chart', parseInt(topN, 10));
           } else {
               // Ensure plot mode function exists before calling
               if (typeof drawForceGraph2 === 'function') {
                    drawForceGraph2(currentViewData, 'force-graph-chart', parseInt(topN, 10));
               } else {
                    console.warn("drawForceGraph2 function not available for plot mode update.");
               }
           }
      } else {
           console.log("Slider changed, but no current data to update force graph.");
      }
    });
  } else {
      console.warn("Force graph slider element not found."); // Changed to warn
  }

  console.log("Event listeners attached.");
}