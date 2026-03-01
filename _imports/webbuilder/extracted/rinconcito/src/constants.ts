import { APARTMENTS as APTS } from './content/apartments';
import { BLOG_POSTS as BLOG } from './content/blog';
import { EXPERIENCES as EXPS } from './content/experiences';
import { GUIDES as GDS } from './content/guides';
import { LOCATIONS } from './content/locations';
import { BRAND } from './content/brand';

export const ENV = {
  RENTIKPRO_API_BASE: (import.meta as any).env?.VITE_RENTIKPRO_API_BASE || 'https://api.mock-rentikpro.com',
  RENTIKPRO_WEB_BASE: (import.meta as any).env?.VITE_RENTIKPRO_WEB_BASE || 'https://rentikpro.com',
  LOCATION1_LAT: 40.8064, // Fuentespalda
  LOCATION1_LON: 0.0642,
  LOCATION2_LAT: 40.9536, // Valjunquera
  LOCATION2_LON: 0.0264,
};

// Export real data collections
export const APARTMENTS = APTS;
export const BLOG_POSTS = BLOG;
export const EXPERIENCES = EXPS;
export const GUIDES = GDS;
export { BRAND, LOCATIONS };
