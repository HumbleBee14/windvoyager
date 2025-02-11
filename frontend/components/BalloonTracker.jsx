import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, LayersControl, useMap } from "react-leaflet";
import BalloonDataPopup from "./BalloonDataPopup";
import LeafletVelocity from "./LeafletVelocity";
import { requestWindData } from "../services/balloonService";
import { calculateWindSpeedAndDirection, getCompassDirection } from "../utils/windUtils";
import L from "leaflet";
import "./BalloonDataPopup.css";
import "leaflet/dist/leaflet.css";

// --------------------------------------------------------------------------

const redMarker = new L.Icon({
  iconUrl: "/icons/marker-icon-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const blueMarker = new L.Icon({
  iconUrl: "/icons/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Auto-Zoom Component for dynamic fitBounds
const AutoZoom = ({ trajectory }) => {
  const map = useMap();

  useEffect(() => {
    if (trajectory.length > 0) {
      const bounds = L.latLngBounds(trajectory.map((p) => p.position));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 5 });
    }
  }, [trajectory, map]);

  return null;
};

// Arrowhead Component
const AddArrowheads = ({ trajectory }) => {
  const map = useMap();

  useEffect(() => {
    if (trajectory.length > 1) {
      const reversedTrajectory = [...trajectory].reverse(); // Fix: Reverse order
      const polyline = L.polyline(reversedTrajectory.map(p => p.position), { 
        color: "red", 
        weight: 3, 
        dashArray: "6, 6"
      });

      polyline.arrowheads({
        size: "15px",
        frequency: "100px",
        color: "red"
      });

      polyline.addTo(map);

      return () => {
        map.removeLayer(polyline); // Clean up previous layers
      };
    }
  }, [trajectory, map]);

  return null;
};


// --------------------------------------------------------------------------
// --------------------------------------------------------------------------

