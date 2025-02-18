import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

export const WeatherMap = ({ coordinates, weatherData }) => {
  return (
    <MapContainer center={coordinates} zoom={13}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={coordinates}>
        <Popup>
          <div className="weather-popup">
            Temperature: {weatherData.temperature}°C<br />
            Wind Speed: {weatherData.windSpeed} m/s<br />
            Wind Direction: {weatherData.windDirection}°
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
