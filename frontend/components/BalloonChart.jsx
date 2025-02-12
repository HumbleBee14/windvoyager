import React from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, ReferenceArea 
} from 'recharts';


const BalloonChart = ({ trajectoryData }) => {
    // Format data for Recharts
    const lastValidPoint = [...trajectoryData].reverse().find(point => point.type !== "Missing" );
    const endHour = lastValidPoint ? lastValidPoint.hour : 23;
    
    // Add future point first
    const chartData = [{
        timeLabel: '+1h',
        altitude: null,
        hour: endHour + 1,
        windSpeed: null,
        latitude: null,
        longitude: null
    }];

    // Then add the filtered trajectory data
    chartData.push(...trajectoryData
        .filter(point => point.hour <= endHour)
        .map(point => ({
            timeLabel: point.hour === 0 ? 'now' : `${point.hour}h ago`,
            altitude: point.alt === "-" ? null : point.alt,
            windSpeed: point.windSpeed === "-" ? null : point.windSpeed,
            hour: point.hour,
            latitude: point.lat === "-" ? null : point.lat,
            longitude: point.lon === "-" ? null : point.lon
        }))
    );
    

    // const chartData = trajectoryData
    //     .filter(point => point.hour <= startHour) // Only show from first valid point
    //     .map(point => ({
    //         timeLabel: point.hour === 0 ? 'now' : `${point.hour}h ago`,
    //         altitude: point.alt === "-" ? null : point.alt,
    //         windSpeed: point.windSpeed === "-" ? null : point.windSpeed,
    //         hour: point.hour,
    //         latitude: point.lat === "-" ? null : point.lat,
    //         longitude: point.lon === "-" ? null : point.lon
    //     }));


    //  -------------------------------------------------------------------------
    return (
        <div style={{ width: '100%', height: 450 }}>
            <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 4, right: 15, left: 15, bottom: 30 }}>

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

                    {/* Atmospheric layers */}
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
                    <YAxis 
                        yAxisId="left" 
                        label={{ 
                            value: 'Altitude (km)', 
                            angle: -90, 
                            position: 'insideLeft' 
                        }}
                    />
                    <YAxis 
                        yAxisId="right" 
                        orientation="right"
                        label={{ 
                            value: 'Wind Speed (m/s)', 
                            angle: 90, 
                            position: 'insideRight' 
                        }}
                    />
                    
                    <Tooltip />

                    <Legend 
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
                        name="Altitude (km)"
                        connectNulls={true}
                        strokeWidth={2}
                        markerStart="url(#arrow)"
                    />
                    <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="windSpeed" 
                        stroke="#00B2CA" 
                        name="Wind Speed (m/s)"
                        connectNulls={true}
                        strokeWidth={2}
                        markerStart="url(#arrow)"
                    />
                    
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default BalloonChart;