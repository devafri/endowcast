-- Drop legacy 2-factor model columns from the Simulation table
ALTER TABLE "simulations"
DROP COLUMN IF EXISTS "equityReturn",
DROP COLUMN IF EXISTS "bondReturn",
DROP COLUMN IF EXISTS "equityVolatility",
DROP COLUMN IF EXISTS "bondVolatility",
DROP COLUMN IF EXISTS "correlation";

-- Drop legacy 2-factor model columns from the Portfolio table
ALTER TABLE "portfolios"
DROP COLUMN IF EXISTS "equityAllocation",
DROP COLUMN IF EXISTS "bondAllocation";
