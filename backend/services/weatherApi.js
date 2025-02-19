const getPastDayWeather = async (latitude, longitude) => {
    const currentDate = new Date();
    const yesterdayDate = new Date(currentDate);
    yesterdayDate.setDate(currentDate.getDate() - 1);
  
    const startDate = yesterdayDate.toISOString().split('T')[0];
    const endDate = currentDate.toISOString().split('T')[0];
  
    const url = `https://archive-api.open-meteo.com/v1/archive?` +
      `latitude=${latitude}&` +
      `longitude=${longitude}&` +
      `start_date=${startDate}&` +
      `end_date=${endDate}&` +
      `hourly=temperature_2m,windspeed_10m,winddirection_10m&` +
      `timezone=auto`;
  
    const response = await fetch(url);
    const data = await response.json();
    return data;
  };
  

  const getMultiLocationWeather = async (locations) => {
    const currentDate = new Date();
    const yesterdayDate = new Date(currentDate);
    yesterdayDate.setDate(currentDate.getDate() - 1);
  
    const startDate = yesterdayDate.toISOString().split('T')[0];
    const endDate = currentDate.toISOString().split('T')[0];
  
    // Format locations into proper query string
    const locationParams = locations.map(loc => 
      `latitude=${loc.latitude}&longitude=${loc.longitude}`
    ).join('&');
  
    const url = `https://archive-api.open-meteo.com/v1/archive?` +
      `${locationParams}&` +
      `start_date=${startDate}&` +
      `end_date=${endDate}&` +
      `hourly=temperature_2m,windspeed_10m,winddirection_10m&` +
      `timezone=auto`;
  
    const response = await fetch(url);
    const data = await response.json();
    return data;
  };
  
  const getWeatherData = async (latitude, longitude) => {
    const currentDate = new Date();
    const twoDaysAgo = new Date(currentDate);
    twoDaysAgo.setDate(currentDate.getDate() - 2);
  
    const startDate = twoDaysAgo.toISOString().split('T')[0];
    const endDate = currentDate.toISOString().split('T')[0];
  
    // Fetch both past data and forecast in parallel
    const [archiveData, forecastData] = await Promise.all([
      // Past data from archive API
      fetch(`https://archive-api.open-meteo.com/v1/archive?` +
        `latitude=${latitude}&` +
        `longitude=${longitude}&` +
        `start_date=${startDate}&` +
        `end_date=${endDate}&` +
        `hourly=temperature_2m,windspeed_10m,winddirection_10m&` +
        `timezone=auto`),
        
      // Forecast data
      fetch(`https://api.open-meteo.com/v1/forecast?` +
        `latitude=${latitude}&` +
        `longitude=${longitude}&` +
        `hourly=temperature_2m,windspeed_10m,winddirection_10m&` +
        `timezone=auto`)
    ]);
  
    const archive = await archiveData.json();
    const forecast = await forecastData.json();
  
    return {
      historical: archive,
      forecast: forecast
    };
  };
  
  // For multiple locations
const getMultiLocationWeatherCombined = async (locations) => {
    const locationParams = locations.map(loc => 
      `latitude=${loc.latitude}&longitude=${loc.longitude}`
    ).join('&');
  
    const [archiveData, forecastData] = await Promise.all([
      fetch(`https://archive-api.open-meteo.com/v1/archive?${locationParams}&start_date=${startDate}&end_date=${endDate}&hourly=temperature_2m,windspeed_10m,winddirection_10m&timezone=auto`),
      fetch(`https://api.open-meteo.com/v1/forecast?${locationParams}&hourly=temperature_2m,windspeed_10m,winddirection_10m&timezone=auto`)
    ]);
  
    return {
      historical: await archiveData.json(),
      forecast: await forecastData.json()
    };
  };
  