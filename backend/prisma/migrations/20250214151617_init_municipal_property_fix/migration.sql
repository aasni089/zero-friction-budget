/*
  Warnings:

  - A unique constraint covering the columns `[address,city]` on the table `MunicipalProperty` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "MunicipalProperty_address_key";

-- CreateIndex
CREATE UNIQUE INDEX "MunicipalProperty_address_city_key" ON "MunicipalProperty"("address", "city");
