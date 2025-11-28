// utils/postgis.js
const prisma = require('../config/database');

/**
 * Find properties within a radius around a point
 * @param {number} latitude - Center point latitude
 * @param {number} longitude - Center point longitude 
 * @param {number} radiusKm - Search radius in kilometers
 * @param {number} limit - Maximum number of results
 * @param {number} offset - Pagination offset
 * @returns {Array} Array of municipal properties within the radius
 */
exports.findPropertiesWithinRadius = async (latitude, longitude, radiusKm = 1, limit = 10, offset = 0) => {
  try {
    // Convert radius from kilometers to meters for ST_DWithin
    const radiusInMeters = radiusKm * 1000;
    
    // Execute spatial query using PostGIS
    const results = await prisma.$queryRaw`
      SELECT 
        m.id, 
        m.address, 
        m.city, 
        m.province, 
        m."postalCode", 
        m.latitude, 
        m.longitude,
        m.municipality,
        m.ward,
        ST_Distance(
          m.geom, 
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
        ) AS distance
      FROM "MunicipalProperty" m
      WHERE ST_DWithin(
        m.geom,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
        ${radiusInMeters}
      )
      ORDER BY distance
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    return results;
  } catch (error) {
    console.error('Error in findPropertiesWithinRadius:', error);
    throw error;
  }
};

/**
 * Count properties within a radius around a point
 * @param {number} latitude - Center point latitude
 * @param {number} longitude - Center point longitude 
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {number} Count of municipal properties within the radius
 */
exports.countPropertiesWithinRadius = async (latitude, longitude, radiusKm = 1) => {
  try {
    // Convert radius from kilometers to meters for ST_DWithin
    const radiusInMeters = radiusKm * 1000;
    
    // Execute spatial count query using PostGIS
    const result = await prisma.$queryRaw`
      SELECT COUNT(*)
      FROM "MunicipalProperty" m
      WHERE ST_DWithin(
        m.geom,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
        ${radiusInMeters}
      )
    `;
    
    return parseInt(result[0].count);
  } catch (error) {
    console.error('Error in countPropertiesWithinRadius:', error);
    throw error;
  }
};

/**
 * Create a PostGIS point from latitude and longitude
 * @param {number} latitude - Point latitude
 * @param {number} longitude - Point longitude
 * @returns {Object} PostGIS point in GeoJSON format
 */
exports.createPoint = (latitude, longitude) => {
  return {
    type: 'Point',
    coordinates: [longitude, latitude],
    crs: { type: 'name', properties: { name: 'EPSG:4326' } }
  };
};

/**
 * Find nearest properties to a point
 * @param {number} latitude - Center point latitude
 * @param {number} longitude - Center point longitude 
 * @param {number} limit - Maximum number of results
 * @returns {Array} Array of nearest municipal properties
 */
exports.findNearestProperties = async (latitude, longitude, limit = 5) => {
  try {
    // Execute spatial query using PostGIS to find nearest properties
    const results = await prisma.$queryRaw`
      SELECT 
        m.id, 
        m.address, 
        m.city, 
        m.province, 
        m."postalCode", 
        m.latitude, 
        m.longitude,
        m.municipality,
        m.ward,
        ST_Distance(
          m.geom, 
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
        ) AS distance
      FROM "MunicipalProperty" m
      WHERE m.geom IS NOT NULL
      ORDER BY m.geom <-> ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
      LIMIT ${limit}
    `;
    
    return results;
  } catch (error) {
    console.error('Error in findNearestProperties:', error);
    throw error;
  }
};

/**
 * Find properties within a bounding box
 * @param {number} minLat - Minimum latitude
 * @param {number} minLng - Minimum longitude
 * @param {number} maxLat - Maximum latitude
 * @param {number} maxLng - Maximum longitude
 * @param {number} limit - Maximum number of results
 * @param {number} offset - Pagination offset
 * @returns {Array} Array of municipal properties within the bounding box
 */
exports.findPropertiesInBoundingBox = async (minLat, minLng, maxLat, maxLng, limit = 100, offset = 0) => {
  try {
    // Execute spatial query using PostGIS to find properties in bounding box
    const results = await prisma.$queryRaw`
      SELECT 
        m.id, 
        m.address, 
        m.city, 
        m.province, 
        m."postalCode", 
        m.latitude, 
        m.longitude,
        m.municipality,
        m.ward
      FROM "MunicipalProperty" m
      WHERE ST_Within(
        m.geom,
        ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
      )
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    return results;
  } catch (error) {
    console.error('Error in findPropertiesInBoundingBox:', error);
    throw error;
  }
};

/**
 * Update the PostGIS point for a municipal property
 * @param {string} id - Municipal property ID
 * @param {number} latitude - New latitude
 * @param {number} longitude - New longitude
 * @returns {boolean} Success status
 */
exports.updatePropertyGeometry = async (id, latitude, longitude) => {
  try {
    // Update the property's geometry
    await prisma.$executeRaw`
      UPDATE "MunicipalProperty"
      SET 
        geom = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
        latitude = ${latitude},
        longitude = ${longitude},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    
    return true;
  } catch (error) {
    console.error(`Error updating geometry for property ${id}:`, error);
    throw error;
  }
};