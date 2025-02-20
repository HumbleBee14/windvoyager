import * as turf from "@turf/turf";

/**
 * Calculate wind speed (m/s) and direction (degrees).
 * Uses latest valid data (processed in reverse order).
 */
export function calculateTrajectoryWindSpeedDirection(lat1, lon1, lat2, lon2, prevHour, currHour, alt1 = 0, alt2 = 0) {
    if (!lat1 || !lon1 || !lat2 || !lon2 || currHour === null || prevHour === null || currHour >= prevHour) {
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

export function calculateScatteredWindSpeedDirection(lat1, lon1, lat2, lon2, prevHour, currHour, alt1 = 0, alt2 = 0) {
    if (!lat1 || !lon1 || !lat2 || !lon2 || currHour === null || prevHour === null || prevHour <= currHour) {
        return { speed: "-", direction: "-" };
    }

    const point1 = turf.point([lon1, lat1]);
    const point2 = turf.point([lon2, lat2]);
    
    const horizontalDistance = turf.distance(point1, point2, { units: "kilometers" });
    
    // Compute 3D distance using altitude difference
    const altitudeDiff = alt2 - alt1;
    const totalDistance = Math.sqrt(horizontalDistance ** 2 + altitudeDiff ** 2);
    
    const hoursElapsed = prevHour - currHour;
    const speed = (totalDistance * 1000) / (hoursElapsed * 3600); // Speed in m/s
    
    const direction = turf.bearing(point2, point1);

    return {
        speed: parseFloat(speed.toFixed(5)), 
        direction: parseFloat(direction.toFixed(2))
    };
}


// ------------------------------------------------------------------------------
// Helper functions

export const calculateBalloonMetrics = (currentData, lastValidData) => {
    if (!lastValidData) {
        return {
            ascentRate: "-",
            acceleration: "-"
        };
    }

    const {
        alt: currentAlt,
        hour: currentHour
    } = currentData;

    const {
        alt: lastAlt,
        hour: lastHour,
        windSpeed: lastSpeed
    } = lastValidData;

    // Time difference in hours
    const hoursDiff = lastHour - currentHour;
    const secondsElapsed = hoursDiff * 3600;

    // Calculate ascent rate (ft/min)
    const altitudeDiffKm = currentAlt - lastAlt;
    const altitudeDiffFeet = altitudeDiffKm * 3280.84; // Convert km to feet
    const ascentRate = (altitudeDiffFeet / (hoursDiff * 60)); // ft/min

    // Calculate acceleration (m/s²) if we have previous wind speed
    const acceleration = lastSpeed !== "-" ? 
        (currentData.windSpeed - lastSpeed) / secondsElapsed : 
        "-";

    // return {
    //     ascentRate: parseFloat(ascentRate.toFixed(2)),
    //     acceleration: acceleration !== "-" ? parseFloat(acceleration.toFixed(2)) : "-"
    // };

    return {
        ascentRate: parseFloat(ascentRate.toFixed(10)),
        acceleration: acceleration !== "-" ? parseFloat(acceleration.toFixed(10)) : "-"
    };
};

  
  
// ------------------------------------------------------------------------------

/**
 * Convert wind direction degrees into compass direction (N, NE, E, SE, etc.)
 */
export function getCompassDirection(degrees) {
    const directions = ["N", "N-NE", "NE", "E-NE", "E", "E-SE", "SE", "S-SE", 
                       "S", "S-SW", "SW", "W-SW", "W", "W-NW", "NW", "N-NW"];
    const normalizedDegrees = ((degrees % 360) + 360) % 360;
    const index = Math.round(normalizedDegrees / 22.5) % 16;
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

    // Reverse the array to process from past to present
    const chronologicalData = [...originalTrajectoryData].reverse();

    // console.log("Chronological order: " + JSON.stringify(chronologicalData,null,4));

    const scatteredData = [];

    for (let i = 0; i < chronologicalData.length+1; i++) {
        const curr = chronologicalData[i];
        const next = chronologicalData[i + 1];

        // Ensure both points exist and are not missing
        if (!next || !curr || next.missing || curr.missing) continue;

        // Calculate vectors from current to next position
        const { speed, direction } = calculateScatteredWindSpeedDirection(
            curr.position[0], curr.position[1],
            next.position[0], next.position[1],
            curr.hour, next.hour,
            curr.altitude, next.altitude
        );

        // Compute wind speed and direction
        if (speed === "-" || direction === "-") {
            continue;
        }

        // Adjust vector components for meteorological convention
        const angleRad = direction * (Math.PI / 180);
        const u = -speed * Math.sin(angleRad); // Eastward component
        const v = -speed * Math.cos(angleRad); // Northward component

        // Store in scattered format
        scatteredData.push({
            lat: curr.position[0],
            lon: curr.position[1],
            u: parseFloat(u.toFixed(2)),
            v: parseFloat(v.toFixed(2))
        });
    }

    // console.log("Computed Scattered Wind Data:", scatteredData);
    // return scatteredData.reverse();
    return scatteredData;
};
