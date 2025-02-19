import { forwardRef, useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import 'leaflet.heat';

const HeatmapLayer = forwardRef(({ trajectory }, ref) => {
    const map = useMap();
    const [heatLayer, setHeatLayer] = useState(null);

    useEffect(() => {
        if (!map || !trajectory.length || !ref.current) return;

        // Remove existing layer if any
        if (heatLayer) {
            map.removeLayer(heatLayer);
            ref.current.removeLayer(heatLayer);
        }

        // Extract and normalize points
        const heatmapPoints = trajectory
            .filter(point => point.weather?.temperature !== undefined) // Ensure valid weather data
            .map(point => [
                point.position[0], 
                point.position[1], 
                Math.min(1, Math.max(0, (point.weather.temperature + 20) / 50)) // Normalize temp
            ]);

        if (heatmapPoints.length === 0) {
            console.warn("No valid points for heatmap.");
            return;
        }

        // Configure default options
        const defaultOptions = {
            radius: 35,
            blur: 15,
            maxZoom: 10,
            minOpacity: 0.4,
            gradient: {
                0.2: "#00f",   // Cold (Blue)
                0.4: "#0ff",   // Cool (Cyan)
                0.6: "#ff0",   // Warm (Yellow)
                0.8: "#f80",   // Hot (Orange)
                1.0: "#f00",   // Very Hot (Red)
            },
        };

        // Create heatmap layer
        const newHeatLayer = L.heatLayer(heatmapPoints, defaultOptions);

        // Add to layer control
        ref.current.addOverlay(newHeatLayer, "Temp Heatmap");
        setHeatLayer(newHeatLayer);

        return () => {
            if (map.hasLayer(newHeatLayer)) {
                map.removeLayer(newHeatLayer);
            }
            if (ref.current) {
                ref.current.removeLayer(newHeatLayer);
            }
        };
    }, [map, trajectory, ref]);

    return null;
});

export default HeatmapLayer;