import React from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const BalloonChart = ({ trajectoryData }) => {
    // Format data for Recharts
    const chartData = trajectoryData.map(point => ({
        timeAgo: `${point.hour}h ago`,  // for hours ago format
        altitude: point.altitude,
        windSpeed: point.windSpeed,
        windDirection: point.windDirection,
        latitude: point.position[0],
        longitude: point.position[1]
    }));

    return (
        <div style={{ width: '100%', height: 500 }}>
            <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    
                    <XAxis 
                        dataKey="timeAgo" 
                        reversed={true}  // Reversed axis to show 0h ago on left
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                    />

                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        wrapperStyle={{
                            paddingTop: '20px',
                            bottom: 0
                        }}
                    />
                    <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="altitude" 
                        stroke="#8884d8" 
                        name="Altitude (km)"
                        connectNulls={true}
                    />
                    <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="windSpeed" 
                        stroke="#82ca9d" 
                        name="Wind Speed (m/s)"
                        connectNulls={true} 
                    />
                    
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default BalloonChart;
