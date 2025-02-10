import * as turf from "@turf/turf";

/**
 * Calculate wind speed (m/s) and direction (degrees).
 * Uses latest valid data (processed in reverse order).
 */
export function calculateWindSpeedAndDirection(lat1, lon1, lat2, lon2, currHour, prevHour) {
    if (!lat1 || !lon1 || !lat2 || !lon2 || currHour === null || prevHour === null || currHour >= prevHour) {
        return { speed: "-", direction: "-" };
    }

    const point1 = turf.point([lon1, lat1]);
    const point2 = turf.point([lon2, lat2]);

    const distance = turf.distance(point1, point2, { units: "kilometers" });
    const hoursElapsed = prevHour - currHour;
    const speed = (distance * 1000) / (hoursElapsed * 3600);

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

