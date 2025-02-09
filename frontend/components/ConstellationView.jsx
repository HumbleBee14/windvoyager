import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Red marker for missing data
const redMarker = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Default blue marker
const blueMarker = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const ConstellationView = () => {
  const [balloons, setBalloons] = useState({});
  const [selectedHour, setSelectedHour] = useState(0);
  const [validBalloonCount, setValidBalloonCount] = useState(0);

  const fetchData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/balloons/history");
      if (response.data) {
        setBalloons(response.data);
        setValidBalloonCount(response.data[0]?.filter(b => b.length > 1).length || 0);
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

  const findValidPosition = (balloonIndex, hour) => {
    let pastHour = null;
    let futureHour = null;
    let pastData = null;
    let futureData = null;
  
    // Search backward for last known position (PAST)
    for (let h = hour + 1; h < 24; h++) {  // Fix: Correct past lookup direction
      const prevData = balloons[h] || [];
      if (prevData[balloonIndex] && prevData[balloonIndex].length > 1) {
        pastData = prevData[balloonIndex];
        pastHour = h;
        break;
      }
    }
  
    // If no past data, search forward for next known position (FUTURE)
    if (!pastData) {
      for (let h = hour - 1; h >= 0; h--) {  // Fix: Correct future lookup direction
        const nextData = balloons[h] || [];
        if (nextData[balloonIndex] && nextData[balloonIndex].length > 1) {
          futureData = nextData[balloonIndex];
          futureHour = h;
          break;
        }
      }
    }
  
    // Default case: Use past data if available
    if (pastData) {
      return { position: pastData, source: "past", refHour: pastHour };
    }
  
    // Use future data only if past is unavailable
    if (futureData) {
      return { position: futureData, source: "future", refHour: futureHour };
    }
  
    // If no valid data, return NULL (no extrapolation possible)
    return null;
  };
  
  // ---------------------------------------------

  const selectedData = getSelectedData();

  const handleSelectionChange = (event) => {
    const hour = parseInt(event.target.value);
    setSelectedHour(hour);
    setValidBalloonCount(balloons[hour]?.filter(b => b.length > 1).length || 0);
  };

  // --------------------------------------------------------------------------------------------

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100vw" }}>
      
      {/* Control Panel (Dropdown & Button Section) */}
      <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          width: "90%", 
          marginBottom: "15px",
          padding: "0 20px"
      }}>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ fontWeight: "bold" }}>Select Hourly Snapshot:</label>
          <select onChange={handleSelectionChange} style={{ padding: "6px 2px", fontSize: "14px" }}>
            <option value="0">Current</option>
            {[...Array(23).keys()].map((h) => (
              <option key={h + 1} value={h + 1}>{h + 1}H ago</option>
            ))}
          </select>
        </div>

        <div style={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
          <span style={{ fontWeight: "bold", textAlign: "center" }}>
            Active Balloons: <span style={{ color: "limegreen" }}>{validBalloonCount}</span>
          </span>
        </div>

        <button onClick={fetchData} style={{ padding: "6px 12px", cursor: "pointer", fontWeight: "bold" }}>
          Refresh Data
        </button>

      </div>


  
      {/* Centered Map Container */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100vw", height: "85vh" }}>
        <MapContainer style={{ width: "90%", height: "100%" }} center={[20, 0]} zoom={2}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
  
          {selectedData.map((balloon, index) => {
            let isMissing = balloon.length <= 1;
            let markerData = balloon;
            let source = "current";
            let refHour = null;
  
            if (isMissing) {
              const replacement = findValidPosition(index, selectedHour);
              if (replacement) {
                markerData = replacement.position;
                source = replacement.source;
                refHour = replacement.refHour;
              }
            }
  
            return (
              <Marker key={index} position={[markerData[0], markerData[1]]} icon={isMissing ? redMarker : blueMarker}>
                <Popup>
                  <strong>Balloon #: </strong> {index + 1} <br />
                  <strong>Latitude:</strong> {markerData[0]?.toFixed(5) ?? "Unknown"}° <br />
                  <strong>Longitude:</strong> {markerData[1]?.toFixed(5) ?? "Unknown"}° <br />
                  <strong>Altitude:</strong> {markerData[2]?.toFixed(2) ?? "Unknown"} km <br />
                  {isMissing && (
                    <span style={{ color: "red" }}>
                      Data Missing at {selectedHour}H → Using {source === "past" 
                        ? `Past data from ${refHour}h ago` 
                        : `Future data from ${Math.abs(refHour - selectedHour)}h ahead`}
                    </span>
                  )}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
  
};

export default ConstellationView;
