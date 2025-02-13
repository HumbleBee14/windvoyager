import { point, distance as _distance, bearing } from '@turf/turf';

/**
 * Calculate wind speed (m/s) and direction (degrees).
 * Takes two balloon positions and time difference.
 */
function calculateWindSpeedAndDirection(lat1, lon1, lat2, lon2, hours) {
    if (!lat1 || !lon1 || !lat2 || !lon2 || hours <= 0) return null;

    // Create geo-coordinates
    const point1 = point([lon1, lat1]);
    const point2 = point([lon2, lat2]);

    const distance = _distance(point1, point2, { units: 'kilometers' });

    const speed = (distance * 1000) / (hours * 3600); // Convert km/hr to m/s

    // Compute bearing (direction in degrees)
    const direction = bearing(point1, point2);

    return { speed, direction };
}

export { calculateWindSpeedAndDirection };
