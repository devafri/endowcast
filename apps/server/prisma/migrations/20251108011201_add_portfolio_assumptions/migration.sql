-- AlterTable
ALTER TABLE "portfolios" ADD COLUMN     "assetAssumptions" JSONB,
ADD COLUMN     "correlationMatrix" JSONB;
