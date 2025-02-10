# -*- coding: utf-8 -*-
import numpy as np
from scipy.interpolate import griddata
import json
import os

# Example scattered data points (from React frontend)
scattered_data = [
    {"lat": -39.28, "lon": -87.98, "u": -10.40, "v": 0.12},
    {"lat": -38.94, "lon": -87.92, "u": -24.15, "v": 1.59},
    {"lat": -38.16, "lon": -87.85, "u": -22.81, "v": 3.37},
    {"lat": -37.42, "lon": -87.81, "u": -21.6, "v": 5.17},
    {"lat": -36.72, "lon": -88.40, "u": -20.25, "v": 7.83},
    {"lat": -36.07, "lon": -88.69, "u": -18.40, "v": 9.76},
    {"lat": -34.88, "lon": -89.47, "u": -15.21, "v": 14.53},
    {"lat": -34.34, "lon": -89.97, "u": -13.03, "v": 18.26},
    {"lat": -33.85, "lon": -90.54, "u": -10.22, "v": 23.13},
    {"lat": -32.61, "lon": -92.68, "u": -10.22, "v": 23.13},
]

# Define grid resolution (nx, ny)
nx, ny = 24, 22

# Get min/max lat/lon
lon_min, lon_max = min(d["lon"] for d in scattered_data), max(d["lon"] for d in scattered_data)
lat_min, lat_max = min(d["lat"] for d in scattered_data), max(d["lat"] for d in scattered_data)

# Create grid coordinates
grid_lon = np.linspace(lon_min, lon_max, nx)
grid_lat = np.linspace(lat_min, lat_max, ny)
grid_lon, grid_lat = np.meshgrid(grid_lon, grid_lat)

# Interpolate U and V wind components
points = np.array([(d["lon"], d["lat"]) for d in scattered_data])
u_values = np.array([d["u"] for d in scattered_data])
v_values = np.array([d["v"] for d in scattered_data])

grid_u = griddata(points, u_values, (grid_lon, grid_lat), method="linear")
grid_v = griddata(points, v_values, (grid_lon, grid_lat), method="linear")

# Convert to 1D list (required for Leaflet-Velocity)
grid_u_list = grid_u.flatten().tolist()
grid_v_list = grid_v.flatten().tolist()

# Convert NaN to null
grid_u_list = [None if np.isnan(val) else val for val in grid_u.flatten()]
grid_v_list = [None if np.isnan(val) else val for val in grid_v.flatten()]

# Create structured grid data format
wind_grid_data = [
    {
        "header": {
            "parameterUnit": "m.s-1",
            "parameterNumber": 2,
            "dx": 1,
            "dy": 1,
            "parameterNumberName": "eastward_wind",
            "parameterCategory": 2,
            "lo1": lon_min,
            "lo2": lon_max,
            "la1": lat_max,  # Leaflet-Velocity requires top-left origin
            "la2": lat_min,
            "nx": nx,
            "ny": ny,
            "refTime": "2024-02-10T23:00:00Z"
        },
        "data": grid_u_list
    },
    {
        "header": {
            "parameterUnit": "m.s-1",
            "parameterNumber": 3,
            "dx": 1,
            "dy": 1,
            "parameterNumberName": "northward_wind",
            "parameterCategory": 2,
            "lo1": lon_min,
            "lo2": lon_max,
            "la1": lat_max,
            "la2": lat_min,
            "nx": nx,
            "ny": ny,
            "refTime": "2024-02-10T23:00:00Z"
        },
        "data": grid_v_list
    }
]


# # Create the directory if it doesn't exist
# if not os.path.exists(output_dir):
#     os.makedirs(output_dir)  # Create parent directories if needed

# # Save to JSON
# with open("wind_grid_data.json", "w") as f:
#     json.dump(wind_grid_data, f, indent=4)

try:
    # Save to JSON
    with open("wind_grid_data.json", "w") as f:
        json.dump(wind_grid_data, f, indent=4)
except Exception as e:
    print(f"Error saving wind data: {e}")
