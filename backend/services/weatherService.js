import { fetchWeatherApi } from 'openmeteo';

class WeatherService {
  constructor() {
    this.apiUrl = 'https://api.open-meteo.com/v1/forecast';
  }

  /**
   * Get the current weather for a specific latitude and longitude.
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Object} Current weather details
   */
  async getCurrentWeather(latitude, longitude) {
    try {
      const params = {
        latitude: [latitude],
        longitude: [longitude],
        current: 'temperature_2m,wind_speed_10m,wind_direction_10m',
        timezone: 'GMT'
      };

      const responses = await fetchWeatherApi(this.apiUrl, params);
      const response = responses[0]; // Process first location
      
      const current = response.current();

      return {
        time: new Date((Number(current.time()) + response.utcOffsetSeconds()) * 1000),
        temperature: current.variables(0).value(),
        weatherCode: current.variables(1).value(),
        windSpeed: current.variables(2).value(),
        windDirection: current.variables(3).value(),
        timezone: response.timezone(),
      };

    } catch (error) {
      console.error("Weather API Error:", error);
      throw new Error("Failed to fetch current weather.");
    }
  }

  /**
   * Get hourly forecast for a specific latitude and longitude.
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Object} Hourly weather forecast
   */
  async getHourlyForecast(latitude, longitude) {
    try {
      const params = {
        latitude: [latitude],
        longitude: [longitude],
        hourly: 'temperature_2m,wind_speed_10m,wind_direction_10m',
        timezone: 'GMT'
      };

      const responses = await fetchWeatherApi(this.apiUrl, params);
      const response = responses[0]; // Process first location
      const hourly = response.hourly();

      return {
        time: this._convertTimeArray(hourly.time(), hourly.timeEnd(), hourly.interval(), response.utcOffsetSeconds()),
        temperature: hourly.variables(0).valuesArray(),
        windSpeed: hourly.variables(1).valuesArray(),
        windDirection: hourly.variables(2).valuesArray(),
        timezone: response.timezone(),
      };

    } catch (error) {
      console.error("Forecast API Error:", error);
      throw new Error("Failed to fetch hourly forecast.");
    }
  }

  /**
   * Convert timestamp ranges to readable date-time format.
   * @param {number} start 
   * @param {number} stop 
   * @param {number} step 
   * @param {number} utcOffsetSeconds 
   * @returns {Array} Array of date objects
   */
  _convertTimeArray(start, stop, step, utcOffsetSeconds) {
    return Array.from({ length: (stop - start) / step }, (_, i) =>
      new Date((start + i * step + utcOffsetSeconds) * 1000)
    );
  }
}

export default new WeatherService();
