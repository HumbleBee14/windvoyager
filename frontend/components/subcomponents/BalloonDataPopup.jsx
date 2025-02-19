import { useEffect, useRef } from "react";
import Draggable from "react-draggable";

const BalloonDataPopup = ({ data, balloonId, onClose }) => {
  const nodeRef = useRef(null);

  // Handle ESC Key to close the popup
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    // Cleanup when unmounting
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <Draggable nodeRef={nodeRef}>
      <div ref={nodeRef} className="popup-container">
        <button className="close-btn" onClick={onClose}>✖</button>
        
        <h3 className="popup-title">Balloon #{balloonId} Data Log</h3>

        {/* Table for Debug Data */}
        <table className="popup-table">
          <thead>
            <tr>
            <th>Hour</th>
            <th>Latitude</th>
            <th>Longitude</th>
            <th>Alt (km)</th>
            <th>Ascent Rate (ft/min)</th>
            <th>Ground Temp</th>
            <th style={{ width: '90px' }}>Wind Speed</th>
            <th>Wind Direction (°)</th>
            </tr>
            </thead>

                  <tbody>
                  {data.map((entry, index) => (
                    <tr key={index} className={entry.type.includes("Missing") ? "missing-row" : "recorded-row"}>
                    <td>{entry.hour}H</td>
                    <td>{entry.lat !== "-" ? entry.lat.toFixed(5) : "-"}</td>
                    <td>{entry.lon !== "-" ? entry.lon.toFixed(5) : "-"}</td>
                    <td>{entry.alt !== "-" ? entry.alt.toFixed(2) : "-"}</td>
                    
                    <td>
                      {entry.ascentRate !== "-" ? (
                      <>
                        {entry.ascentRate.toFixed(2)}
                        {entry.ascentRate > 0 ? " ↑" : entry.ascentRate < 0 ? " ↓" : ""}
                      </>
                      ) : "-"}
                    </td>

                    <td>{entry.weather?.temperature ? `${entry.weather.temperature}${entry.hourly_units?.temperature_2m || '°C'}` : "-"}</td>

                    <td style={{ width: '90px' }}>{entry.windSpeed !== "-" ? `${(entry.windSpeed * 3.6).toFixed(1)}`+ " km/hr" : "-"}</td>

                    <td>{entry.windDirection !== "-" ? `${entry.windDirection}°${entry.windCompass !== "-" ? '(' + entry.windCompass + ')': ""}` : "-"}</td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </Draggable>
  );
};

export default BalloonDataPopup;




/*

// Popup Component for Debugging data/errors/outliers

const BalloonDataPopup = ({ data, balloonId, onClose }) => {
  return (
    <div style={{ 
      position: "fixed", top: "15%", left: "50%", transform: "translate(-50%, -15%)",
      width: "520px", maxHeight: "450px", background: "#222", padding: "15px", 
      boxShadow: "0px 4px 20px rgba(255, 255, 255, 0.6)", // Added glowing effect
      overflowY: "auto", zIndex: 1000, borderRadius: "8px", color: "#fff",
      border: "2px solid #FFD700" // Gold border for premium look
    }}>
      <button 
        onClick={onClose} 
        style={{
          position: "absolute", right: "10px", top: "10px", cursor: "pointer",
          background: "transparent", color: "#FFD700", border: "none", fontSize: "22px",
          fontWeight: "bold"
        }}>
        ✖
      </button>

      <h3 style={{ textAlign: "center", marginBottom: "5px", color: "#FFD700" }}>
        Balloon #{balloonId} Data Log
      </h3>

      <table border="1" style={{ width: "100%", borderCollapse: "collapse", marginTop: "5px" }}>
        <thead>
          <tr style={{ background: "#444", color: "#FFD700" }}>
            <th>Hour</th>
            <th>Latitude</th>
            <th>Longitude</th>
            <th>Altitude</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, index) => (
            <tr key={index} style={{ background: entry.type.includes("Missing") ? "#630200" : "#333", color: "#fff" }}>
              <td>{entry.hour}H</td>
              <td>{entry.lat.toFixed(5)}</td>
              <td>{entry.lon.toFixed(5)}</td>
              <td>{entry.alt}</td>
              <td style={{ fontWeight: "bold", color: entry.type.includes("Missing") ? "#FFD700" : "#0f0" }}>
                {entry.type}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

*/