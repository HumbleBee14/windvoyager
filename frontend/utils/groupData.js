import tzlookup from "tz-lookup";

/**
 * Groups balloon data by time zone and includes index, data, source, refHour.
 * @param {Array} balloonData - Array of Constellations of balloons for specific hour {data: [lat, lon, alt], source, refHour}.
 * @returns {Object} An object mapping each time zone to an array of balloon data objects (grouping based on timezones). { timezone: [[B1],[Bx],[Bz]] }
 */
export function groupBalloonsByTimezone(balloonData) {
    if (!balloonData || !Array.isArray(balloonData)) {
        throw new Error("Invalid balloon data format.");
    }

    const timezoneGroups = {};

    balloonData.forEach((balloon, index) => {
        if (!balloon || balloon.length <= 1) return;
        
        const [lat, lon, alt] = balloon.data;
        if (lat === null || lon === null) return;
        
        try {
            const timeZone = tzlookup(lat, lon);
            if (!timezoneGroups[timeZone]) {
                timezoneGroups[timeZone] = [];
            }
            
            // Store complete balloon data with index
            timezoneGroups[timeZone].push({
                index,      // Added additional - in case needed in future else remove it later
                data: balloon.data,
                source: balloon.source,
                refHour: balloon.refHour
            });
        } catch (error) {
            console.warn(`Failed to lookup timezone for balloon ${index}:`, error);
        }
    });

    return timezoneGroups;
}

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

