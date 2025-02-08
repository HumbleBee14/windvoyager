const express = require("express");
const { fetchLast24HoursData } = require("../services/balloonService");

const router = express.Router();

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
  
module.exports = router;
