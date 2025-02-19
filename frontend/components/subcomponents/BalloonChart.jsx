import React, {useEffect, useState } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, ReferenceArea 
} from 'recharts';


const BalloonChart = ({ trajectoryData, onClose }) => {

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

    // ------------------------------------------------------
    // Track visibility of each line
    const [visibleLines, setVisibleLines] = useState({
        altitude: true,
        windSpeed: true,
        ascentRate: true,
        acceleration: true,
        temperature: true
    });

    // Toggle visibility of a line when its legend is clicked
    const handleLegendClick = (event) => {
        const { dataKey } = event;
    
        // Map normalized keys back to state tracking keys
        const keyMap = {
            altitude: "altitude",
            windSpeed: "windSpeed",
            ascentRateNormalized: "ascentRate",
            accelerationNormalized: "acceleration",
            temperature: "temperature"
        };
    
        const targetKey = keyMap[dataKey];
    
        setVisibleLines((prev) => ({
            ...prev,
            [targetKey]: !prev[targetKey], // Toggle correct key
        }));
    };

    // ======================================================
    // Normalizer
    const normalizeData = (data, key, scaleFactor = 100, bufferPercent = 0.1) => {
        // Find min and max of non-null values
        const values = data.filter(d => d[key] !== null).map(d => d[key]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        // Add buffer to range
        const bufferAmount = range * bufferPercent;
        const adjustedMin = min - bufferAmount;
        const adjustedRange = range + (2 * bufferAmount);
    
        // Add normalized version of the key
        const normalizedData = data.map(point => ({
            ...point,
            [`${key}Normalized`]: point[key] === null ? null : 
            ((point[key] - adjustedMin) / adjustedRange) * scaleFactor
        }));

        return normalizedData;
    };


    // Format data for Recharts
    const lastValidPoint = [...trajectoryData].reverse().find(point => point.type !== "Missing" );
    const endHour = lastValidPoint ? lastValidPoint.hour : 23;
    
    // Add future point first
    let chartData = [{
        hour: endHour + 1,
        timeLabel: '+1h',
        latitude: null,
        longitude: null,
        altitude: null,
        windSpeed: null,
        ascentRate: null,
        ascentRateNormalized: null,
        acceleration: null,
        accelerationNormalized: null,
        temperature: null
    }];

    // Then add the filtered trajectory data
    chartData.push(...trajectoryData
        .filter(point => point.hour <= endHour)
        .map(point => ({
            hour: point.hour,
            timeLabel: point.hour === 0 ? 'now' : `${point.hour}h ago`,
            latitude: point.lat === "-" ? null : point.lat,
            longitude: point.lon === "-" ? null : point.lon,
            altitude: point.alt === "-" ? null : point.alt,
            ascentRate: point.ascentRate === "-" ? null : point.ascentRate,
            ascentRateNormalized: null,    // Will be filled by normalizeData
            windSpeed: point.windSpeed === "-" ? null : point.windSpeed,
            acceleration: point.acceleration === "-" ? null : point.acceleration,
            accelerationNormalized: null,
            temperature: point.weather?.temperature || null,
        }))
    );

    // Normalize acceleration and ascent rate
    // chartData = normalizeData(chartData, 'acceleration', 10000, 0.1);
    chartData = normalizeData(chartData, 'acceleration', 1, 0.1);
    chartData = normalizeData(chartData, 'ascentRate', 1, 0.1);

    
    // Print the normalized data for debugging
    // console.log(`Normalized data:`, chartData);

    // --------------------------------------------------------------------------

    // CustomTooltip - showing original values when normalized ones are plotted
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc' }}>
                    <p style={{ color: '#333', fontWeight: 'bold', borderBottom: '1px solid #ccc'}}>{`Time: ${label}`}</p>

                    {payload.map((entry) => {
                        // If it's a normalized field, get the original field name
                        const dataKey = entry.dataKey;
                        if (dataKey.includes('Normalized')) {
                            const originalKey = dataKey.replace('Normalized', '');
                            // Get original value from payload
                            const originalValue = entry.payload[originalKey];
                            return (
                                <p key={dataKey} style={{ color: entry.color }}>
                                    {`${entry.name}: ${originalValue?.toFixed(7) || 'N/A'}`}
                                </p>
                            );
                        }
                        // For non-normalized fields, show as is
                        return (
                            <p key={dataKey} style={{ color: entry.color }}>
                                {`${entry.name}: ${entry.value?.toFixed(4) || 'N/A'}`}
                            </p>
                        );
                    })}
                </div>
            );
        }
        return null;
    };
    
    //  -------------------------------------------------------------------------
    return (
        <div style={{ width: '100%', height: 450 }}>
            <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 4, right: 15, left: 15, bottom: 30 }}>
                    {/* Atmospheric Layers */}
                    <defs>
                        <linearGradient id="troposphereColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#87CEEB" stopOpacity={0.2}/>
                            <stop offset="100%" stopColor="#B0E0E6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="stratosphereColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#B19CD9" stopOpacity={0.2}/>
                            <stop offset="100%" stopColor="#9370DB" stopOpacity={0.1}/>
                        </linearGradient>
                    </defs>

                    <ReferenceArea 
                        yAxisId="left"
                        y1={0} 
                        y2={12} 
                        fill="url(#troposphereColor)" 
                        label={{ value: 'Troposphere', position: 'insideLeft' }} 
                    />
                    <ReferenceArea 
                        yAxisId="left"
                        y1={12} 
                        y2={24} 
                        fill="url(#stratosphereColor)" 
                        label={{ value: 'Stratosphere', position: 'insideLeft' }} 
                    />


                    <CartesianGrid strokeDasharray="3 3" />


                    <XAxis 
                        dataKey="timeLabel" 
                        reversed={true}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                    />

                    <YAxis yAxisId="left" label={{ value: 'Altitude (km)', angle: -90, position: 'insideLeft' }} />

                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Wind Speed (m/s)', angle: 90, position: 'insideRight',  offset: 80, style: { textAnchor: 'middle'} }} />

                    <YAxis yAxisId="temp" orientation="right" label={{ value: 'Temperature (°C)', angle: 90, position: 'insideRight', offset: 10, style: { textAnchor: 'middle'} }} />

                    <YAxis yAxisId="hiddenAscent" hide={true} />
                    <YAxis yAxisId="hiddenAccel" hide={true} />

                    
                    <Tooltip content={<CustomTooltip />} />

                    <Legend 
                        onClick={handleLegendClick}
                        verticalAlign="bottom" 
                        height={1}
                        // wrapperStyle={{
                        //     paddingTop: '1px',
                        //     bottom: 20
                        // }}
                    />

                    <svg>
                        <defs>
                            <marker
                                id="arrow"
                                viewBox="0 0 10 10"
                                refX="5"
                                refY="5"
                                markerWidth="8"
                                markerHeight="8"
                                orient="auto-start-reverse"
                            >
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#666"/>
                            </marker>
                        </defs>
                    </svg>

                    <Line 
                        yAxisId="left"
                        type="natural" 
                        dataKey="altitude" 
                        stroke="#4B3A26"
                        strokeOpacity={visibleLines.altitude ? 1 : 0}  
                        name="Altitude (km)"
                        connectNulls={true}
                        strokeWidth={2}
                        markerStart={visibleLines.altitude ? "url(#arrow)" : ""}
                    />
                    <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="windSpeed" 
                        stroke="#00B2CA"
                        strokeOpacity={visibleLines.windSpeed ? 1 : 0}  
                        name="Wind Speed (m/s)"
                        connectNulls={true}
                        strokeWidth={2}
                        markerStart={visibleLines.windSpeed ? "url(#arrow)" : ""}
                    />

                    {/* Dotted Line for Ascent rate & Acceleration (NO Y-AXIS, JUST FOR PATTERN) */}
                    <Line 
                        yAxisId="hiddenAscent"
                        type="monotone" 
                        dataKey="ascentRateNormalized" 
                        stroke="#8B5E3B"
                        strokeOpacity={visibleLines.ascentRate ? 0.8 : 0}  
                        strokeDasharray="5 5"
                        name="Ascent Rate (ft/min)"
                        connectNulls={true}
                        strokeWidth={1}
                    />

                    <Line
                        yAxisId="hiddenAccel"
                        type="monotone" 
                        dataKey="accelerationNormalized" 
                        stroke="#006D77"
                        strokeOpacity={visibleLines.acceleration ? 0.8 : 0} 
                        strokeDasharray="5 5"
                        name="Acceleration (m/s²)"
                        connectNulls={true}
                        strokeWidth={1}
                    />
                    
                    <Line 
                        yAxisId="temp"
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#FF6B6B"  // Warm reddish color for temperature
                        strokeOpacity={visibleLines.temperature ? 1 : 0}  
                        name="Ground Temp (°C)"
                        connectNulls={true}
                        strokeWidth={1.5}
                        markerStart={visibleLines.temperature ? "url(#arrow)" : ""}
                    />


                </LineChart>
            </ResponsiveContainer>

            <p style={{ textAlign: "center", fontSize: "12px", color: "gray", marginTop: "0px" }}>
                Click legend to show/hide lines
            </p>

        </div>
    );
};

export default BalloonChart;