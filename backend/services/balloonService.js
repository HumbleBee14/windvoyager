const axios = require("axios");
const { cleanBalloonData } = require("../utils/dataCleaner");
const { calculateDistance } = require("../utils/haversine");
const { calculateWindSpeedAndDirection } = require("../utils/windCalculator");

const BASE_URL = "https://a.windbornesystems.com/treasure/";  // TODO: We can fetch this from .env later


// ----------------------------------------------------------------

// Fetch data from WindBorne API for a given hour
async function fetchBalloonData(hoursAgo = 0) {
  try {
    const url = `${BASE_URL}${hoursAgo.toString().padStart(2, "0")}.json`;
    const response = await axios.get(url, { timeout: 5000 });

    return cleanBalloonData(response.data, hoursAgo);
  } catch (error) {
    console.error(`Error fetching data from ${hoursAgo}H ago:`, error.message);
    return [];
  }
}

// Fetch the last 24 hours of balloon data
async function fetchLast24HoursData() {
  const allData = {};
  const fetchPromises = [];

  for (let i = 0; i < 24; i++) {
    fetchPromises.push(fetchBalloonData(i));
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
function getBalloonTrajectory(balloonData, balloonId) {
  let trajectory = [];

  for (let hour = 0; hour < 24; hour++) {
      const hourData = balloonData[hour] || [];
      const balloon = hourData[balloonId - 1];

      if (balloon && !balloon.includes(null)) {
          trajectory.push({
              hour,
              latitude: balloon[0],
              longitude: balloon[1],
              altitude: balloon[2]
          });
      }
  }

  return trajectory;
}

/**
* Compute all insights for a single balloon.
*/
function computeBalloonInsights(balloonData, balloonId) {
  const trajectory = getBalloonTrajectory(balloonData, balloonId);

  if (trajectory.length < 2) {
      return { error: "Not enough data points to compute insights." };
  }

  let totalDistance = 0;
  let totalDuration = 0;
  let windProfiles = [];
  let missingData = [];

  for (let i = 1; i < trajectory.length; i++) {
      const prev = trajectory[i - 1];
      const curr = trajectory[i];

      const distance = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      totalDistance += distance;

      // Compute wind speed and direction
      const windData = calculateWindSpeedAndDirection(
          prev.latitude, prev.longitude, curr.latitude, curr.longitude, curr.hour - prev.hour
      );

      windProfiles.push({ hour: curr.hour, ...windData });

      // Check missing data (if there is a big time gap)
      if (curr.hour - prev.hour > 1) {
          missingData.push(curr.hour);
      }

      totalDuration += (curr.hour - prev.hour);
  }

  const avgSpeed = totalDistance / totalDuration;

  return {
      balloonId,
      totalDistance: totalDistance.toFixed(2) + " km",
      avgSpeed: avgSpeed.toFixed(2) + " km/h",
      windProfiles,
      missingData,
      totalDuration: totalDuration + " hours"
  };
}


// -------------------------------------------------------------

module.exports = { fetchBalloonData, fetchLast24HoursData, computeBalloonInsights };
