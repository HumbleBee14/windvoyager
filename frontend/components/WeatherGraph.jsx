import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export const WeatherGraph = ({ balloonData, weatherData }) => {
  const combinedData = balloonData.map((point, index) => ({
    ...point,
    windSpeed: weatherData[index]?.windSpeed || 0,
    temperature: weatherData[index]?.temperature || 0
  }));

  return (
    <div className="weather-graph">
      <LineChart width={800} height={400} data={combinedData}>
        <XAxis dataKey="time" />
        <YAxis yAxisId="left" label={{ value: 'Altitude (km)', angle: -90 }} />
        <YAxis yAxisId="right" orientation="right" label={{ value: 'Wind Speed (m/s)', angle: 90 }} />
        
        <Line 
          yAxisId="left"
          type="monotone"
          dataKey="altitude"
          stroke="#8884d8"
          name="Altitude"
        />
        <Line 
          yAxisId="right"
          type="monotone"
          dataKey="windSpeed"
          stroke="#82ca9d"
          name="Wind Speed"
        />
        <Tooltip />
        <Legend />
      </LineChart>
    </div>
  );
}
