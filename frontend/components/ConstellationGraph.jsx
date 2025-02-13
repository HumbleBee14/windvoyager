import React, { useState } from "react";
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const chartOptions = ["Bar Chart", "Line Chart", "Scatter Plot"];

const ConstellationGraph = ({ groupedData, onClose }) => {
  const [chartType, setChartType] = useState("Bar Chart"); // Default Chart

  if (!groupedData) {
    return (
      <div style={modalStyle}>
        <div style={modalContentStyle}>
          <h3>Constellation Altitude Analytics</h3>
          <p>No Data Available.</p>
          <button onClick={onClose} style={buttonStyle}>Close</button>
        </div>
      </div>
    );
  }

  const chartData = Object.keys(groupedData).map((timezone) => ({
    timezone,
    avgAltitude: groupedData[timezone].reduce((sum, val) => sum + val, 0) / groupedData[timezone].length,
  }));

  return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        <h3>Constellation Altitude Analytics</h3>

        {/* Chart Type Selector */}
        <label style={{ fontWeight: "bold", marginRight: "10px" }}>Select Chart Type:</label>
        <select onChange={(e) => setChartType(e.target.value)} style={dropdownStyle}>
          {chartOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <div style={{ width: "100%", height: "400px", marginTop: "20px" }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "Bar Chart" && (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timezone" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgAltitude" fill="#8884d8" />
              </BarChart>
            )}
            {chartType === "Line Chart" && (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timezone" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgAltitude" stroke="#82ca9d" />
              </LineChart>
            )}
            {chartType === "Scatter Plot" && (
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timezone" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Scatter name="Altitude" data={chartData} fill="#8884d8" />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        </div>

        <button onClick={onClose} style={buttonStyle}>Close</button>
      </div>
    </div>
  );
};

// Styles
const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalContentStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "8px",
  minWidth: "500px",
  textAlign: "center",
};

const buttonStyle = {
  marginTop: "15px",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: "bold",
};

const dropdownStyle = {
  padding: "5px",
  fontSize: "14px",
};

export default ConstellationGraph;
