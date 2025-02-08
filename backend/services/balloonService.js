const axios = require("axios");

const BASE_URL = "https://a.windbornesystems.com/treasure/";

// Function to clean and validate balloon data
function cleanBalloonData(data, hoursAgo) {
  if (typeof data === "string") {
    try {
      // Replace 'NaN' with 'null' to allow JSON parsing
      let sanitizedDataString = data.replace(/NaN/g, "null");

      // Fix missing brackets
      if (!sanitizedDataString.startsWith("[")) sanitizedDataString = `[${sanitizedDataString}`;
      if (!sanitizedDataString.endsWith("]")) sanitizedDataString = `${sanitizedDataString}]`;

      // Parse the cleaned-up data
      data = JSON.parse(sanitizedDataString);
    } catch (error) {
      console.error(`Corrupted JSON at ${hoursAgo}H - Cannot fix:`, error.message);
      return []; // Ignore completely corrupted data
    }
  }

  if (!Array.isArray(data)) {
    console.warn(`Unexpected data format at ${hoursAgo}H - Ignoring dataset.`);
    return [];
  }

  // Ensure the structure is correct (wrap missing outer brackets)
  if (data.length > 0 && !Array.isArray(data[0])) {
    data = [data];
  }

  // now we will replace invalid records with `[NaN]`
  const cleanedData = data.map((record) => {
    const isValid = record.every((value) => value !== null && !isNaN(value));
    return isValid ? record : [NaN];
  });

  console.log(`Hour ${hoursAgo}: Cleaned dataset contains ${cleanedData.length} records.`);
  return cleanedData;
}

// Fetch data from WindBorne API
async function fetchBalloonData(hoursAgo = 0) {
  try {
    const url = `${BASE_URL}${hoursAgo.toString().padStart(2, "0")}.json`;
    const response = await axios.get(url, { timeout: 5000 });

    return cleanBalloonData(response.data, hoursAgo);
  } catch (error) {
    console.error(`❌ Error fetching data from ${hoursAgo}H ago:`, error.message);
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

  const results = await Promise.all(fetchPromises);
  results.forEach((data, index) => {
    allData[index] = data; // Store cleaned results
  });

  return allData;
}

module.exports = { fetchBalloonData, fetchLast24HoursData };
