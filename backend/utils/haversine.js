const geolib = require('geolib');

/**
 * Calculate the great-circle distance (Haversine Formula) between two points.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    return geolib.getDistance(
        { latitude: lat1, longitude: lon1 },
        { latitude: lat2, longitude: lon2 }
    ) / 1000; // Convert to kilometers
}

module.exports = { calculateDistance };
