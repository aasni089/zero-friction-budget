-- Drop the existing trigger
DROP TRIGGER IF EXISTS update_municipal_property_geom ON "MunicipalProperty";

-- Update the function to use latitude_wgs84 and longitude_wgs84
CREATE OR REPLACE FUNCTION update_geom()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if latitude_wgs84 and longitude_wgs84 are provided
  IF (NEW.latitude_wgs84 IS NOT NULL AND NEW.longitude_wgs84 IS NOT NULL) THEN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude_wgs84, NEW.latitude_wgs84), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the updated function
CREATE TRIGGER update_municipal_property_geom
BEFORE INSERT OR UPDATE ON "MunicipalProperty"
FOR EACH ROW
EXECUTE FUNCTION update_geom();

-- Update existing geom values to use latitude_wgs84 and longitude_wgs84
UPDATE "MunicipalProperty"
SET geom = ST_SetSRID(ST_MakePoint("longitude_wgs84", "latitude_wgs84"), 4326)
WHERE "latitude_wgs84" IS NOT NULL AND "longitude_wgs84" IS NOT NULL;