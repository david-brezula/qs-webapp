-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultPriceConnect" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "defaultPriceTie" DECIMAL(10,2) NOT NULL DEFAULT 0;
