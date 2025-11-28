// utils/city-centers.js

/**
 * Default coordinates for downtown areas of major Canadian cities
 * Coordinates are in format [latitude, longitude]
 */
const CITY_CENTERS = {
    // Ontario
    'OTTAWA': [45.4215, -75.6972],       // Downtown Ottawa
    'TORONTO': [43.6532, -79.3832],      // Downtown Toronto
    'MISSISSAUGA': [43.5890, -79.6441],  // Downtown Mississauga
    'LONDON': [42.9849, -81.2453],       // Downtown London
    'HAMILTON': [43.2557, -79.8711],     // Downtown Hamilton
    'KINGSTON': [44.2312, -76.4860],     // Downtown Kingston
    'WINDSOR': [42.3149, -83.0364],      // Downtown Windsor
    'KITCHENER': [43.4516, -80.4925],    // Downtown Kitchener
    'WATERLOO': [43.4668, -80.5164],     // Downtown Waterloo
    
    // British Columbia
    'VANCOUVER': [49.2827, -123.1207],   // Downtown Vancouver
    'VICTORIA': [48.4284, -123.3656],    // Downtown Victoria
    'KELOWNA': [49.8880, -119.4960],     // Downtown Kelowna
    'SURREY': [49.1913, -122.8490],      // Central Surrey
    
    // Alberta
    'CALGARY': [51.0447, -114.0719],     // Downtown Calgary
    'EDMONTON': [53.5461, -113.4938],    // Downtown Edmonton
    
    // Quebec
    'MONTREAL': [45.5017, -73.5673],     // Downtown Montreal
    'QUEBEC CITY': [46.8139, -71.2082],  // Old Quebec
    'LAVAL': [45.5667, -73.7417],        // Central Laval
    
    // Other major cities
    'WINNIPEG': [49.8951, -97.1384],     // Downtown Winnipeg
    'HALIFAX': [44.6488, -63.5752],      // Downtown Halifax
    'SASKATOON': [52.1332, -106.6700],   // Downtown Saskatoon
    'REGINA': [50.4452, -104.6189],      // Downtown Regina
    
    // Default if city not found
    'DEFAULT': [45.4215, -75.6972]       // Default to Ottawa (capital)
  };
  
  /**
   * Get downtown coordinates for a given city
   * @param {string} city - City name
   * @returns {Object} - { lat, lng } coordinates
   */
  function getCityCenter(city) {
    if (!city) return { lat: CITY_CENTERS.DEFAULT[0], lng: CITY_CENTERS.DEFAULT[1] };
    
    // Normalize city name for matching
    const normalizedCity = city.toUpperCase().trim();
    
    // Try exact match first
    if (CITY_CENTERS[normalizedCity]) {
      const [lat, lng] = CITY_CENTERS[normalizedCity];
      return { lat, lng };
    }
    
    // Try partial match
    for (const [cityName, coordinates] of Object.entries(CITY_CENTERS)) {
      if (cityName.includes(normalizedCity) || normalizedCity.includes(cityName)) {
        const [lat, lng] = coordinates;
        return { lat, lng };
      }
    }
    
    // Return default if no match found
    return { lat: CITY_CENTERS.DEFAULT[0], lng: CITY_CENTERS.DEFAULT[1] };
  }
  
  module.exports = {
    CITY_CENTERS,
    getCityCenter
  };