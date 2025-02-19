import { fetchWeatherApi } from 'openmeteo';
    
const params = {
    "latitude": 52.52,
    "longitude": 13.41,
    "start_date": "2025-02-18",
    "end_date": "2025-02-18",
    "hourly": ["temperature_2m", "rain", "weather_code", "wind_speed_100m", "wind_direction_100m", "is_day"]
};
const url = "https://archive-api.open-meteo.com/v1/archive";
const responses = await fetchWeatherApi(url, params);

// Helper function to form time ranges
const range = (start, stop, step) =>
    Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

// Process first location. Add a for-loop for multiple locations or weather models
const response = responses[0];

// Attributes for timezone and location
const utcOffsetSeconds = response.utcOffsetSeconds();
const timezone = response.timezone();
const timezoneAbbreviation = response.timezoneAbbreviation();
const latitude = response.latitude();
const longitude = response.longitude();

const hourly = response.hourly();

// Note: The order of weather variables in the URL query and the indices below need to match!
const weatherData = {
    hourly: {
        time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
            (t) => new Date((t + utcOffsetSeconds) * 1000)
        ),
        temperature2m: hourly.variables(0).valuesArray(),
        rain: hourly.variables(1).valuesArray(),
        weatherCode: hourly.variables(2).valuesArray(),
        windSpeed100m: hourly.variables(3).valuesArray(),
        windDirection100m: hourly.variables(4).valuesArray(),
        isDay: hourly.variables(5).valuesArray(),
    },
};

// `weatherData` now contains a simple structure with arrays for datetime and weather data
for (let i = 0; i < weatherData.hourly.time.length; i++) {
    console.log(
        weatherData.hourly.time[i].toISOString(),
        weatherData.hourly.temperature2m[i],
        weatherData.hourly.rain[i],
        weatherData.hourly.weatherCode[i],
        weatherData.hourly.windSpeed100m[i],
        weatherData.hourly.windDirection100m[i],
        weatherData.hourly.isDay[i]
    );
}
