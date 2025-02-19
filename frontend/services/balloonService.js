import axios from "axios";

// const API_BASE_URL = "http://localhost:8001/api/balloons";
// const API_BASE_URL = "https://grepguru.com/windvoyager/api/balloons";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api";


/**
 * Fetch balloon tracking data from the API.
 * @returns {Promise<Object>} Balloon data object.
 */
export const fetchBalloonData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/balloons/history`);
    return response.data;
  } catch (error) {
    console.error("Error fetching balloon data:", error);
    return null;
  }
};

export const requestWindData = async (balloonId) => {
  if (!balloonId) return null;

  console.log(`Requesting wind data for Balloon #${balloonId}...`);

  try {
    const response = await axios.post(`${API_BASE_URL}/balloons/generate-wind`, { balloonId });
    console.log("Hogya download bro windata");
    return response.data;
  } catch (error) {
    console.error("Error fetching wind data:", error);
    return null;
  }
};
