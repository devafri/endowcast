-- Add missing 7-factor model columns to portfolios table
-- These should have been added in the initial 7-factor migration but weren't applied

ALTER TABLE "portfolios" ADD COLUMN "publicEquity" DOUBLE PRECISION,
ADD COLUMN "privateEquity" DOUBLE PRECISION,
ADD COLUMN "publicFixedIncome" DOUBLE PRECISION,
ADD COLUMN "privateCredit" DOUBLE PRECISION,
ADD COLUMN "realAssets" DOUBLE PRECISION,
ADD COLUMN "diversifying" DOUBLE PRECISION,
ADD COLUMN "cashShortTerm" DOUBLE PRECISION;

-- Set default values of 0 for new columns to maintain backward compatibility
UPDATE "portfolios" 
SET 
  "publicEquity" = COALESCE("equityAllocation", 0) / 2,
  "privateEquity" = COALESCE("equityAllocation", 0) / 2,
  "publicFixedIncome" = COALESCE("bondAllocation", 0) / 2,
  "privateCredit" = COALESCE("bondAllocation", 0) / 2,
  "realAssets" = 0,
  "diversifying" = 0,
  "cashShortTerm" = 0
WHERE "publicEquity" IS NULL;
