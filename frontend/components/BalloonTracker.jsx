import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom Red Marker for Missing Data
const redMarker = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Default Blue Marker
const blueMarker = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const BalloonTracker = () => {
  const [balloons, setBalloons] = useState({});
  const [balloonId, setBalloonId] = useState("");
  const [trajectory, setTrajectory] = useState([]);

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

  const extractBalloonTrajectory = () => {
    if (!balloonId || isNaN(balloonId) || balloonId < 1 || balloonId > 1000) return;

    const balloonTrajectory = [];
    let lastValidPoint = null;

    for (let hour = 0; hour < 24; hour++) {
      const hourData = balloons[hour] || [];
      const balloonData = hourData[balloonId - 1];

      if (balloonData && !balloonData.includes(null)) {
        balloonTrajectory.push({
          position: [balloonData[0], balloonData[1]],
          altitude: balloonData[2], 
          hour, 
          missing: false
        });
        lastValidPoint = balloonData;
      } else if (lastValidPoint) {
        // Keep track of missing data and use red marker
        const midpoint = [
          (lastValidPoint[0] + (balloonData?.[0] ?? lastValidPoint[0])) / 2,
          (lastValidPoint[1] + (balloonData?.[1] ?? lastValidPoint[1])) / 2
        ];
        balloonTrajectory.push({ position: midpoint, hour, missing: true });
      }
    }

    setTrajectory(balloonTrajectory);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "10px" }}>
        <label>Track Balloon #: </label>
        <input
          type="number"
          min="1"
          max="1000"
          value={balloonId}
          onChange={(e) => setBalloonId(e.target.value)}
          style={{ width: "60px", textAlign: "center" }}
        />
        <button onClick={extractBalloonTrajectory} style={{ padding: "5px 10px", cursor: "pointer" }}>
          Track Balloon
        </button>
      </div>

      <MapContainer center={[20, 0]} zoom={2} style={{ height: "85vh", width: "90vw" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Polyline positions={trajectory.map(p => p.position)} color="red" />

        {trajectory.map((balloon, index) => (
          <Marker key={index} position={balloon.position} icon={balloon.missing ? redMarker : blueMarker}>
            <Popup>
              {balloon.missing ? (
                <strong style={{ color: "red" }}>Missing Data at {balloon.hour}H ago</strong>
              ) : (
                <>
                  <strong>Hour:</strong> {balloon.hour}H ago <br />
                  <strong>Latitude:</strong> {balloon.position[0].toFixed(5)}° <br />
                  <strong>Longitude:</strong> {balloon.position[1].toFixed(5)}° <br />
                  <strong>Altitude:</strong> {balloon.altitude.toFixed(2)} km
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default BalloonTracker;
