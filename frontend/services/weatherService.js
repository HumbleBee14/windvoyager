// services/weatherService.js
export async function fetchWeatherData(latitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_180m,wind_speed_10m,wind_direction_10m&current_weather=true`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return {
        altitude: 0,
        windSpeed: data.current_weather.wind_speed,
        windDirection: data.current_weather.wind_direction,
        temperature: data.current_weather.temperature,
        time: data.current_weather.time
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  }
  