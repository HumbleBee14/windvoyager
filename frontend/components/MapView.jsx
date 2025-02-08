import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const MapView = () => {
  const [balloons, setBalloons] = useState({});
  const [selectedHour, setSelectedHour] = useState(0); // Default: current hour data
  const [recordCount, setRecordCount] = useState(0);

  // Function to fetch balloon data from API
  const fetchData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/balloons/history");
      if (response.data) {
        setBalloons(response.data);
        updateRecordCount(response.data[0]); // Set initial count
      }
    } catch (error) {
      console.error("Error fetching balloon data:", error);
    }
  };

  useEffect(() => {
    fetchData(); // Fetch initial data when component mounts
  }, []);

  // Get data for the selected hour
  const getSelectedData = () => {
    return balloons[selectedHour] || [];
  };

  // Update record count when selection changes
  const updateRecordCount = (data) => {
    setRecordCount(data ? data.length : 0);
  };

  // Handle selection change for hour
  const handleSelectionChange = (event) => {
    const hour = parseInt(event.target.value);
    setSelectedHour(hour);
    updateRecordCount(balloons[hour]);
  };

  const selectedData = getSelectedData();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2>WindVoyager - Balloon Tracker</h2>

      {/* Control Panel */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "10px" }}>
        {/* Hour Selection Dropdown */}
        <label>Select Hourly Snapshot: </label>
        <select onChange={handleSelectionChange}>
          <option value="0">Current</option>
          {[...Array(23).keys()].map((h) => (
            <option key={h + 1} value={h + 1}>{h + 1}H ago</option> // Fixed indexing
          ))}
        </select>

        {/* Display total balloon count */}
        <span style={{ fontWeight: "bold" }}>Total Balloons: {recordCount}</span>

        {/* Fetch Fresh Records Button */}
        <button onClick={fetchData} style={{ padding: "5px 10px", cursor: "pointer" }}>
          Fetch Fresh Records
        </button>
      </div>

      {/* Centered Map Display */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <MapContainer center={[20, 0]} zoom={2} style={{ height: "85vh", width: "90vw" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Render balloon positions */}
          {selectedData.map((balloon, index) => {
            if (!balloon || balloon.includes(null)) return null; // Skip invalid data

            return (
              <Marker key={index} position={[balloon[0], balloon[1]]}>
                <Popup>
                  <strong>Latitude:</strong> {balloon[0].toFixed(5)}° <br />
                  <strong>Longitude:</strong> {balloon[1].toFixed(5)}° <br />
                  <strong>Altitude:</strong> {balloon[2]?.toFixed(2) ?? "Unknown"} km
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
