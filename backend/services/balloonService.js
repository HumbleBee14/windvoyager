const axios = require('axios');

const BASE_URL = "https://a.windbornesystems.com/treasure/";

async function fetchBalloonData(hoursAgo = 0) {
    try {
        const url = `${BASE_URL}${hoursAgo.toString().padStart(2, '0')}.json`;
        const response = await axios.get(url);
        return response.data;  // The raw balloon data
    } catch (error) {
        console.error(`Error fetching data from ${hoursAgo}H ago:`, error.message);
        return [];  // Return empty array if data is missing/corrupt
    }
}

async function fetchLast24HoursData() {
    const allData = {};
    for (let i = 0; i < 24; i++) {
        allData[i] = await fetchBalloonData(i);
    }
    return allData;
}

module.exports = { fetchBalloonData, fetchLast24HoursData };
