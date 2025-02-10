const express = require("express");
const { fetchLast24HoursData, getBalloonInsights } = require("../services/balloonService");

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


module.exports = router;
