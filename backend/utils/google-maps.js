// utils/google-maps.js
const axios = require('axios');

// Get Google Maps API key from environment variables
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Geocode an address using Google Maps API
 * @param {string} address - Full address to geocode
 * @param {string} city - City name
 * @param {string} province - Province code
 * @param {string} postalCode - Postal code (optional)
 * @returns {Object} Location details with coordinates
 */
exports.geocodeAddress = async (address, city, province, postalCode = '') => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    // Format the address for the API
    const formattedAddress = `${address}, ${city}, ${province}${postalCode ? `, ${postalCode}` : ''}, Canada`;
    
    // Make request to Google Maps Geocoding API
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: formattedAddress,
        key: GOOGLE_MAPS_API_KEY,
        region: 'ca' // Region biasing for Canada
      }
    });

    // Check if the request was successful
    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }

    // Check if results were found
    if (!response.data.results || response.data.results.length === 0) {
      throw new Error('No geocoding results found for this address');
    }

    // Get the first result
    const result = response.data.results[0];
    
    // Extract location data
    const location = {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id
    };

    // Extract components
    const components = {};
    result.address_components.forEach(component => {
      component.types.forEach(type => {
        components[type] = component.long_name;
        components[`${type}_short`] = component.short_name;
      });
    });

    // Add additional useful information
    return {
      ...location,
      components,
      rawResponse: result
    };
  } catch (error) {
    console.error('Error in geocodeAddress:', error);
    throw error;
  }
};

/**
 * Reverse geocode coordinates to find the address
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Object} Address details
 */
exports.reverseGeocode = async (latitude, longitude) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    // Make request to Google Maps Reverse Geocoding API
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${latitude},${longitude}`,
        key: GOOGLE_MAPS_API_KEY,
        region: 'ca' // Region biasing for Canada
      }
    });

    // Check if the request was successful
    if (response.data.status !== 'OK') {
      throw new Error(`Reverse geocoding API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }

    // Check if results were found
    if (!response.data.results || response.data.results.length === 0) {
      throw new Error('No reverse geocoding results found for these coordinates');
    }

    // Get the first result (most accurate)
    const result = response.data.results[0];
    
    // Extract address data
    const addressData = {
      formattedAddress: result.formatted_address,
      placeId: result.place_id
    };

    // Extract components
    const components = {};
    result.address_components.forEach(component => {
      component.types.forEach(type => {
        components[type] = component.long_name;
        components[`${type}_short`] = component.short_name;
      });
    });

    // Map components to structured address
    const structured = {
      streetNumber: components.street_number,
      street: components.route,
      city: components.locality || components.administrative_area_level_2,
      province: components.administrative_area_level_1,
      provinceCode: components.administrative_area_level_1_short,
      postalCode: components.postal_code,
      country: components.country,
      countryCode: components.country_short
    };

    return {
      ...addressData,
      components,
      structured,
      rawResponse: result
    };
  } catch (error) {
    console.error('Error in reverseGeocode:', error);
    throw error;
  }
};

/**
 * Get autocomplete suggestions for an address
 * @param {string} input - Partial address input
 * @param {Object} options - Additional options
 * @returns {Array} Address predictions
 */
exports.getAddressPredictions = async (input, options = {}) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    // Define default options
    const defaultOptions = {
      country: 'ca', // Canada
      types: 'address'
    };

    // Merge options
    const params = {
      ...defaultOptions,
      ...options,
      input,
      key: GOOGLE_MAPS_API_KEY
    };

    // Make request to Google Maps Places Autocomplete API
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params
    });

    // Check if the request was successful
    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Places Autocomplete API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }

    // Return the predictions
    return response.data.predictions || [];
  } catch (error) {
    console.error('Error in getAddressPredictions:', error);
    throw error;
  }
};

/**
 * Get distance between two coordinates
 * @param {number} lat1 - Starting point latitude
 * @param {number} lng1 - Starting point longitude
 * @param {number} lat2 - Ending point latitude
 * @param {number} lng2 - Ending point longitude
 * @returns {Object} Distance in kilometers and miles
 */
exports.getDistanceBetweenCoordinates = (lat1, lng1, lat2, lng2) => {
  const earthRadiusKm = 6371;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLng = degreesToRadians(lng2 - lng1);

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = earthRadiusKm * c;
  const distanceMiles = distanceKm * 0.621371;

  return {
    kilometers: distanceKm,
    miles: distanceMiles
  };
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Get place details from a place ID
 * @param {string} placeId - Google Maps Place ID
 * @returns {Object} Detailed place information
 */
exports.getPlaceDetails = async (placeId) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key is not configured');
    }

    // Make request to Google Maps Place Details API
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        key: GOOGLE_MAPS_API_KEY,
        fields: 'address_component,adr_address,formatted_address,geometry,name,place_id,plus_code,type,url'
      }
    });

    // Check if the request was successful
    if (response.data.status !== 'OK') {
      throw new Error(`Place Details API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }

    return response.data.result;
  } catch (error) {
    console.error('Error in getPlaceDetails:', error);
    throw error;
  }
};

/**
 * Validate a Canadian postal code format
 * @param {string} postalCode - Postal code to validate
 * @returns {boolean} Whether the postal code is valid
 */
exports.isValidCanadianPostalCode = (postalCode) => {
  if (!postalCode) return false;
  
  // Remove spaces and convert to uppercase
  const formatted = postalCode.replace(/\s/g, '').toUpperCase();
  
  // Canadian postal code format: A1A 1A1
  const regex = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;
  
  return regex.test(formatted);
};

/**
 * Format a Canadian postal code with a space
 * @param {string} postalCode - Postal code to format
 * @returns {string} Formatted postal code
 */
exports.formatCanadianPostalCode = (postalCode) => {
  if (!postalCode) return '';
  
  // Remove spaces and convert to uppercase
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
  
  // Insert space after the third character
  if (cleaned.length >= 6) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)}`;
  }
  
  return cleaned;
};