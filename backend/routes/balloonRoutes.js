const express = require("express");
const { fetchLast24HoursData, getBalloonInsights } = require("../services/balloonService");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const PYTHON_SCRIPT = path.join(__dirname, "../scripts/generate_wind_grid.py");
const OUTPUT_FILE = path.join(__dirname, "../data/");
const FILE_NAME = ("wind_grid_data.json");


// API Route to get last 24-hour balloon data
router.get("/history", async (req, res) => {
    try {
      const data = await fetchLast24HoursData();
      res.json(data);
    } catch (error) {
      console.error("Error fetching balloon history:", error);
      res.status(500).json({ error: "Failed to fetch balloon data." });
    }
  });
  

// API Route to get insights for a single balloon
router.get("/insights/:id", async (req, res) => {
  const balloonId = parseInt(req.params.id, 10);
  
  if (isNaN(balloonId) || balloonId < 1 || balloonId > 1000) {
      return res.status(400).json({ error: "Invalid balloon ID. Must be between 1 and 1000." });
  }

  try {
    const insights = await getBalloonInsights(balloonId);
    res.json(insights);
  } catch (error) {
      console.error(`Error computing insights for balloon ${balloonId}:`, error);
      res.status(500).json({ error: "Failed to compute balloon insights." });
  }
});



// API to generate GRIB (json) file for wind
router.post("/generate-wind", async (req, res) => {
  console.log("Executing Python script to generate wind data...");
  const cmd = (`python ${PYTHON_SCRIPT}`)

  exec(cmd, {cwd: OUTPUT_FILE},  (error, stdout, stderr) => {
    // console.log("Python script stdout:", stdout);
    // console.error("Python script stderr:", stderr);

      if (error) {
          console.error(`Error executing Python script: ${error.message}`);
          return res.status(500).json({ error: "Wind data generation failed." });
      }

      if (stderr) {
          console.error(`Python script error: ${stderr}`);
      }

      // console.log("Python script executed successfully. Reading JSON file...");

      // Read the generated JSON file and send it to frontend
      fs.readFile(OUTPUT_FILE + FILE_NAME, "utf8", (err, data) => {
          if (err) {
              console.error("Error reading generated wind file:", err);
              return res.status(500).json({ error: "Failed to read wind data file." });
          }

          res.json(JSON.parse(data)); // Send the wind JSON data
      });
  });
});


module.exports = router;
