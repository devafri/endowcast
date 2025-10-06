/*
  Warnings:

  - You are about to drop the column `organization` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `planExpires` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `planStarted` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `planType` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `simulationsReset` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `simulationsUsed` on the `users` table. All the data in the column will be lost.
  - Added the required column `organizationId` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "contactEmail" TEXT NOT NULL,
    "industry" TEXT,
    "size" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "planType" TEXT NOT NULL DEFAULT 'FREE',
    "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" DATETIME NOT NULL,
    "userLimit" INTEGER NOT NULL DEFAULT 1,
    "simulationsPerMonth" INTEGER NOT NULL DEFAULT 10,
    "simulationsUsed" INTEGER NOT NULL DEFAULT 0,
    "simulationsReset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trialEnds" DATETIME,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripeInvoiceId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "planType" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "paymentMethod" TEXT,
    "description" TEXT,
    "processedAt" DATETIME,
    "refundedAt" DATETIME,
    "refundAmount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "jobTitle" TEXT,
    "department" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verificationExpiry" DATETIME,
    "resetToken" TEXT,
    "resetExpiry" DATETIME,
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLogin" DATETIME,
    CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_users" ("createdAt", "email", "emailVerified", "firstName", "id", "isActive", "jobTitle", "lastLogin", "lastName", "password", "updatedAt") SELECT "createdAt", "email", "emailVerified", "firstName", "id", "isActive", "jobTitle", "lastLogin", "lastName", "password", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organizationId_key" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentIntentId_key" ON "payments"("paymentIntentId");
