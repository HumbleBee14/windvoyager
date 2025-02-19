import { forwardRef, useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import 'leaflet.heat';

const HeatmapLayer = forwardRef(({ points }, ref) => {
    const map = useMap();
    const [heatLayer, setHeatLayer] = useState(null);

    useEffect(() => {
        if (!map || !points.length || !ref.current) return;

    // Remove existing layer if any
    if (heatLayer) {
        map.removeLayer(heatLayer);
        ref.current.removeLayer(heatLayer);
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
    const newHeatLayer  = L.heatLayer(points, {
      ...defaultOptions,
    });

    // Add to layer control
    ref.current.addOverlay(newHeatLayer, "Heatmap");
    setHeatLayer(newHeatLayer);

    // Add to map
    // map.addLayer(heatLayer);
    // heatLayer.addTo(map);


    return () => {
        if (map.hasLayer(newHeatLayer)) {
          map.removeLayer(newHeatLayer);
        }
        if (ref.current) {
          ref.current.removeLayer(newHeatLayer);
        }
      };
    }, [map, points, ref]);
  
    return null;
  });
  

export default HeatmapLayer;
