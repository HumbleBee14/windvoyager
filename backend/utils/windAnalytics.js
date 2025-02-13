import tzlookup from 'tz-lookup';

/**
 * Compute average wind speed per altitude bin, grouped by time zone, for all 24 hours.
 * @param {Object} balloonData - { hour: [[lat, lon, alt], ...], ... } (24 hours)
 * @returns {Object} { hour: { timeZone: { altitudeBin: avgSpeed } } }
 */
function computeWindAnalytics(balloonData) {
    if (!balloonData || typeof balloonData !== 'object') {
        throw new Error('Invalid balloon data format.');
    }

    const hourlyAnalytics = {}; // Store per-hour analytics

    for (let hour = 0; hour < 24; hour++) {
        if (!balloonData[hour]) continue;

        const timeZoneGroups = {}; // Store per-timezone computations

        for (const balloon of balloonData[hour]) {
            if (!balloon || balloon.includes(null)) continue;

            const [lat, lon, alt] = balloon;
            const timeZone = tzlookup(lat, lon);

            if (!timeZoneGroups[timeZone]) {
                timeZoneGroups[timeZone] = {};
            }

            // Round altitude to nearest 1km bin
            const altitudeBin = Math.floor(alt);

            if (!timeZoneGroups[timeZone][altitudeBin]) {
                timeZoneGroups[timeZone][altitudeBin] = { totalCount: 0, totalSpeed: 0 };
            }

            // Placeholder wind speed (will replace with actual calculation)
            const windSpeed = alt / 10;

            timeZoneGroups[timeZone][altitudeBin].totalSpeed += windSpeed;
            timeZoneGroups[timeZone][altitudeBin].totalCount += 1;
        }

        // Compute average wind speeds per altitude bin
        const result = {};
        for (const timeZone in timeZoneGroups) {
            result[timeZone] = {};
            for (const alt in timeZoneGroups[timeZone]) {
                const { totalSpeed, totalCount } = timeZoneGroups[timeZone][alt];
                result[timeZone][alt] = totalSpeed / totalCount;
            }
        }

        hourlyAnalytics[hour] = result;
    }

    return hourlyAnalytics;
}

export { computeWindAnalytics };
