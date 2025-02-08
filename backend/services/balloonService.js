const axios = require("axios");

const BASE_URL = "https://a.windbornesystems.com/treasure/";

async function fetchBalloonData(hoursAgo = 0) {
  try {
    const url = `${BASE_URL}${hoursAgo.toString().padStart(2, "0")}.json`;
    const response = await axios.get(url, { timeout: 5000 });

    let data = response.data;

    // console.log(typeof data);

    // Check if data is a string (meaning it's wrongly formatted JSON)
    if (typeof data === "string") {
      try {
        // Replace 'NaN' with a valid JSON value (null or a string placeholder! Let's go with null for now, will see later if needs change - TODO)
        let sanitizedDataString = data.replace(/NaN/g, 'null');
        
        // Handle cases where the opening or closing brackets are missing
        if (!sanitizedDataString.startsWith('[')) {
            sanitizedDataString = `[${sanitizedDataString}`;
        }
        if (!sanitizedDataString.endsWith(']')) {
        sanitizedDataString = `${sanitizedDataString}]`;
        }
    
        // Parse the cleaned-up data
        data = JSON.parse(sanitizedDataString);

        // console.warn(`Fixed malformed JSON at ${hoursAgo}H`);
      } catch (parseError) {
        console.error(`Corrupted JSON at ${hoursAgo}H - Cannot fix`, parseError.message);
        return []; // Ignore corrupted data
      }
    }
    
    if (Array.isArray(data)) {
        // check if the data is missing the outer brackets
        if (data.length > 0 && !Array.isArray(data[0])) {
            // If the first item is not an array, wrap the data in an array
            data = [data];
        }
        console.warn(`GOT Perfect JSON at ${hoursAgo}H`);
        return data;
      } else {
        console.warn(`Unexpected data format at ${hoursAgo}H`);
        return [];
      }

  } catch (error) {
    console.error(`Error fetching data from ${hoursAgo}H ago:`, error.message);
    return [];
  }
}

async function fetchLast24HoursData() {
  const allData = {};
  const fetchPromises = [];

  for (let i = 0; i < 24; i++) {
    fetchPromises.push(fetchBalloonData(i));
  }

// fetchPromises.push(fetchBalloonData(19)); // test

  const results = await Promise.all(fetchPromises);
  results.forEach((data, index) => {
    allData[index] = data; // Store results with hour keys
  });

  return allData;
}

module.exports = { fetchBalloonData, fetchLast24HoursData };
