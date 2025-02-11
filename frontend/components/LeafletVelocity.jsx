import "leaflet-velocity/dist/leaflet-velocity.css";
import "leaflet-velocity/dist/leaflet-velocity.js";
import { forwardRef, useEffect, useState } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

const LeafletVelocity = forwardRef(({windData}, ref) => {
  const map = useMap();
  const [windGlobalLayer, setWindGlobalLayer] = useState(null);
  const [windGbrLayer, setWindGbrLayer] = useState(null);
  // const [balloonWindLayer, setBalloonWindLayer] = useState(null);

  useEffect(() => {
    if (!map) return;

    let mounted = true;

    // Load Global Wind Data
    fetch("/data/wind-global.json")
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;

        const layer = L.velocityLayer({
          displayValues: true,
          displayOptions: {
            velocityType: "Wind",
            position: "bottomleft",
            emptyString: "No wind data"
          },
          data: data,
          maxVelocity: 10
        });

        setWindGlobalLayer(layer);
        if (ref.current) ref.current.addOverlay(layer, "Wind - Global");
      })
      .catch((err) => console.error("Error loading global wind data:", err));

    // Load GBR Wind Data
    fetch("/data/wind-gbr.json")
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;

        const layer = L.velocityLayer({
          displayValues: true,
          displayOptions: {
            velocityType: "Wind",
            position: "bottomleft",
            emptyString: "No wind data",
            showCardinal: true
          },
          data: data,
          maxVelocity: 10
        });

        setWindGbrLayer(layer);
        if (ref.current) ref.current.addOverlay(layer, "Wind");
      })
      .catch((err) => console.error("Error loading GBR wind data:", err));

    return () => {
      mounted = false;
      if (ref.current) {
        ref.current.removeOverlay(windGlobalLayer);
        ref.current.removeOverlay(windGbrLayer);
        // ref.current.removeOverlay(balloonWindLayer);
      }
    };
  }, [map]);

  return null;
});


export default LeafletVelocity;
