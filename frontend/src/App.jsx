import React from "react";
import MapView from "../components/MapView";
import "./App.css"

function App() {
  return (
    <div style={{ position: "relative", textAlign: "center" }}>
      
      <img 
        src="/icons/weather-cloud.png" 
        alt="Clouds" 
        className="cloud-overlay" 
      />

      <h1 className="header-title">
        WindVoyager - Balloon Tracker
      </h1>

      <MapView />
    </div>
  );
}

export default App;
