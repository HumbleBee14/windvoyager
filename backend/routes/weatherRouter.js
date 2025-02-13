import { Router } from 'express';
const router = Router();
import weatherService from '../services/weatherService.js';

router.get('/current', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required." });
    }
    const weather = await weatherService.getCurrentWeather(latitude, longitude);
    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/forecast', async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required." });
    }
    const forecast = await weatherService.getHourlyForecast(latitude, longitude);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
