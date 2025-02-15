import axios from "axios";
import { cleanBalloonData } from "../utils/dataCleaner.js";
import { computeBalloonInsights } from "../utils/insightsCalculator.js";
import { computeWindAnalytics } from "../utils/windAnalytics.js";

const BASE_URL = "https://a.windbornesystems.com/treasure/"; // TODO: We can fetch this from .env later

// ----------------------------------------------------------------

// Fetch data from WindBorne API for a given hour
export async function fetchBalloonHourlyData(hoursAgo = 0) {
  try {
    const url = `${BASE_URL}${hoursAgo.toString().padStart(2, "0")}.json`;
    const response = await axios.get(url, { timeout: 5000 });

    const cleanedData = cleanBalloonData(response.data, hoursAgo);
    // console.log(`Fetched and cleaned balloon data for ${hoursAgo}H ago:`, cleanedData.length);
    
    return cleanedData;
  } catch (error) {
    // console.error(`Error fetching data from ${hoursAgo}H ago:`, error.message);
    return [];
  }
}

// Fetch the last 24 hours of balloon data
export async function fetchLast24HoursData() {
  const allData = {};
  const fetchPromises = [];

  for (let i = 0; i < 24; i++) {
    fetchPromises.push(fetchBalloonHourlyData(i));
  }

  // fetchPromises.push(fetchBalloonData(17)); // Testing

  const results = await Promise.all(fetchPromises);
  results.forEach((data, index) => {
    allData[index] = data; // Store cleaned results
  });

  return allData;
}

// -------------------------------------------------------------

// Extracts a single balloon’s trajectory from the 24-hour dataset.
export function getBalloonTrajectory(balloonData, balloonId) {
  let trajectory = [];

  for (let hour = 0; hour < 24; hour++) {
    const hourData = balloonData[hour] || [];
    const balloon = hourData[balloonId - 1];

    if (balloon && !balloon.includes(null)) {
      trajectory.push({
        hour,
        latitude: balloon[0],
        longitude: balloon[1],
        altitude: balloon[2],
      });
    }
  }

  return trajectory;
}

// Fetch insights for a given balloon.
export async function getBalloonInsights(balloonId) {
  const balloonData = await fetchLast24HoursData();
  const trajectory = getBalloonTrajectory(balloonData, balloonId);

  return computeBalloonInsights(trajectory);
}

// For computing 24-hour balloon data wind analytics by each timezone
export async function analyzeWindData() {
  try {
    const balloonData = await fetchLast24HoursData();
    return computeWindAnalytics(balloonData);
  } catch (error) {
    console.error("Error in analyzeWindData:", error.message);
    throw error;
  }
}