import Delaunator from 'delaunator';
import fs from 'fs';

// Example scattered data points
// const scattered_data = [
//     {"lat": -39.28, "lon": -87.98, "u": -10.40, "v": 0.12},
//     {"lat": -38.94, "lon": -87.92, "u": -24.15, "v": 1.59},
//     {"lat": -38.16, "lon": -87.85, "u": -22.81, "v": 3.37},
//     {"lat": -37.42, "lon": -87.81, "u": -21.6, "v": 5.17},
//     {"lat": -36.72, "lon": -88.40, "u": -20.25, "v": 7.83},
//     {"lat": -36.07, "lon": -88.69, "u": -18.40, "v": 9.76},
//     {"lat": -34.88, "lon": -89.47, "u": -15.21, "v": 14.53},
//     {"lat": -34.34, "lon": -89.97, "u": -13.03, "v": 18.26},
//     {"lat": -33.85, "lon": -90.54, "u": -10.22, "v": 23.13},
//     {"lat": -32.61, "lon": -92.68, "u": -10.22, "v": 23.13}
// ];


// Helper functions
function linspace(start, stop, num) {
    const step = (stop - start) / (num - 1);
    return Array.from({length: num}, (_, i) => start + step * i);
}
function meshgrid(x, y) {
    // Reverse the order of y coordinates to match Leaflet-Velocity's expectations
    const reversedY = [...y].reverse();
    const meshX = [];
    const meshY = [];
    
    for (let i = 0; i < reversedY.length; i++) {
        meshX.push([...x]);
        meshY.push(Array(x.length).fill(reversedY[i]));
    }
    return [meshX, meshY];
}


function calculateBarycentricCoordinates(point, triangle) {
    const [x, y] = point;
    const [[x1, y1], [x2, y2], [x3, y3]] = triangle;
    
    const denominator = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3));
    const lambda1 = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / denominator;
    const lambda2 = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / denominator;
    const lambda3 = 1 - lambda1 - lambda2;
    
    return [lambda1, lambda2, lambda3];
}

function interpolatePoint(point, trianglePoints, values) {
    const baryCoords = calculateBarycentricCoordinates(point, trianglePoints);
    if (baryCoords.some(c => isNaN(c) || c < -1e-10 || c > 1 + 1e-10)) {
        return null;
    }
    return baryCoords[0] * values[0] + baryCoords[1] * values[1] + baryCoords[2] * values[2];
}

export function generateWindGridData(scattered_data) {
    const nx = 30, ny = 25;
    
    // Get min/max lat/lon
    const lonMin = Math.min(...scattered_data.map(d => d.lon));
    const lonMax = Math.max(...scattered_data.map(d => d.lon));
    const latMin = Math.min(...scattered_data.map(d => d.lat));
    const latMax = Math.max(...scattered_data.map(d => d.lat));

    // Add significant padding to ensure complete coverage
    const padding = 2.0; // Increase padding (in degrees) to cover more area
    // const lonMin = Math.min(...scattered_data.map(d => d.lon)) - padding;
    // const lonMax = Math.max(...scattered_data.map(d => d.lon)) + padding;
    // const latMin = Math.min(...scattered_data.map(d => d.lat)) - padding;
    // const latMax = Math.max(...scattered_data.map(d => d.lat)) + padding;


    
    // Create grid coordinates
    const gridLon = linspace(lonMin, lonMax, nx);
    const gridLat = linspace(latMin, latMax, ny);
    const [meshLon, meshLat] = meshgrid(gridLon, gridLat);
    
    // Prepare points for triangulation
    const points = scattered_data.map(d => [d.lon, d.lat]).flat();
    const delaunay = new Delaunator(points);
    const triangles = [];
    
    // Extract triangles
    for (let i = 0; i < delaunay.triangles.length; i += 3) {
        triangles.push([
            [points[2 * delaunay.triangles[i]], points[2 * delaunay.triangles[i] + 1]],
            [points[2 * delaunay.triangles[i + 1]], points[2 * delaunay.triangles[i + 1] + 1]],
            [points[2 * delaunay.triangles[i + 2]], points[2 * delaunay.triangles[i + 2] + 1]]
        ]);
    }
    
    // Interpolate U and V components
    const gridU = Array(ny).fill().map(() => Array(nx).fill(null));
    const gridV = Array(ny).fill().map(() => Array(nx).fill(null));
    
    for (let i = 0; i < ny; i++) {
        for (let j = 0; j < nx; j++) {
            const point = [meshLon[i][j], meshLat[i][j]];
            
            for (const triangle of triangles) {
                const triangleIndices = triangle.map(p => 
                    scattered_data.findIndex(d => d.lon === p[0] && d.lat === p[1]));
                
                if (triangleIndices.includes(-1)) continue;
                
                const uValues = triangleIndices.map(idx => scattered_data[idx].u);
                const vValues = triangleIndices.map(idx => scattered_data[idx].v);
                
                const u = interpolatePoint(point, triangle, uValues);
                const v = interpolatePoint(point, triangle, vValues);
                
                if (u !== null && v !== null) {
                    gridU[i][j] = u;
                    gridV[i][j] = v;
                    break;
                }
            }
        }
    }
    
    return [
        {
            header: {
                parameterUnit: "m.s-1",
                parameterNumber: 2,
                dx: 1,
                dy: 1,
                parameterNumberName: "eastward_wind",
                parameterCategory: 2,
                lo1: lonMin,
                lo2: lonMax,
                la1: latMax,
                la2: latMin,
                nx: nx,
                ny: ny,
                refTime: new Date().toISOString()
            },
            data: gridU.flat()
        },
        {
            header: {
                parameterUnit: "m.s-1",
                parameterNumber: 3,
                dx: 1,
                dy: 1,
                parameterNumberName: "northward_wind",
                parameterCategory: 2,
                lo1: lonMin,
                lo2: lonMax,
                la1: latMax,
                la2: latMin,
                nx: nx,
                ny: ny,
                refTime: new Date().toISOString()
            },
            data: gridV.flat()
        }
    ];
}


// const wind_grid_data = generateWindGridData(scattered_data);


// Save to JSON file
// try {
//     fs.writeFileSync('wind_grid_data_js2.json', JSON.stringify(wind_grid_data, null, 4));
//     console.log('Data successfully written to wind_grid_data_js.json');
// } catch (err) {
//     console.error('Error writing file:', err);
// }
