const fetchWeatherData = async (latitude, longitude) => {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${latitude}&` +
    `longitude=${longitude}&` +
    `past_days=1&` +  // Get just 1 day of past data (previous day)
    `forecast_days=1&` + // Get just 1 day of forecast data (today)
    `hourly=temperature_2m,windspeed_10m,winddirection_10m&` +
    `current_weather=true&` +
    `timezone=UTC`;
    // `timezone=auto`;

  console.log("API hit made at time: ", new Date().toISOString());
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }

  const data = await response.json();
  return data;
};

// ----------------------------------------------------------------------

const fetchBulkWeatherData = async (locations) => {
  const locationParams = locations.map(loc => 
    `latitude=${loc.latitude}&longitude=${loc.longitude}`
  ).join('&');
  
  const url = `https://api.open-meteo.com/v1/forecast?` +
  `${locationParams}&` +
  `hourly=temperature_2m,windspeed_10m,winddirection_10m&` +
  `past_days=1&` +  // Get just 1 day of past data (previous day)
  `forecast_days=1&` + // Get just 1 day of forecast data (today)
  `current_weather=true&` +
  `timezone=UTC`;  // Force UTC timezone instead of auto
  
  console.log("API hit made at time: ", new Date().toISOString());

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }

  const data = await response.json();
  return data;
};

export { fetchBulkWeatherData, fetchWeatherData };
