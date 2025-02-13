import React, { useState, useEffect  } from "react";
import ConstellationView from "./ConstellationView";
import BalloonTracker from "./BalloonTracker";
import { fetchBalloonData } from "../services/balloonService";
import { groupBalloonsByTimezone } from "../utils/groupData";

const MapView = () => {
  const [mode, setMode] = useState("constellation"); // Default
  const [selectedHour, setSelectedHour] = useState(0);
  const [balloonData, setBalloonData] = useState(null);
  const [selectedBalloonId, setSelectedBalloonId] = useState(null);
  
  
  // Fetch Data on Load
  useEffect(() => {
    loadBalloonData();
  }, []);
  
  // ---------------------------------------------------------
  
  // Function to Fetch Data
  const loadBalloonData = async () => {
    const data = await fetchBalloonData();
    if (data) {
      setBalloonData(data);
    }
  };

  const handleHourChange = (hour) => {
    setSelectedHour(hour);
  };
  
  const handleTrackBalloon = (balloonId) => {
    setSelectedBalloonId(balloonId);
    setMode("tracker");
  };
  
  // ---------------------------------------------------------

  const findValidPosition = (balloonIndex, hour) => {
    if (!balloonData) return null;
    
    let pastHour = null;
    let futureHour = null;
    let pastData = null;
    let futureData = null;
  
    // Search backward for last known position (PAST)
    for (let h = hour + 1; h < 24; h++) {
      const prevData = balloonData[h] || [];
      if (prevData[balloonIndex] && prevData[balloonIndex].length > 1) {
        pastData = prevData[balloonIndex];
        pastHour = h;
        break;
      }
    }
  
    // Search forward for next known position (FUTURE)
    if (!pastData) {
      for (let h = hour - 1; h >= 0; h--) {
        const nextData = balloonData[h] || [];
        if (nextData[balloonIndex] && nextData[balloonIndex].length > 1) {
          futureData = nextData[balloonIndex];
          futureHour = h;
          break;
        }
      }
    }
  
    if (pastData) {
      return { position: pastData, source: "past", refHour: pastHour };
    }
    if (futureData) {
      return { position: futureData, source: "future", refHour: futureHour };
    }
    return null;
  };

  // ---------------------------------------------------------
  const getProcessedHourlyData = () => {
    if (!balloonData || !balloonData[selectedHour]) return [];
    
    return balloonData[selectedHour].map((balloon, index) => {
      if (balloon.length > 1) {
        return { data: balloon, isMissing: false };
      }
      
      const replacement = findValidPosition(index, selectedHour);
      if (replacement) {
        return {
          data: replacement.position,
          isMissing: true,
          source: replacement.source,
          refHour: replacement.refHour
        };
      }
      return { data: balloon, isMissing: true };
    });
  };


  // ----------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

      <div style={{ marginBottom: "1px" }}>
        <button onClick={() => setMode("constellation")} style={{ marginRight: "25px" }}>
          Hourly Constellation View
        </button>
        <button onClick={() => setMode("tracker")}>
          Individual Balloon Tracker
        </button>
      </div>

      {mode === "constellation" ? (
        <ConstellationView 
          processedHourlyData={getProcessedHourlyData()}
          selectedHour={selectedHour}
          onHourChange={handleHourChange}
          refreshData={loadBalloonData}
          trackBalloon={handleTrackBalloon}
        />
      ) : (
        <BalloonTracker balloonData={balloonData} initialBalloonId={selectedBalloonId} />
      )}
    </div>
  );
};

export default MapView;
