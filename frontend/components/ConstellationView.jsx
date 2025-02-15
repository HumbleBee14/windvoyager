import React, { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Polyline, LayersControl, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-arrowheads";
import { getTimezoneBalloonTrajectories } from '../utils/trajectoryUtils';
import DriftMarker from "react-leaflet-drift-marker";


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

const ConstellationView = ({ 
  completeData,
  processedData, 
  groupedData,
  selectedHour,
  onHourChange,
  refreshData,
  trackBalloon 
}) => {
  
  const [validBalloonCount, setValidBalloonCount] = useState(0);
  const [showTimezoneView, setShowTimezoneView] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(null);
  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTimeStep, setCurrentTimeStep] = useState(0);
  const [trajectoryMarkers, setTrajectoryMarkers] = useState([]);
  const [trajectoryColors, setTrajectoryColors] = useState({});
  const [showTrajectories, setShowTrajectories] = useState(false);

  const mapRef = useRef(null);

  // --------------------------------------------------------

  // Recalculate valid balloons when data updates
  useEffect(() => {
    if (processedData) {
      setValidBalloonCount(processedData.filter(b => !b.isMissing).length);
    } else {
      setValidBalloonCount(0);
    }
  }, [processedData]);

  // ---------------------
  // Clear trajectories on timezone/filter change
  useEffect(() => {
    if (showTrajectories) {
      // setShowTrajectories(false);
      setIsAnimating(false);
      setCurrentTimeStep(0);
    }
  }, [selectedTimezone, selectedHour]);

  // -----------------------
  useEffect(() => {
    let animationTimer;
    if (isAnimating && trajectoryMarkers.length > 0) {
      animationTimer = setInterval(() => {
        setCurrentTimeStep(prev => {
          const next = prev + 1;
          if (next >= 24) {
            setIsAnimating(false);
            // Instead of returning 23, return the last timeStep
            return prev;  // Keep the last valid position
          }
          return next;
        });
      }, 1000);
    }
  
    return () => {
      if (animationTimer) clearInterval(animationTimer);
    };
  }, [isAnimating, trajectoryMarkers]);

  //  -----------------------
  // Stop animation when timezone or hour changes
  useEffect(() => {
    if (isAnimating) {
      setIsAnimating(false);
    }
  }, [selectedTimezone, selectedHour]);

  // ------------------
  // Add useEffect for timezone filter
  useEffect(() => {
    if (showTimezoneView && selectedTimezone) {
      const visibleMarkers = groupedData[selectedTimezone];
      fitMarkersInView(visibleMarkers);
      // Reset animation states when timezone changes
      setIsAnimating(false);
      setCurrentTimeStep(0);
      setTrajectoryMarkers([]);
      setTrajectoryColors({});
    }
  }, [showTimezoneView, selectedTimezone]);
  
  // ---------------------------------------------

  const handleSelectionChange = (event) => {
    const hour = parseInt(event.target.value);
    onHourChange(hour);
  };

  // Get data based on view mode
  const getDisplayData = () => {
    if (!showTimezoneView || !selectedTimezone) {
      return processedData || [];
    }
    return groupedData?.[selectedTimezone] || [];
  };

  // ---------------------------------------
  const handleShowTrajectories = () => {
    const trajectories = getTimezoneBalloonTrajectories(
        completeData, 
        groupedData, 
        selectedTimezone
    );
    // console.log(trajectories);
    console.log("Trajectories loaded:", trajectories.length);

    // Generate colors for each trajectory
    const colors = {};
    trajectories.forEach((_, index) => {
      colors[index] = getRandomColor();
    });

    setTrajectoryColors(colors);
  
  
    if (trajectories.length > 0) {
      const allPoints = trajectories.flatMap(t => t.path);
      fitMarkersInView(allPoints);

      startAnimation(trajectories);
    }
  };

  // Animation control
  const startAnimation = (trajectories) => {
    setIsAnimating(true);
    setTrajectoryMarkers(trajectories);
    setCurrentTimeStep(0);
  };

  const getRandomColor = () => {
    if (Math.random() > 0.5) {
      const letters = '0123456789ABCDEF';
      let color = '#';
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    } else {
      const hue = Math.floor(Math.random() * 360);
      return `hsl(${hue}, 70%, 45%)`;
    }
  };

  // ----------------------------------
  // Modify the timezone view toggle handler
  const handleTimezoneToggle = () => {
    setShowTimezoneView(!showTimezoneView);
    // Reset animation states
    setIsAnimating(false);
    setCurrentTimeStep(0);
    setTrajectoryMarkers([]);
    setTrajectoryColors({});
  };

  // Update timezone selection handler
  const handleTimezoneChange = (timezone) => {
    setSelectedTimezone(timezone);
    // Reset animation states
    setIsAnimating(false);
    setCurrentTimeStep(0);
    setTrajectoryMarkers([]);
    setTrajectoryColors({});
    setShowTrajectories(false);

    if (timezone) {
      const visibleMarkers = groupedData[timezone];
      fitMarkersInView(visibleMarkers);
    }
  };

  // Function to fit bounds for visible markers
  const fitMarkersInView = useCallback((markers) => {
    if (!markers || markers.length === 0 || !mapRef.current) return;

    const bounds = markers.reduce((bounds, marker) => {
      const latLng = [marker.data[0], marker.data[1]];
      return bounds.extend(L.latLng(latLng));
    }, L.latLngBounds([]));

    mapRef.current.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 10,
      duration: 1
    });
  }, []);

  // ------------------------------------
  const renderAnimationButton = () => (
    <button 
      onClick={() => isAnimating ? setIsAnimating(false) : handleShowTrajectories()}
      style={{ 
        marginLeft: "20px",
        padding: "8px 16px",
        backgroundColor: isAnimating ? "#ff4444" : "#4CAF50",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        transition: "background-color 0.3s"
      }}
    >
      {isAnimating ? "Stop Movement" : "Show Movement"}
    </button>
  );

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

        <button onClick={handleTimezoneToggle} style={{ marginLeft: "20px" }} >
          {showTimezoneView ? "Show All Balloons" : "Filter by Timezone"}
        </button>

        {showTimezoneView && (
          <select 
            value={selectedTimezone || ''} 
            onChange={(e) => setSelectedTimezone(e.target.value)}
          >
            <option value="">Select Timezone</option>
            {groupedData && Object.keys(groupedData).map(tz => (
              <option key={tz} value={tz}>
                {tz} ({groupedData[tz].length} balloons)
              </option>
            ))}
          </select>
        )}

        {showTimezoneView && (renderAnimationButton())}

        {!showTimezoneView && (
          <div style={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
          <span style={{ fontWeight: "bold", textAlign: "center" }}>
            Active Balloons: <span style={{ color: "limegreen" }}>{validBalloonCount}</span>
          </span>
        </div>
        )}


        {/* <button onClick={refreshData} style={{ padding: "6px 12px", cursor: "pointer", fontWeight: "bold" }}> */}
        <button onClick={refreshData} style={{ padding: "6px 12px", cursor: "pointer", fontWeight: "bold" }}>
          Refresh Data
        </button>

      </div>

  
      {/* _____________________________________ Map Container ______________________________________ */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100vw", height: "85vh" }}>
        
        <MapContainer ref={mapRef} style={{ width: "90%", height: "100%" }} center={[20, 0]} zoom={2}>

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
  
          {/* Regular markers when not animating */}
          {(!isAnimating && currentTimeStep === 0 || !trajectoryMarkers.length) &&
           getDisplayData().map((balloon, index) => (
            // <AutoZoom trajectory={trajectory} />

            <Marker 
              key={index} 
              position={[balloon.data[0], balloon.data[1]]} 
              icon={balloon.isMissing ? redMarker : blueMarker}
            >
              <Popup>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <div>
                    <strong>Balloon #: </strong> {balloon.data[3]} <br />
                    <strong>Latitude:</strong> {balloon.data[0]?.toFixed(5) ?? "Unknown"}° <br />
                    <strong>Longitude:</strong> {balloon.data[1]?.toFixed(5) ?? "Unknown"}° <br />
                  </div>
          
            
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <strong>Altitude:</strong> {balloon.data[2]?.toFixed(2) ?? "Unknown"} km
                      
                      <span 
                        onClick={() => trackBalloon(balloon.data[3])}
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

          {/* ----------------------------------------- */}

          {/* Animated markers */}
          {(isAnimating || currentTimeStep > 0) && trajectoryMarkers.map((trajectory, index) => {

              // Find the last valid position up to current timeStep
            const currentPosition = trajectory.path
            .filter(p => p.hour <= currentTimeStep)
            .slice(-1)[0];  // Get the last valid position
            // const currentPosition = trajectory.path.find(p => p.hour === currentTimeStep);

            const nextPosition = trajectory.path.find(p => p.hour > currentTimeStep);

            // If no current position but have next position, use the last known position
            const displayPosition = currentPosition || trajectory.path
            .filter(p => p.hour < currentTimeStep)
            .slice(-1)[0];

            if (!displayPosition) return null;

            // Create path coordinates for trace line
            const pathCoords = trajectory.path
            .filter(p => p.hour <= currentTimeStep)
            .map(p => [p.data[0], p.data[1]]);

            return (
              <React.Fragment key={`animated-${index}`}>
                <Polyline
                  positions={pathCoords}
                  color={trajectoryColors[index] || '#000'}
                  weight={2}
                  dashArray="5, 10"
                  opacity={0.8}
                />
                <DriftMarker
                  position={[displayPosition.data[0], displayPosition.data[1]]}
                  duration={1000}
                  icon={blueMarker}
                >
                  <Popup>
                    <div>
                      <strong>Balloon ID:</strong> {displayPosition.data[3]}<br />
                      <strong>Hour:</strong> {currentTimeStep}<br />
                      <strong>Altitude:</strong> {displayPosition.data[2].toFixed(2)} km
                      {!currentPosition && <div><em>Last known position</em></div>}
                    </div>
                  </Popup>
                </DriftMarker>
              </React.Fragment>
            );
          })}

        </MapContainer>
      </div>
    </div>
  );
};

export default ConstellationView;
