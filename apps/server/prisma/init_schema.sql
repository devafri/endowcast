-- Prisma schema SQL migration for EndowCast
-- Generated from prisma/schema.prisma
-- Run this in Supabase SQL editor to create all tables

-- Create ENUM types
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'VIEWER');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- Create organizations table
CREATE TABLE "organizations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "domain" TEXT,
  "contactEmail" TEXT NOT NULL,
  "industry" TEXT,
  "size" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create subscriptions table
CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL UNIQUE,
  "planType" TEXT NOT NULL DEFAULT 'FREE',
  "status" TEXT NOT NULL DEFAULT 'active',
  "stripeCustomerId" TEXT UNIQUE,
  "stripeSubscriptionId" TEXT UNIQUE,
  "stripePriceId" TEXT,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP(3),
  "simulationsUsed" INTEGER NOT NULL DEFAULT 0,
  "simulationsReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE
);

-- Create users table
CREATE TABLE "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "jobTitle" TEXT,
  "department" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "verificationToken" TEXT,
  "verificationExpiry" TIMESTAMP(3),
  "resetToken" TEXT,
  "resetExpiry" TIMESTAMP(3),
  "loginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "notifications" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLogin" TIMESTAMP(3),
  CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE
);

-- Create simulations table
CREATE TABLE "simulations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "years" INTEGER NOT NULL,
  "startYear" INTEGER NOT NULL,
  "initialValue" DOUBLE PRECISION NOT NULL,
  "spendingRate" DOUBLE PRECISION NOT NULL,
  "spendingGrowth" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "equityReturn" DOUBLE PRECISION NOT NULL,
  "equityVolatility" DOUBLE PRECISION NOT NULL,
  "bondReturn" DOUBLE PRECISION NOT NULL,
  "bondVolatility" DOUBLE PRECISION NOT NULL,
  "correlation" DOUBLE PRECISION NOT NULL,
  "equityShock" DOUBLE PRECISION,
  "cpiShift" DOUBLE PRECISION,
  "grantTargets" JSONB,
  "results" JSONB,
  "summary" JSONB,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "runCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "simulations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "simulations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE
);

-- Create portfolios table
CREATE TABLE "portfolios" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "simulationId" TEXT UNIQUE,
  "equityAllocation" DOUBLE PRECISION NOT NULL,
  "bondAllocation" DOUBLE PRECISION NOT NULL,
  "alternativeAllocation" DOUBLE PRECISION DEFAULT 0,
  "cashAllocation" DOUBLE PRECISION DEFAULT 0,
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portfolios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "portfolios_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations" ("id")
);

-- Create payments table
CREATE TABLE "payments" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "stripePaymentIntentId" TEXT UNIQUE,
  "stripeInvoiceId" TEXT UNIQUE,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE
);

-- Create sessions table
CREATE TABLE "sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create contact_submissions table
CREATE TABLE "contact_submissions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE "invoices" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "stripeInvoiceId" TEXT NOT NULL UNIQUE,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "dueDate" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "invoices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id")
);

-- Create invitations table
CREATE TABLE "invitations" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "token" TEXT NOT NULL UNIQUE,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users" ("id") ON DELETE CASCADE,
  UNIQUE ("email", "organizationId")
);

-- Create indexes for commonly queried fields
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "simulations_organizationId_idx" ON "simulations"("organizationId");
CREATE INDEX "simulations_userId_idx" ON "simulations"("userId");
CREATE INDEX "portfolios_userId_idx" ON "portfolios"("userId");
CREATE INDEX "payments_organizationId_idx" ON "payments"("organizationId");
CREATE INDEX "invoices_organizationId_idx" ON "invoices"("organizationId");
CREATE INDEX "invitations_organizationId_idx" ON "invitations"("organizationId");
CREATE INDEX "invitations_email_idx" ON "invitations"("email");
