export interface Apartment {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  capacity: number;
  rooms: number;
  imageUrl: string;
  features: string[];
  rentikStatus: 'available' | 'booked' | 'maintenance';
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  imageUrl: string;
  category: 'Naturaleza' | 'Gastronomía' | 'Cultura' | 'RentikPro';
}

export interface WeatherData {
  temp: number;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Partly Cloudy';
  aqi: number; // 1-5
  humidity: number;
}

export interface GuideContent {
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  imageUrl: string;
  relatedLinks?: { title: string; url: string }[];
}