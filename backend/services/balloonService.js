const axios = require("axios");
const { cleanBalloonData } = require("../utils/dataCleaner");

const BASE_URL = "https://a.windbornesystems.com/treasure/";  // TODO: We can fetch this from .env later



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

module.exports = { fetchBalloonData, fetchLast24HoursData };
