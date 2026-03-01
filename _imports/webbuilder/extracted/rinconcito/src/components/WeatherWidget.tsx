import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Wind, Thermometer, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WeatherData {
  temp: number;
  apparent: number;
  windspeed: number;
  weathercode: number;
  humidity: number;
}

// WMO weather code to description + icon mapping
function decodeWeather(code: number): { label: string; icon: React.ReactNode; emoji: string } {
  if (code === 0) return { label: 'Despejado', icon: <Sun size={18} />, emoji: '☀️' };
  if (code <= 2) return { label: 'Parcialmente nublado', icon: <Cloud size={18} />, emoji: '⛅' };
  if (code <= 48) return { label: 'Nublado', icon: <Cloud size={18} />, emoji: '☁️' };
  if (code <= 67) return { label: 'Lluvia', icon: <CloudRain size={18} />, emoji: '🌧️' };
  if (code <= 77) return { label: 'Nieve', icon: <Cloud size={18} />, emoji: '❄️' };
  return { label: 'Lluvia', icon: <CloudRain size={18} />, emoji: '⛈️' };
}

// Fuentespalda coordinates
const LAT = 40.8071;
const LON = 0.0642;

export const WeatherWidget: React.FC<{ compact?: boolean }> = ({ compact }) => {
    const { t } = useTranslation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&current=relative_humidity_2m,apparent_temperature,wind_speed_10m&hourly=&daily=&forecast_days=1`
    )
      .then(r => r.json())
      .then(data => {
        if (!alive) return;
        const cw = data.current_weather || {};
        const cur = data.current || {};
        setWeather({
          temp: Math.round(cw.temperature ?? 0),
          apparent: Math.round(cur.apparent_temperature ?? cw.temperature ?? 0),
          windspeed: Math.round(cw.windspeed ?? 0),
          weathercode: cw.weathercode ?? 0,
          humidity: cur.relative_humidity_2m ?? 0,
        });
        setLoading(false);
      })
      .catch(() => { if (alive) { setError(true); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  if (loading || error || !weather) return null;

  const { label, emoji } = decodeWeather(weather.weathercode);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 14 }}>{emoji}</span>
        <span className="font-sans text-sm font-medium" style={{ color: 'var(--ink)' }}>{weather.temp}°C</span>
        <span className="font-sans text-xs" style={{ color: 'var(--ink-muted)' }}>{t('territory.location', t('territory.location', 'Fuentespalda'))}</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl px-5 py-4 flex items-center gap-5"
      style={{ background: 'rgba(244,240,232,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(200,169,110,0.18)' }}
    >
      <div className="text-3xl leading-none">{emoji}</div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-display italic font-light" style={{ fontSize: 32, color: 'var(--cream)', letterSpacing: '-0.02em' }}>{weather.temp}°</span>
          <span className="font-sans text-xs" style={{ color: 'rgba(244,240,232,0.5)' }}>{t('widget.feels_like', { temp: weather.apparent })}</span>
        </div>
        <p className="font-sans text-xs" style={{ color: 'var(--gold)' }}>Fuentespalda · {label}</p>
      </div>
      <div className="ml-auto hidden md:flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <Wind size={11} style={{ color: 'rgba(244,240,232,0.4)' }} />
          <span className="font-sans text-[10px]" style={{ color: 'rgba(244,240,232,0.4)' }}>{weather.windspeed} km/h</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Thermometer size={11} style={{ color: 'rgba(244,240,232,0.4)' }} />
          <span className="font-sans text-[10px]" style={{ color: 'rgba(244,240,232,0.4)' }}>{weather.humidity}% hum</span>
        </div>
      </div>
    </div>
  );
};
