import tzlookup from "tz-lookup";

/**
 * Groups balloon data based on their time zones.
 * @param {Array} balloonData - Array of balloon positions [lat, lon, alt]
 * @returns {Object} A mapping of time zones to arrays of balloon altitudes.
 */
export function groupBalloonsByTimezone(balloonData) {
    if (!balloonData || !Array.isArray(balloonData)) {
        console.log(balloonData);
        throw new Error("Invalid balloon data format.");
    }

    const timezoneGroups = {};

    for (const balloon of balloonData) {
        if (!balloon || balloon.includes(null) || balloon.length <= 1) continue;

        const [lat, lon, alt] = balloon;
        const timeZone = tzlookup(lat, lon);
        
        if (!timezoneGroups[timeZone]) {
            timezoneGroups[timeZone] = [];
        }
        
        timezoneGroups[timeZone].push(alt);
    }

    console.log(JSON.stringify(timezoneGroups, null, 2));
    // console.log(Object.keys(timezoneGroups).length);
    // console.log(Object.keys(timezoneGroups));
    return timezoneGroups;
}


/**
 * Sorts the balloon data in each timezone group by altitude.
 * @param {Object} groupedData - The grouped data { timezone: [altitudes] }.
 * @param {string} order - "asc" for ascending, "desc" for descending (default: "asc").
 * @returns {Object} A new object with sorted altitude data for each timezone.
 */
/**
 * Sorts the balloon data in each timezone group by altitude.
 * @param {Object} groupedData - The grouped data { timezone: [[lat, lon, altitude], ...] }.
 * @param {string} order - "asc" for ascending, "desc" for descending (default: "asc").
 * @returns {Object} A new object with sorted altitude data for each timezone.
 */
export function sortGroupedDataByAltitude(groupedData, order = "asc") {
    if (!groupedData || typeof groupedData !== "object") {
        console.warn("Invalid grouped data provided.");
        return {};
    }

    const sortedGroupedData = {};

    Object.keys(groupedData).forEach((timezone) => {
        sortedGroupedData[timezone] = [...groupedData[timezone]].sort((a, b) =>
            order === "asc" ? a[2] - b[2] : b[2] - a[2] // Sort by the 3rd value (altitude)
        );
    });

    return sortedGroupedData;
}

