-- Add missing JSON columns to the simulations table to match the Prisma schema.
ALTER TABLE "simulations"
ADD COLUMN IF NOT EXISTS "assetAssumptions" JSONB,
ADD COLUMN IF NOT EXISTS "correlationMatrix" JSONB;
