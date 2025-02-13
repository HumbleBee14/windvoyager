import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, LayersControl, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-arrowheads";


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

const ConstellationView = ({ processedHourlyData, selectedHour, onHourChange, refreshData, trackBalloon }) => {
  const [validBalloonCount, setValidBalloonCount] = useState(0);

  // Recalculate valid balloons when data updates
  useEffect(() => {
    setValidBalloonCount(processedHourlyData.filter(b => !b.isMissing).length);
  }, [processedHourlyData]);
  
  // ---------------------------------------------

  const handleSelectionChange = (event) => {
    const hour = parseInt(event.target.value);
    onHourChange(hour);
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

        <button onClick={refreshData} style={{ padding: "6px 12px", cursor: "pointer", fontWeight: "bold" }}>
          Refresh Data
        </button>

      </div>

  
      {/* _____________________________________ Map Container ______________________________________ */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100vw", height: "85vh" }}>
        
        <MapContainer style={{ width: "90%", height: "100%" }} center={[20, 0]} zoom={2}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          <LayersControl position="topright" >

              <LayersControl.Overlay name="Satellite">
                <TileLayer
                  attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS
              AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                  url="http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.Overlay>

          </LayersControl>
  
          {processedHourlyData.map((balloon, index) => (
            <Marker 
              key={index} 
              position={[balloon.data[0], balloon.data[1]]} 
              icon={balloon.isMissing ? redMarker : blueMarker}
            >
              <Popup>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <div>
                    <strong>Balloon #: </strong> {index + 1} <br />
                    <strong>Latitude:</strong> {balloon.data[0]?.toFixed(5) ?? "Unknown"}° <br />
                    <strong>Longitude:</strong> {balloon.data[1]?.toFixed(5) ?? "Unknown"}° <br />
                  </div>
          
            
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <strong>Altitude:</strong> {balloon.data[2]?.toFixed(2) ?? "Unknown"} km
                      
                      <span 
                        onClick={() => trackBalloon(index + 1)}
                        style={{
                          cursor: "pointer",
                          fontSize: "16px",
                          fontWeight: "bold",
                          background: "transparent",
                          border: "none",
                          marginLeft: "5px",
                          textShadow: "0px 0px 8px rgb(255, 217, 0)",
                          transition: "text-shadow 0.3s ease-in-out"
                        }}
                        title="Click to trace trajectory"
                      >
                        🚀
                      </span>
                    </div>
            
                    {balloon.isMissing && balloon.source && (
                      <div style={{ color: "red", marginTop: "5px" }}>
                        Data Missing at {selectedHour}H → Using {balloon.source === "past" 
                        ? `Past data from ${balloon.refHour}h ago` 
                        : `Future data from ${Math.abs(balloon.refHour - selectedHour)}h ahead`}
                    </div>
                    )}
                  </div>
              </Popup>
            </Marker>
          ))}

        </MapContainer>
      </div>
    </div>
  );
};

export default ConstellationView;
