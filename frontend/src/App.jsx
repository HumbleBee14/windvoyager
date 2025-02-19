import React, { useState } from "react";
import MapView from "../components/MapView";
import ProjectInfo from "../components/ProjectInfo";
import "./App.css"

function App() {
  const [showProjectInfo, setShowProjectInfo] = useState(false);


  // -----------------------------------------------------------------
  return (
    <div className="app-container" style={{ position: "relative", textAlign: "center" }}>
      <button onClick={() => setShowProjectInfo(true)} className="project-info-btn">
      📋 Project Info
      </button>

      {showProjectInfo && (
        <div className="overlay">
          <ProjectInfo onClose={() => setShowProjectInfo(false)} />
        </div>
      )}

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
