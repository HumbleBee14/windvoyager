import React, { useState } from "react";
import ConstellationView from "./ConstellationView";
import BalloonTracker from "./BalloonTracker";

const MapView = () => {
  const [mode, setMode] = useState("constellation"); // Default: Hourly Constellation View

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2>WindVoyager - Balloon Tracker</h2>

      {/* Mode Toggle Buttons */}
      <div style={{ marginBottom: "10px" }}>
        <button onClick={() => setMode("constellation")} style={{ marginRight: "10px" }}>
          Hourly Constellation View
        </button>
        <button onClick={() => setMode("tracker")}>
          Individual Balloon Tracker
        </button>
      </div>

      {/* Render Selected Mode */}
      {mode === "constellation" ? <ConstellationView /> : <BalloonTracker />}
    </div>
  );
};

export default MapView;
