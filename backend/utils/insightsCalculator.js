const { calculateDistance } = require("./haversine");
const { calculateWindSpeedAndDirection } = require("./windCalculator");

/**
 * Compute all insights for a single balloon.
 * @param {Array} trajectory - The array of {hour, latitude, longitude, altitude} objects.
 * @returns {Object} Insights including distance, speed, wind profiles, and missing hours.
 */
function computeBalloonInsights(trajectory) {
    if (!trajectory || trajectory.length < 2) {
        return { error: "Not enough data points to compute insights." };
    }

    let totalDistance = 0;
    let totalDuration = 0;
    let windProfiles = [];
    let missingData = new Set();
    let hourlyData = {};

    let lastValidData = null;

    let sortedTrajectory = [...trajectory].reverse();  

    for (let i = 0; i < sortedTrajectory.length; i++) {
        const curr = sortedTrajectory[i];

        hourlyData[curr.hour] = [curr.latitude, curr.longitude, curr.altitude];

        if (lastValidData !== null) {
            const distance = calculateDistance(lastValidData.latitude, lastValidData.longitude, curr.latitude, curr.longitude);
            totalDistance += distance;

            // to esure correct time gap calculation
            const timeGap = lastValidData.hour - curr.hour; 
            totalDuration += timeGap;

            // Compute wind speed & direction
            const windData = calculateWindSpeedAndDirection(
                lastValidData.latitude, lastValidData.longitude,
                curr.latitude, curr.longitude, timeGap
            );

            windProfiles.push({ 
                hour: curr.hour, 
                ...windData, 
                altitude: parseFloat(curr.altitude.toFixed(4)) 
            });

            // Track missing hours
            for (let missingHour = curr.hour + 1; missingHour < lastValidData.hour; missingHour++) {
                missingData.add(missingHour);
            }
        }

        lastValidData = curr;
    }

    for (let hour = 0; hour < 24; hour++) {
        if (!hourlyData.hasOwnProperty(hour)) {
            missingData.add(hour);
        }
    }

    const avgSpeed = totalDistance / (totalDuration || 1);

    return {
        totalDistance: totalDistance.toFixed(2) + " km",
        avgSpeed: avgSpeed.toFixed(2) + " km/h",
        windProfiles: windProfiles.reverse(),
        missingData: Array.from(missingData).sort((a, b) => a - b),
        totalDuration: (sortedTrajectory[0].hour - sortedTrajectory[sortedTrajectory.length - 1].hour) + " hours",
        hourlyData
    };
}

module.exports = { computeBalloonInsights };
