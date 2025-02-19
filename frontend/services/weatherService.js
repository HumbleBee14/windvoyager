const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api";

/**
 * Fetches weather data for multiple locations (bulk API).
 * @param {Array} trajectoryData - List of balloon trajectory points with lat/lon.
 * @returns {Promise<Array>} - List of 48 hour weather data for each location
 */
export const fetchWeatherForTrajectory = async (trajectoryData) => {
    try {
        if (!trajectoryData || trajectoryData.length === 0) {
            console.warn("No trajectory data provided.");
            return [];
        }
        
        const requestBody = {
          locations: trajectoryData.map((point) => ({
              latitude: point.position[0],
              longitude: point.position[1]
          }))
        };

        console.log("Fetching weather for locations:", requestBody);

        const response = await fetch(`${API_BASE_URL}/weather/bulk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Weather API failed: ${response.statusText}`);
        }

        const weatherData = await response.json();
        
        console.log("Weather API Response:", weatherData);
        return weatherData;
    } catch (error) {
        console.error("Error fetching bulk weather data:", error);
        return trajectoryData.map(point => ({ ...point, weather: null }));
    }
};

// --------------------------------------------------------------------------------------
/**
 * Fetches weather data for a single location.
 * @param {number} latitude - Latitude of the location.
 * @param {number} longitude - Longitude of the location.
 * @returns {Promise<Object>} - Weather data for the location.
 */
export const fetchWeatherForSingleLocation = async (latitude, longitude) => {
    try {
        const response = await fetch(`${API_BASE_URL}/weather/single/${latitude}/${longitude}`);

        if (!response.ok) {
            throw new Error(`Weather API failed: ${response.statusText}`);
        }

        const weatherData = await response.json();
        
        console.log("Single location weather data:", JSON.stringify(weatherData));
        
        return {
            temperature: weatherData.current_weather.temperature,
            windspeed: weatherData.current_weather.windspeed,
            winddirection: weatherData.current_weather.winddirection
        };
    } catch (error) {
        console.error("Error fetching single location weather data:", error);
        return null;
      }
    };
    
// ------------------------------------------------------------------------------------

export const mapWeatherToTrajectory = (trajectoryData, weatherData) => {
  if (!weatherData || weatherData.length === 0) return trajectoryData;

  return trajectoryData.map((point, index) => {
      const locationWeather = weatherData[index];  // Direct mapping based on index

      if (!locationWeather) {
          console.warn(`No weather found for index ${index}, (${point.position[0]}, ${point.position[1]})`);
          return { ...point, weather: null };
      }

      // Convert OpenMeteo's time format to match our 0h, 1h ago system
      const matchedHourIndex = matchWeatherTime(locationWeather.hourly.time, point.hour);

      if (matchedHourIndex === -1) {
          console.warn(`No matching hour found for point ${point.hour}H ago`);
          return { ...point, weather: null };
      }

      return {
          ...point,
          weather: {
              temperature: locationWeather.hourly.temperature_2m[matchedHourIndex],
              windspeed: locationWeather.hourly.windspeed_10m[matchedHourIndex],
              winddirection: locationWeather.hourly.winddirection_10m[matchedHourIndex]
          }
      };
  });
};



// ------------------------------------------------------------------------------------

// --------------------------------------------------
// MATCH WEATHER TIMESTAMPS AUTOMATICALLY
// --------------------------------------------------
const matchWeatherTime = (weatherTimestamps, hourAgo) => {
  const currentUTCTime = new Date();
  currentUTCTime.setHours(currentUTCTime.getHours() - hourAgo);
  const formattedTime = currentUTCTime.toISOString().slice(0, 13) + ":00";

  console.log("Hours ago: " + hourAgo + " We found this time: " + formattedTime);

  let timeStampIndex = weatherTimestamps.findIndex((t) => t.startsWith(formattedTime));
  console.log(timeStampIndex);
  return timeStampIndex;
};

// ------------------------------------------------------------------------------------

/*

//  MAPPING BASED ON COORDINATES COMPARISON

// --------------------------------------------------
//  MAP WEATHER DATA TO TRAJECTORY
// --------------------------------------------------
// * OpenMeteo returns timestamps in UTC at 00:00, 01:00, etc.
// * We need to convert our system (0h = current, 1h = 1h ago) to match.

export const mapWeatherToTrajectory = (trajectoryData, weatherData) => {
  if (!weatherData || weatherData.length === 0) return trajectoryData;

  const mappedTrajectory = [];
  
  for (let i = 0; i < trajectoryData.length; i++) {
      const point = trajectoryData[i];
      const closestWeather = findClosestLocation(point.position[0], point.position[1], weatherData);

      console.log("For point: " + point.position[0] + ", " + point.position[1], " Closest Weather Data: " + JSON.stringify(closestWeather));

      if (!closestWeather) {
          console.warn(`No nearby weather data found for (${point.position[0]}, ${point.position[1]})`);
          mappedTrajectory.push({ ...point, weather: null });
          continue;
      }

      const matchedHourIndex = matchWeatherTime(closestWeather.hourly.time, point.hour);

      console.log("Matched Index for point HOUR: " + point.hour + " Index: " + matchedHourIndex);

      if (matchedHourIndex === -1) {
          console.warn(`No matching hour found for point ${point.hour}H ago`);
          mappedTrajectory.push({ ...point, weather: null });
          continue;
      }

      mappedTrajectory.push({
          ...point,
          weather: {
              temperature: closestWeather.hourly.temperature_2m[matchedHourIndex],
              windspeed: closestWeather.hourly.windspeed_10m[matchedHourIndex],
              winddirection: closestWeather.hourly.winddirection_10m[matchedHourIndex]
          }
      });
  }

  return mappedTrajectory;
};


// -----------------------------------------------------------------------
const findClosestLocation = (lat, lon, weatherData) => {
  let minDistance = Infinity;
  let closestWeather = null;

  weatherData.forEach((location) => {
      const distance = getDistance(lat, lon, location.latitude, location.longitude);

      if (distance < minDistance) {
          minDistance = distance;
          closestWeather = location;
      }
  });

  return closestWeather;
};

// -----------------------------------------------------------------------
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degree) => (degree * Math.PI) / 180;

  const R = 6371; // Radius of Earth in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in km
};

*/
// -----------------------------------------------------------------------