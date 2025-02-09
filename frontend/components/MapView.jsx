import React, { useState, useEffect  } from "react";
import ConstellationView from "./ConstellationView";
import BalloonTracker from "./BalloonTracker";
import { fetchBalloonData } from "../services/balloonService";

const MapView = () => {
  const [mode, setMode] = useState("constellation"); // Default
  const [balloonData, setBalloonData] = useState(null);
  const [selectedBalloonId, setSelectedBalloonId] = useState(null);

  

  // Fetch Data on Load
  useEffect(() => {
    loadBalloonData();
  }, []);

  // Function to Fetch Data
  const loadBalloonData = async () => {
    const data = await fetchBalloonData();
    if (data) {
      setBalloonData(data);
    }
  };

  const handleTrackBalloon = (balloonId) => {
    setSelectedBalloonId(balloonId);
    setMode("tracker");
  };
  
  // --------------------------------------------------------------------------------------------

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* <h2>WindVoyager - Balloon Tracker</h2> */}

      {/* Mode Toggle Buttons */}
      <div style={{ marginBottom: "1px" }}>
        <button onClick={() => setMode("constellation")} style={{ marginRight: "25px" }}>
          Hourly Constellation View
        </button>
        <button onClick={() => setMode("tracker")}>
          Individual Balloon Tracker
        </button>
      </div>

      {mode === "constellation" ? (
        <ConstellationView balloonData={balloonData}  refreshData={loadBalloonData} trackBalloon={handleTrackBalloon} />
      ) : (
        <BalloonTracker balloonData={balloonData} initialBalloonId={selectedBalloonId} />
      )}
    </div>
  );
};

export default MapView;
