import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const MapView = () => {
  const [balloons, setBalloons] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/balloons/history");
        if (response.data && Array.isArray(response.data[0])) {
          setBalloons(response.data[0]); // Ensure we always set an array
        }
      } catch (error) {
        console.error("Error fetching balloon data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <MapContainer center={[20, 0]} zoom={2} style={{ height: "100vh", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {balloons.length > 0 ? (
        balloons.map((balloon, index) => (
          <Marker key={index} position={[balloon[0], balloon[1]]}>
            <Popup>
              <strong>Altitude:</strong> {balloon[2]?.toFixed(2)} km
            </Popup>
          </Marker>
        ))
      ) : (
        <p style={{ textAlign: "center", marginTop: "10px" }}>Loading balloon data...</p>
      )}
    </MapContainer>
  );
};

export default MapView;
