import "leaflet-velocity/dist/leaflet-velocity.css";
import "leaflet-velocity/dist/leaflet-velocity.js";
import { forwardRef, useEffect, useState } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

const LeafletVelocity = forwardRef(({windData}, ref) => {
  const map = useMap();
  const [balloonWindLayer, setBalloonWindLayer] = useState(null);
  
  useEffect(() => {
    if (!map) return;
    let mounted = true;

    let windGlobalLayer;

    // Load Global Wind Data
    fetch("/data/wind-global.json")
      .then((response) => response.json())
      .then((data) => {
        if (!mounted) return;

        windGlobalLayer = L.velocityLayer({
          displayValues: true,
          displayOptions: {
            velocityType: "Wind",
            position: "bottomleft",
            emptyString: "No wind data"
          },
          data: data,
          maxVelocity: 0.6,
          velocityScale: 0.1 // arbitrary defaults 0.005
        });


        if (ref.current && windGlobalLayer) {
          ref.current.addOverlay(windGlobalLayer, "Wind - Global");
        }
      })
      .catch((err) => console.log("Error loading Global wind data:",err));


    return () => {
      mounted = false;
      if (ref.current) {
        ref.current.removeOverlay(windGlobalLayer);
      }
    };
  }, [map]);

  
  useEffect(() => {
    if (!map || !windData || !ref.current) return;

    // console.log("Updating Balloon Wind Layer...");

    // Remove previous balloon wind layer safely
    if (balloonWindLayer) {
      // console.log("Removing Previous Balloon Wind Layer...");
      map.removeLayer(balloonWindLayer);
      ref.current.removeLayer(balloonWindLayer);
    }

    // Create new balloon wind layer
    const newBalloonWindLayer = L.velocityLayer({
      displayValues: true,
      displayOptions: {
        velocityType: "Balloon Wind",
        position: "bottomleft",
        emptyString: "No velocity data",
        showCardinal: true,
        directionString: "Direction",
        speedString: "Speed",
      },
      data: windData,
      // minVelocity: 0, // used to align color scale
      // maxVelocity: 3, // used to align color scale
      // velocityScale: 0.1, // modifier for particle animations, arbitrarily defaults to 0.005
      // colorScale: [], // define your own array of hex/rgb colors
      onAdd: null, // callback function
      onRemove: null, // callback function
      opacity: 0.20, // layer opacity, default 0.97
    });

    ref.current.addOverlay(newBalloonWindLayer, "Wind - Balloon");

    setBalloonWindLayer(newBalloonWindLayer);

    return () => {
      // Cleanup: Remove current layer when component unmounts or balloon changes
      if (map.hasLayer(newBalloonWindLayer)) {
        // console.log("Removing Current Balloon Wind Layer...");
        map.removeLayer(newBalloonWindLayer);
      }
      if (ref.current) {
        ref.current.removeLayer(newBalloonWindLayer);
      }
    };

  }, [windData, map, ref]);


  return null;
});

/*

// [FORCED ADD or REMOVE] - If you want the layer to be visible by default (NOT recommended)
// myNewLayer.addTo(map);
// map.removeLayer(myLayer);

// [REMOVE OVERLAY ERROR] - Earlier, removeOverlay() did not work because `ref.current` 
// was not actually a Layer Control. Now it works because we add layers correctly.

// [MOUNT CHECK] - Earlier, some issues happened due to async updates.
// let mounted = true;
// return () => { mounted = false; };

*/

export default LeafletVelocity;
