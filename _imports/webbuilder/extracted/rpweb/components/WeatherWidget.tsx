import React, { useState, useEffect } from 'react';
import { CloudSun, Wind, Droplets, MapPin } from 'lucide-react';
import { WeatherData } from '../types';

// Simulate fetching real-time data
const mockWeatherData: WeatherData = {
  temp: 18,
  condition: 'Partly Cloudy',
  aqi: 12, // Excellent
  humidity: 45
};

export const WeatherWidget: React.FC = () => {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    // In a real implementation, fetch from OpenMeteo using ENV vars
    // For now, simulate a loading delay then set data
    const timer = setTimeout(() => {
      setData(mockWeatherData);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (!data) return <div className="animate-pulse w-full h-48 bg-stone-200 rounded-3xl"></div>;

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-br from-blue-400 to-sky-300 rounded-3xl shadow-xl text-white p-6 flex flex-col justify-between h-full min-h-[220px]">
      {/* Background Decor */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>

      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <div>
          <h3 className="flex items-center gap-1 font-medium text-blue-50">
            <MapPin size={16} /> Fuentespalda
          </h3>
          <p className="text-xs text-blue-100 opacity-80">Teruel, España</p>
        </div>
        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/30">
          AQI {data.aqi} • Excelente
        </div>
      </div>

      {/* Main Temp */}
      <div className="z-10 mt-4">
        <div className="flex items-center gap-4">
          <span className="text-6xl font-serif font-light tracking-tighter">
            {data.temp}°
          </span>
          <div className="flex flex-col">
            <CloudSun size={32} className="mb-1" />
            <span className="text-sm font-medium">{data.condition}</span>
          </div>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-2 gap-2 mt-4 z-10">
        <div className="bg-black/10 backdrop-blur-sm rounded-xl p-2 flex items-center gap-2">
          <Wind size={16} className="text-blue-100" />
          <div className="flex flex-col">
             <span className="text-[10px] uppercase opacity-70">Viento</span>
             <span className="text-sm font-semibold">12 km/h</span>
          </div>
        </div>
        <div className="bg-black/10 backdrop-blur-sm rounded-xl p-2 flex items-center gap-2">
          <Droplets size={16} className="text-blue-100" />
          <div className="flex flex-col">
             <span className="text-[10px] uppercase opacity-70">Humedad</span>
             <span className="text-sm font-semibold">{data.humidity}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};