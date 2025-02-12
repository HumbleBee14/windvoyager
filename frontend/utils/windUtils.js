import * as turf from "@turf/turf";

/**
 * Calculate wind speed (m/s) and direction (degrees).
 * Uses latest valid data (processed in reverse order).
 */
export function calculateWindSpeedAndDirection(lat1, lon1, lat2, lon2, prevHour, currHour, alt1 = 0, alt2 = 0) {
    if (!lat1 || !lon1 || !lat2 || !lon2 || currHour === null || prevHour === null || prevHour >= currHour) {
        return { speed: "-", direction: "-" };
    }

    const point1 = turf.point([lon1, lat1]);
    const point2 = turf.point([lon2, lat2]);

    const horizontalDistance = turf.distance(point1, point2, { units: "kilometers" });

    // Compute 3D distance using altitude difference
    const altitudeDiff = alt2 - alt1;
    const totalDistance = Math.sqrt(horizontalDistance ** 2 + altitudeDiff ** 2);

    const hoursElapsed = prevHour - currHour;
    const speed = (totalDistance * 1000) / (hoursElapsed * 3600);

    const direction = turf.bearing(point1, point2);

    return {
        speed: parseFloat(speed.toFixed(2)), 
        direction: parseFloat(direction.toFixed(2))
    };
}

/**
 * Convert wind direction degrees into compass direction (N, NE, E, SE, etc.)
 */
export function getCompassDirection(degrees) {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", 
                        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

// -----------------------------------------------------

/**
 * Computes scattered wind data from balloon trajectory for Leaflet-Velocity visualization.
 * @param {Array} originalTrajectoryData - Array of balloon positions with lat, lon, altitude, and hour.
 * @returns {Array} Processed wind data [{ lat, lon, u, v }]
 */
export const computeScatteredWindData = (originalTrajectoryData) => {
    if (!originalTrajectoryData || originalTrajectoryData.length < 2) {
        console.error("Not enough data points to compute wind vectors.");
        return [];
    }

    const scatteredData = [];

    for (let i = 1; i < originalTrajectoryData.length; i++) {
        const prev = originalTrajectoryData[i - 1];
        const curr = originalTrajectoryData[i];

        // Ensure both points exist and are not missing
        if (!prev || !curr || prev.missing || curr.missing) continue;

        // Extract positions
        const lat1 = prev.position[0], lon1 = prev.position[1];
        const alt1 = prev.altitude;
        const lat2 = curr.position[0], lon2 = curr.position[1];
        const alt2 = curr.altitude;

        // Compute wind speed and direction
        const { speed, direction } = calculateWindSpeedAndDirection(lat1, lon1, lat2, lon2, prev.hour, curr.hour, alt1, alt2);
        if (speed === "-" || direction === "-") continue; // Skip invalid cases

        // Convert wind direction into U, V components
        const u = speed * Math.cos(direction * (Math.PI / 180)); // Eastward component
        const v = speed * Math.sin(direction * (Math.PI / 180)); // Northward component

        // Store in scattered format
        scatteredData.push({
            lat: lat2,
            lon: lon2,
            u: parseFloat(u.toFixed(2)),
            v: parseFloat(v.toFixed(2))
        });
    }

    // console.log("Computed Scattered Wind Data:", scatteredData);
    return scatteredData;
};
