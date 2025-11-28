-- migrations/20250307130000_enable_postgis.sql

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- AlterTable
ALTER TABLE "MunicipalProperty" ADD COLUMN     "geom" geometry(Point, 4326);

-- Add spatial index to the geom column in MunicipalProperty table
CREATE INDEX IF NOT EXISTS municipal_property_geom_idx ON "MunicipalProperty" USING GIST (geom);

-- Add spatial index for city and province columns for better queries
CREATE INDEX IF NOT EXISTS municipal_property_city_province_idx ON "MunicipalProperty" (city, province);

-- Create a function to generate geometry from lat/lng
CREATE OR REPLACE FUNCTION update_geom()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if latitude and longitude are provided
  IF (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update geometry when lat/lng changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_municipal_property_geom'
  ) THEN
    CREATE TRIGGER update_municipal_property_geom
    BEFORE INSERT OR UPDATE ON "MunicipalProperty"
    FOR EACH ROW
    EXECUTE FUNCTION update_geom();
  END IF;
END$$;

-- Add a function to calculate distance between points
CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $$
DECLARE
  point1 geometry;
  point2 geometry;
  distance_meters float;
BEGIN
  point1 := ST_SetSRID(ST_MakePoint(lon1, lat1), 4326);
  point2 := ST_SetSRID(ST_MakePoint(lon2, lat2), 4326);
  
  -- ST_Distance_Sphere gives distance in meters
  distance_meters := ST_Distance_Sphere(point1, point2);
  
  -- Convert to kilometers
  RETURN distance_meters / 1000.0;
END;
$$ LANGUAGE plpgsql;

-- Add function to find properties within radius
CREATE OR REPLACE FUNCTION find_properties_within_radius(
  center_lat float,
  center_lon float,
  radius_km float
)
RETURNS TABLE (
  id text,
  address text,
  city text,
  province text,
  distance_km float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.address,
    m.city,
    m.province,
    ST_Distance_Sphere(
      m.geom,
      ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326)
    ) / 1000.0 AS distance_km
  FROM
    "MunicipalProperty" m
  WHERE
    ST_DWithin(
      m.geom,
      ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326),
      radius_km * 1000.0
    )
  ORDER BY
    distance_km;
END;
$$ LANGUAGE plpgsql;