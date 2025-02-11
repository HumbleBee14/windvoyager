import * as turf from '@turf/turf';
import * as _ from 'lodash';

export const generateWindGrid = (scatteredDataNEW) => {

    // Example scattered data points (from React frontend)
    const scatteredData = [
        { "lat": -39.28, "lon": -87.98, "u": -10.40, "v": 0.12 },
        { "lat": -38.94, "lon": -87.92, "u": -24.15, "v": 1.59 },
        { "lat": -38.16, "lon": -87.85, "u": -22.81, "v": 3.37 },
        { "lat": -37.42, "lon": -87.81, "u": -21.6, "v": 5.17 },
        { "lat": -36.72, "lon": -88.40, "u": -20.25, "v": 7.83 },
        { "lat": -36.07, "lon": -88.69, "u": -18.40, "v": 9.76 },
        { "lat": -34.88, "lon": -89.47, "u": -15.21, "v": 14.53 },
        { "lat": -34.34, "lon": -89.97, "u": -13.03, "v": 18.26 },
        { "lat": -33.85, "lon": -90.54, "u": -10.22, "v": 23.13 },
        { "lat": -32.61, "lon": -92.68, "u": -10.22, "v": 23.13 },
    ];

    // Define grid resolution
    const nx = 24;
    const ny = 22;

    // Get min/max lat/lon
    const points = scatteredData.map(d => turf.point([d.lon, d.lat]));
    const featureCollection = turf.featureCollection(points);
    const bbox = turf.bbox(featureCollection); // [west, south, east, north]
    const lonMin = bbox[0], lonMax = bbox[2];
    const latMin = bbox[1], latMax = bbox[3];

    // Generate grid points
    const gridLon = Array.from({ length: nx }, (_, i) => lonMin + (lonMax - lonMin) * i / (nx - 1));
    const gridLat = Array.from({ length: ny }, (_, i) => latMax + (latMin - latMax) * i / (ny - 1)); // Leaflet needs top-left origin

    // Create a grid structure
    const grid = [];
    for (let j = 0; j < ny; j++) {
        const row = [];
        for (let i = 0; i < nx; i++) {
            row.push({ lon: gridLon[i], lat: gridLat[j] });
        }
        grid.push(row);
    }

    // Interpolate U and V wind components (using a basic linear interpolation)
    function interpolate(point, data) {
        const distances = data.map(d => Math.sqrt((point.lon - d.lon)**2 + (point.lat - d.lat)**2));
        const minIndex = distances.indexOf(Math.min(...distances));
        return data[minIndex]; // Basic nearest-neighbor interpolation
    }

    // **Bilinear Interpolation for Wind Components**
    const bilinearInterpolate = (point, data) => {
        const sorted = _.sortBy(data, d => Math.hypot(point.lon - d.lon, point.lat - d.lat));
        const nearest = sorted.slice(0, 4); // Get 4 closest points for bilinear interpolation

        if (nearest.length < 4) {
            return { u: nearest[0]?.u || 0, v: nearest[0]?.v || 0 };
        }
        
        // Compute inverse distance weights
        const weights = nearest.map(d => 1 / (Math.hypot(point.lon - d.lon, point.lat - d.lat) + 1e-6));
        const sumWeights = weights.reduce((a, b) => a + b, 0);

        const u = _.sum(nearest.map((d, i) => d.u * weights[i])) / sumWeights;
        const v = _.sum(nearest.map((d, i) => d.v * weights[i])) / sumWeights;

        return { u, v };
    };

    // Compute wind grid
    const gridU = grid.map(row => row.map(point => bilinearInterpolate(point, scatteredData).u));
    const gridV = grid.map(row => row.map(point => bilinearInterpolate(point, scatteredData).v));

    // Convert to 1D list for Leaflet-Velocity
    const gridUList = _.flatten(gridU);
    const gridVList = _.flatten(gridV);

    // Convert NaN to null (like Python version)
    const gridUListClean = gridUList.map(val => Number.isNaN(val) ? null : val);
    const gridVListClean = gridVList.map(val => Number.isNaN(val) ? null : val);

    // Generate structured wind grid data for Leaflet-Velocity
    const windGridData = [
        {
            "header": {
                "parameterUnit": "m.s-1",
                "parameterNumber": 2,
                "dx": (lonMax - lonMin) / (nx - 1),
                "dy": (latMax - latMin) / (ny - 1),
                "parameterNumberName": "eastward_wind",
                "parameterCategory": 2,
                "lo1": lonMin,
                "lo2": lonMax,
                "la1": latMax,
                "la2": latMin,
                "nx": nx,
                "ny": ny,
                "refTime": new Date().toISOString()
            },
            "data": gridUListClean
        },
        {
            "header": {
                "parameterUnit": "m.s-1",
                "parameterNumber": 3,
                "dx": (lonMax - lonMin) / (nx - 1),
                "dy": (latMax - latMin) / (ny - 1),
                "parameterNumberName": "northward_wind",
                "parameterCategory": 2,
                "lo1": lonMin,
                "lo2": lonMax,
                "la1": latMax,
                "la2": latMin,
                "nx": nx,
                "ny": ny,
                "refTime": new Date().toISOString()
            },
            "data": gridVListClean
        }
    ];

    console.log("Generated Wind Grid:", windGridData);
    return windGridData;
};
