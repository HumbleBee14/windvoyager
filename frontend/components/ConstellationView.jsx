import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const ConstellationView = () => {
  const [balloons, setBalloons] = useState({});
  const [selectedHour, setSelectedHour] = useState(0);
  const [recordCount, setRecordCount] = useState(0);

  const fetchData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/balloons/history");
      if (response.data) {
        setBalloons(response.data);
        setRecordCount(response.data[0]?.length || 0);
      }
    } catch (error) {
      console.error("Error fetching balloon data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getSelectedData = () => {
    return balloons[selectedHour] || [];
  };

  const handleSelectionChange = (event) => {
    const hour = parseInt(event.target.value);
    setSelectedHour(hour);
    setRecordCount(balloons[hour]?.length || 0);
  };

  const selectedData = getSelectedData();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "10px" }}>
        <label>Select Hourly Snapshot: </label>
        <select onChange={handleSelectionChange}>
          <option value="0">Current</option>
          {[...Array(23).keys()].map((h) => (
            <option key={h + 1} value={h + 1}>{h + 1}H ago</option>
          ))}
        </select>

        <span style={{ fontWeight: "bold" }}>Total Balloons: {recordCount}</span>

        <button onClick={fetchData} style={{ padding: "5px 10px", cursor: "pointer" }}>
          Fetch Fresh Records
        </button>
      </div>

      <MapContainer center={[20, 0]} zoom={2} style={{ height: "85vh", width: "90vw" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {selectedData.map((balloon, index) => (
          <Marker key={index} position={[balloon[0], balloon[1]]}>
            <Popup>
              <strong>Balloon #: </strong> {index + 1} <br />
              <strong>Latitude:</strong> {balloon[0].toFixed(5)}° <br />
              <strong>Longitude:</strong> {balloon[1].toFixed(5)}° <br />
              <strong>Altitude:</strong> {balloon[2]?.toFixed(2) ?? "Unknown"} km
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ConstellationView;
