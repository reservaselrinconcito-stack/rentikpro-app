import { useState, useEffect } from 'react';

interface EnvironmentData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  aqi: number;
}

export const useLiveEnvironment = (lat: number, lon: number) => {
  const [data, setData] = useState<EnvironmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Weather
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;
        // Fetch Air Quality
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`;

        const [weatherRes, aqiRes] = await Promise.all([
          fetch(weatherUrl),
          fetch(aqiUrl)
        ]);

        if (!weatherRes.ok || !aqiRes.ok) throw new Error('API Error');

        const weatherJson = await weatherRes.json();
        const aqiJson = await aqiRes.json();

        setData({
          temperature: weatherJson.current.temperature_2m,
          humidity: weatherJson.current.relative_humidity_2m,
          windSpeed: weatherJson.current.wind_speed_10m,
          weatherCode: weatherJson.current.weather_code,
          aqi: aqiJson.current.european_aqi
        });
        setError(false);
      } catch (err) {
        console.error("Failed to fetch environment data", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lat, lon]);

  return { data, loading, error };
};