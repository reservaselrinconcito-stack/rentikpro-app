import React from 'react';
import { useTranslation } from 'react-i18next';
import { CloudSun, Wind, Droplets, MapPin, Loader2, AlertCircle, CloudRain, Sun, Cloud, Snowflake, CloudLightning } from 'lucide-react';
import { useLiveEnvironment } from '../hooks/useLiveEnvironment';

interface LiveEnvironmentWidgetProps {
  lat: number;
  lon: number;
  locationName: string;
}

export const LiveEnvironmentWidget: React.FC<LiveEnvironmentWidgetProps> = ({ lat, lon, locationName }) => {
  const { t } = useTranslation();
  const { data, loading, error } = useLiveEnvironment(lat, lon);

  // Helper to determine gradient and status based on AQI
  const getAQIStatus = (aqi: number) => {
    if (aqi <= 20) return { label: t('widget.aqi_good'), colorClass: 'from-emerald-600/90 to-emerald-950/90', textClass: 'text-emerald-100' };
    if (aqi <= 40) return { label: t('widget.aqi_fair'), colorClass: 'from-stone-800/90 to-stone-950/90', textClass: 'text-stone-300' };
    if (aqi <= 60) return { label: t('widget.aqi_moderate'), colorClass: 'from-orange-700/90 to-orange-950/90', textClass: 'text-orange-100' };
    return { label: t('widget.aqi_poor'), colorClass: 'from-red-800/90 to-red-950/90', textClass: 'text-red-100' };
  };

  // Helper for Weather Icon
  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return <Sun size={32} className="text-orange-400" />;
    if (code > 1 && code < 48) return <Cloud size={32} className="text-stone-300" />;
    if (code >= 51 && code <= 67) return <CloudRain size={32} className="text-orange-200" />;
    if (code >= 71 && code <= 77) return <Snowflake size={32} className="text-white" />;
    if (code >= 95) return <CloudLightning size={32} className="text-orange-300" />;
    return <CloudSun size={32} className="text-white" />;
  };

  if (loading) {
    return (
      <div className="w-full h-48 bg-stone-100 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center animate-pulse border border-stone-200">
        <Loader2 className="animate-spin text-stone-300 mb-2" />
        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{t('widget.loading')}</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full p-8 bg-stone-100 rounded-[2.5rem] border border-orange-100 flex items-center gap-4">
        <AlertCircle className="text-orange-700" size={24} />
        <span className="text-sm text-stone-500 font-medium italic">{t('widget.error')}</span>
      </div>
    );
  }

  const aqiInfo = getAQIStatus(data.aqi);

  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-br ${aqiInfo.colorClass} rounded-[2.5rem] shadow-2xl text-white p-8 md:p-10 flex flex-col justify-between min-h-[280px] transition-all duration-700 group border border-white/5`}>

      {/* Decorative Background Elements */}
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-[60px] group-hover:bg-white/10 transition-colors duration-1000"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/20 rounded-full blur-[40px]"></div>

      {/* Header */}
      <div className="flex justify-between items-start z-10">
        <div>
          <h3 className="flex items-center gap-2 font-serif text-xl text-white tracking-tight drop-shadow-lg">
            <MapPin size={18} className="text-orange-400" /> {locationName}
          </h3>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-70 ${aqiInfo.textClass}`}>Matarraña, España</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-xl flex items-center gap-2">
          <span>AQI {data.aqi}</span>
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
          <span className="opacity-80">{aqiInfo.label}</span>
        </div>
      </div>

      {/* Main Stats */}
      <div className="z-10 mt-6 mb-6">
        <div className="flex items-center gap-6">
          <span className="text-7xl md:text-8xl font-serif font-bold tracking-tighter drop-shadow-2xl text-white">
            {Math.round(data.temperature)}<span className="text-orange-400">°</span>
          </span>
          <div className="flex flex-col">
            <div className="mb-2 drop-shadow-2xl">{getWeatherIcon(data.weatherCode)}</div>
            <span className="text-xs font-black uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
              {t(`weather.${data.weatherCode}`, { defaultValue: '...' })}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-2 gap-4 z-10">
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3 border border-white/5 hover:bg-white/10 transition-all duration-500">
          <Wind size={18} className="text-orange-400" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-black opacity-50 tracking-widest">{t('widget.wind')}</span>
            <span className="text-sm font-bold">{data.windSpeed} <span className="text-[10px] font-normal opacity-70">{t('widget.kmh')}</span></span>
          </div>
        </div>
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3 border border-white/5 hover:bg-white/10 transition-all duration-500">
          <Droplets size={18} className="text-orange-400" />
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-black opacity-50 tracking-widest">{t('widget.humidity')}</span>
            <span className="text-sm font-bold">{data.humidity}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};