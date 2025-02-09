import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import axios from "axios";
import BalloonDataPopup from "./BalloonDataPopup";
import "./BalloonDataPopup.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const redMarker = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const blueMarker = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
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

const BalloonTracker = () => {
  const [balloons, setBalloons] = useState({});
  const [balloonId, setBalloonId] = useState(1);
  const [trajectory, setTrajectory] = useState([]); // Stores only valid recorded data (adjusted for map)
  const [originalTrajectoryData, setOriginalTrajectoryData] = useState([]); // Stores unmodified original data
  const [missingHours, setMissingHours] = useState(new Set()); // Stores missing hour timestamps
  const [balloonDataLog, setBalloonDataLog] = useState([]);
  const [showPopup, setShowPopup] = useState(false);

  const fetchData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/balloons/history");
      if (response.data) {
        setBalloons(response.data);
      }
    } catch (error) {
      console.error("Error fetching balloon data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    extractBalloonTrajectory();
  }, [balloonId]);

  // --------------------------------------------------------------------------------
  
  const extractBalloonTrajectory = () => {
    if (!balloonId || isNaN(balloonId) || balloonId < 1 || balloonId > 1000) return;
  
    const recordedTrajectory = [];
    const originalData = []; // Stores original, unmodified data
    const missingTimestamps = new Set();
    const balloonLog = [];
  
    let lastValidLongitude = null; // Track previous longitude
  
    for (let hour = 0; hour < 24; hour++) {
      const hourData = balloons[hour] || [];
      const balloonData = hourData[balloonId - 1];

      if (balloonData && !balloonData.includes(null)) {
        let lat = balloonData[0];
        let lon = balloonData[1];
        let alt = balloonData[2];

        // Store original data without any modification
        originalData.push({
          position: [lat, lon],
          altitude: alt,
          hour,
          missing: false
        });

        balloonLog.push({ hour, lat, lon, alt, type: "Recorded" });  // NOTE: Importatn to keep it here, to keep log data original

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
          missing: false
        });

      } else {
        // Track missing hour
        balloonLog.push({ hour, lat: "Missing", lon: "Missing", alt: "Missing", type: "Missing" });
        missingTimestamps.add(hour);
      }
    }

    setTrajectory(recordedTrajectory);
    setOriginalTrajectoryData(originalData);
    setBalloonDataLog(balloonLog);
    setMissingHours(missingTimestamps);
    console.log(`Missing Hours: ${Array.from(missingTimestamps).join(", ")}`);
  };

  // --------------------------------------------------------------------------------

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "10px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <label>Track Balloon #: </label>
          <input
            type="number"
            min="1"
            max="1000"
            value={balloonId}
            onChange={(e) => setBalloonId(parseInt(e.target.value, 10) || 1)}
            style={{ width: "60px", textAlign: "center" }}
          />
          <button onClick={extractBalloonTrajectory} style={{ padding: "5px 10px", cursor: "pointer" }}>
            Track Balloon
          </button>
        </div>

        {/* Missing Data Hours Display */}
        {missingHours.size > 0 && (
          <div style={{
            marginTop: "10px",
            padding: "10px",
            background: "#222",
            color: "white",
            borderRadius: "8px",
            width: "fit-content",
            fontSize: "14px"
          }}>
            <strong>Missing Data Hours:</strong> {Array.from(missingHours).join(", ")}
          </div>
        )}

        <button onClick={() => setShowPopup(true)} style={{ padding: "5px 15px", cursor: "pointer", background: "#222", color: "#fff", borderRadius: "5px" }}>
          Show Data Log 📊
        </button>
      </div>

      <MapContainer center={[20, 0]} zoom={3} style={{ height: "85vh", width: "90vw" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <AutoZoom trajectory={trajectory} /> {/* Auto-adjust zoom when trajectory updates */}
        <Polyline positions={trajectory.map((p) => p.position)} color="red" />

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

      {showPopup && <BalloonDataPopup data={balloonDataLog} balloonId={balloonId} onClose={() => setShowPopup(false)} />}
    </div>
  );
};

export default BalloonTracker;
