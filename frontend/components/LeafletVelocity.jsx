import "leaflet-velocity/dist/leaflet-velocity.css";
import "leaflet-velocity/dist/leaflet-velocity.js";
import { forwardRef, useEffect, useState } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

const LeafletVelocity = forwardRef(({windData}, ref) => {
  const map = useMap();
  const [windGlobalLayer, setWindGlobalLayer] = useState(null);
  const [windGbrLayer, setWindGbrLayer] = useState(null);
  const [balloonWindLayer, setBalloonWindLayer] = useState(null);

  useEffect(() => {
    if (!map) return;

    let mounted = true;

    let windGbrLayer;
    let waterGbrLayer;
    let windGlobalLayer;
    let balloonWindLayer;

    // Load Global Wind Data
    fetch("/data/wind-global.json")
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;

        windGlobalLayer = L.velocityLayer({
          displayValues: true,
          displayOptions: {
            velocityType: "GBR Water",
            position: "bottomleft",
            emptyString: "No water data"
          },
          data: data,
          maxVelocity: 0.6,
          velocityScale: 0.1 // arbitrary defaults 0.005
        });

        if (ref.current && windGlobalLayer)
          ref.current.addOverlay(windGlobalLayer, "Wind - Global");
      })
      .catch((err) => console.log("Error loading Global wind data:",err));


    // Load GBR Wind Data
    fetch("/data/wind-gbr.json")
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;

        windGbrLayer = L.velocityLayer({
          displayValues: true,
          displayOptions: {
            velocityType: "GBR Wind",
            position: "bottomleft",
            emptyString: "No wind data",
            showCardinal: true
          },
          data,
          maxVelocity: 10
        });

        if (ref.current && windGbrLayer)
          ref.current.addOverlay(windGbrLayer, "Wind -GBR");
      })
      .catch((err) => console.error("Error loading GBR wind data:", err));

    fetch("/data/water-gbr.json")
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;

        waterGbrLayer = L.velocityLayer({
          displayValues: true,
          displayOptions: {
            velocityType: "GBR Water",
            position: "bottomleft",
            emptyString: "No water data"
          },
          data: data,
          maxVelocity: 0.6,
          velocityScale: 0.1 // arbitrary default 0.005
        });

        if (ref.current && waterGbrLayer)
          ref.current.addOverlay(
            waterGbrLayer,
            "Ocean Current - GBR"
          );
      })
      .catch((err) => console.log(err));

    return () => {
      mounted = false;
      if (ref.current) {
        ref.current.removeOverlay(waterGbrLayer);
        ref.current.removeOverlay(windGlobalLayer);
        ref.current.removeOverlay(windGbrLayer);
        // ref.current.removeOverlay(balloonWindLayer);
      }
    };
  }, [map]);

  
    useEffect(() => {
      if (!map || !windData || !ref.current) return;
  
      let mounted = true;

      console.log("From Leaflet data type: " + Object.prototype.toString.call(windData));
      console.log(windData.length);
      console.log("WinData: " + windData);
      console.log("WindData:", JSON.stringify(windData, null, 2));

      console.log("Adding Balloon Wind Data to Map...");
  
      // Remove previous balloon wind layer if exists
      // if (balloonWindLayer) {
      //   ref.current.removeOverlay(balloonWindLayer);
      // }
  
      // Create new wind layer for the selected balloon
      const newBalloonWindLayer = L.velocityLayer({
        displayValues: true,
        displayOptions: {
          velocityType: "Balloon Wind",
          position: "bottomleft",
          emptyString: "No balloon wind data"
        },
        data: windData,
        maxVelocity: 20
      });
  
      if (mounted && ref.current) {
        ref.current.addOverlay(newBalloonWindLayer, "Wind - Balloon");
        setBalloonWindLayer(newBalloonWindLayer);
      }
  
      return () => {
        mounted = false;
        if (ref.current && balloonWindLayer) {
          ref.current.removeOverlay(balloonWindLayer);
        }
      };
    }, [windData, map, ref]); // Updates whenever windData changes


  return null;
});


export default LeafletVelocity;
