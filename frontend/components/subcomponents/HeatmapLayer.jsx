import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const HeatmapLayer = ({ points, options = {} }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points.length) return;

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
    const heatLayer = L.heatLayer(points, {
      ...defaultOptions,
      ...options
    });

    // Add to map
    // map.addLayer(heatLayer);
    heatLayer.addTo(map);

    // Cleanup on unmount
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, options]);

  return null;
};

export default HeatmapLayer;
