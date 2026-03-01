import { Apartment as ApartmentType } from './content/apartments';

export type Apartment = ApartmentType;

export interface Experience {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  location: string;
  category: string;
  imageUrl: string;
  status?: string;
  tips?: string;
  howToGet?: string;
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  imageUrl: string;
  relatedLinks?: { title: string; url: string }[];
  relatedExperiences?: string[];
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
  category: string;
}

export interface WeatherData {
  temp: number;
  condition: 'Sunny' | 'Cloudy' | 'Rainy' | 'Partly Cloudy';
  aqi: number;
  humidity: number;
}