const BalloonTracker = ({balloonData, initialBalloonId }) => {
  const [balloonId, setBalloonId] = useState(initialBalloonId  || 1);
  const [trajectory, setTrajectory] = useState([]); // Stores only valid recorded data (adjusted for map)
  const [originalTrajectoryData, setOriginalTrajectoryData] = useState([]); // Stores unmodified original data
  const [missingHours, setMissingHours] = useState(new Set()); // Stores missing hour timestamps
  const [balloonDataLog, setBalloonDataLog] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [windData, setWindData] = useState(null);

  const layerControlRef = useRef();

  useEffect(() => {
    extractBalloonTrajectory();
  }, [balloonId, balloonData]);

  useEffect(() => {
    if (initialBalloonId) {
      setBalloonId(initialBalloonId);
    }
  }, [initialBalloonId]);

  useEffect(() => {
    fetchWindData();
  }, [balloonId]);


  // ------------------------------------------------------
  const fetchWindData = async () => {
    // if (!balloonId) balloonId = 1;

    console.log(`Fetching Wind Data for Balloon #${balloonId}...`);

    try {
        const windJson = await requestWindData(balloonId);
        if (windJson) {
          console.log("Received wind data:", windJson);
          setWindData({ ...windJson });  // Imp: Create a new object reference! to trigger update in map when data is downloaded
        }
      } catch (error) {
          console.error("Error fetching wind data:", error);
      }
  };
  
  const extractBalloonTrajectory = () => {
    if (!balloonData || !balloonId || isNaN(balloonId) || balloonId < 1 || balloonId > 1000) return;
  
    const recordedTrajectory = [];
    const originalData = []; // Stores original, unmodified data
    const missingTimestamps = new Set();
    const balloonLog = [];
  
    let lastValidLatitude = null, lastValidLongitude = null, lastValidAltitude = null, lastValidHour = null;

  
    for (let hour = 23; hour >= 0; hour--) {
      const hourData = balloonData[hour] || [];
      const balloon = hourData[balloonId - 1];

      if (balloon && !balloon.includes(null)) {
        let lat = balloon[0];
        let lon = balloon[1];
        let alt = balloon[2];

        // Store original data without any modification
        originalData.push({
          position: [lat, lon],
          altitude: alt,
          hour,
          missing: false
        });

        let windData = { speed: "-", direction: "-", compass: "-" };

        // Compute wind profile ONLY if a valid previous hour exists
        if (lastValidHour !== null) {
            windData = calculateWindSpeedAndDirection(
                lastValidLatitude, lastValidLongitude, lat, lon, hour, lastValidHour
            );

            if (windData.direction !== "-") {
              windData.compass = getCompassDirection(parseFloat(windData.direction));
          }
        }

        // balloonLog.push({ hour, lat, lon, alt, type: "Recorded" });   // NOTE: Importatn to keep it here, to keep log data original
        balloonLog.push({
            hour,
            lat,
            lon,
            alt,
            windSpeed: windData.speed,
            windDirection: windData.direction,
            windCompass: windData.compass,
            type: "Recorded"
        });

        // If there's a previous point, check for sudden longitude wraparound
        if (lastValidLongitude !== null) {
          let lonDiff = lon - lastValidLongitude;

          if (Math.abs(lonDiff) > 180) {
            // If crossing the IDL, adjust longitude by shifting range
            if (lon > 0) {
              lon -= 360; // Convert from 179°E to -181°W
            } else {
              lon += 360; // Convert from -179°W to 181°E
            }
          }
        }

        lastValidLongitude = lon; // Update last valid longitude

        recordedTrajectory.push({
          position: [lat, lon],
          altitude: alt,
          hour,
          windSpeed: windData.speed,
          windDirection: windData.direction,
          missing: false
        });

        // Update last valid data for next iterations
        lastValidLatitude = lat;
        lastValidLongitude = lon;
        lastValidAltitude = alt;
        lastValidHour = hour;

      } else {
        // Track missing hour
        balloonLog.push({ hour, lat: "-", lon: "-", alt: "-", windSpeed: "-", windDirection: "-", type: "Missing" });
        missingTimestamps.add(hour);
      }
    }

    setTrajectory(recordedTrajectory.reverse());
    setOriginalTrajectoryData(originalData.reverse());
    setBalloonDataLog(balloonLog.reverse());
    setMissingHours(new Set([...missingTimestamps].reverse()));
    console.log(`Missing Hours: ${Array.from(missingTimestamps).join(", ")}`);
  };


  // --------------------------------------------------------------------------------
  // --------------------------------------------------------------------------------

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100vw" }}>

      {/* Control Panel */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "90%", padding: "10px 20px", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "15px", flexDirection: "column" }}> 
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{ fontWeight: "bold" }}>Track Balloon #: </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={balloonId}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10) || 1;
                setBalloonId(value);
              }}
              style={{ width: "60px", textAlign: "center" }}
            />
            <button onClick={extractBalloonTrajectory} style={{ padding: "5px 10px", cursor: "pointer" }}>
              Track
            </button>
          </div>

          {/* Warning message */}
          {balloonId > 1000 && (
            <span style={{ color: "red", fontSize: "14px", fontWeight: "bold", marginTop: "5px" }}>
              ⚠ Balloon ID cannot be more than 1000!
            </span>
          )}
      </div>


        {/* Missing Data Hours Display */}
        {missingHours.size > 0 && (
          <div style={{
            padding: "10px",
            background: "#222",
            color: "white",
            borderRadius: "8px",
            width: "fit-content",
            fontSize: "14px",
            fontWeight: "bold",
            textAlign: "center",
            margin: "0 auto"
          }}>
            <strong>Data Gaps (Hours Ago): </strong> {Array.from(missingHours).join(", ")}
          </div>
        )}

        <button onClick={() => setShowPopup(true)} style={{ padding: "5px 15px", cursor: "pointer", background: "#222", color: "#fff", borderRadius: "5px" }}>
          Data Log 📊
        </button>
      </div>

      {/* _____________________________________ Map Container _____________________________________*/}
      
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100vw", height: "85vh" }}>

        <MapContainer style={{ width: "90%", height: "100%" }} center={[20, 0]} zoom={3}>


        <LayersControl position="topright" ref={layerControlRef}>

          {/* Standard Map (Default) */}
          <LayersControl.BaseLayer checked name="Standard Map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>

          {/* Satellite Layer */}
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer url="http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay name="Wind">
              {windData && <LeafletVelocity key={JSON.stringify(windData)} ref={layerControlRef} windData={windData} />}
          </LayersControl.Overlay>

        </LayersControl>

            {/* <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /> */}
            <AutoZoom trajectory={trajectory} /> {/* Auto-adjust zoom when trajectory updates */}
            {/* <Polyline positions={trajectory.map((p) => p.position)} color="red" /> */}
            <AddArrowheads trajectory={trajectory} />

              {trajectory.map((balloon, index) => {
                // Find the corresponding original value
                const originalBalloon = originalTrajectoryData.find((b) => b.hour === balloon.hour);

                return (
                  <Marker key={index} position={balloon.position} icon={blueMarker}>
                    <Popup>
                      <strong>Balloon #:</strong> {balloonId} <br />
                      <strong>Hour:</strong> {balloon.hour}H ago <br />
                      <strong>Latitude:</strong> {originalBalloon ? originalBalloon.position[0].toFixed(5) : balloon.position[0].toFixed(5)}° <br />
                      <strong>Longitude:</strong> {originalBalloon ? originalBalloon.position[1].toFixed(5) : balloon.position[1].toFixed(5)}° <br />
                      <strong>Altitude:</strong> {originalBalloon ? originalBalloon.altitude.toFixed(2) : balloon.altitude.toFixed(2)} km
                    </Popup>
                  </Marker>
                );
              })}

        </MapContainer>

      </div>

      {showPopup && <BalloonDataPopup data={balloonDataLog} balloonId={balloonId} onClose={() => setShowPopup(false)} />}
    </div>
  );
};

export default BalloonTracker;
