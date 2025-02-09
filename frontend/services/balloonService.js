import axios from "axios";

const API_URL = "http://localhost:5000/api/balloons/history";

/**
 * Fetch balloon tracking data from the API.
 * @returns {Promise<Object>} Balloon data object.
 */
export const fetchBalloonData = async () => {
  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (error) {
    console.error("Error fetching balloon data:", error);
    return null;
  }
};
