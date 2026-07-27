-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('TRY', 'USD', 'EUR', 'GBP');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "displayName" VARCHAR(100),
    "defaultCurrency" "Currency" NOT NULL DEFAULT 'TRY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "type" "CategoryType" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "color" VARCHAR(7),
    "icon" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Category_system_owner_check" CHECK (("isSystem" = true AND "userId" IS NULL) OR ("isSystem" = false AND "userId" IS NOT NULL))
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "paymentMethod" "PaymentMethod",
    "note" VARCHAR(500),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Transaction_amount_positive_check" CHECK ("amount" > 0)
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "periodStart" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Budget_amount_positive_check" CHECK ("amount" > 0)
);

-- CreateTable
CREATE TABLE "SavingsGoal" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "targetAmount" DECIMAL(19,4) NOT NULL,
    "currentAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "priority" "GoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetDate" DATE,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavingsGoal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SavingsGoal_target_amount_positive_check" CHECK ("targetAmount" > 0),
    CONSTRAINT "SavingsGoal_current_amount_nonnegative_check" CHECK ("currentAmount" >= 0),
    CONSTRAINT "SavingsGoal_completion_state_check" CHECK (("status" = 'COMPLETED' AND "completedAt" IS NOT NULL AND "currentAmount" >= "targetAmount") OR ("status" <> 'COMPLETED' AND "completedAt" IS NULL))
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Category_userId_type_idx" ON "Category"("userId", "type");

-- CreateIndex
CREATE INDEX "Category_isSystem_type_idx" ON "Category"("isSystem", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Category_system_name_type_key" ON "Category"("name", "type") WHERE "isSystem" = true AND "userId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_type_key" ON "Category"("userId", "name", "type") WHERE "isSystem" = false AND "userId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Transaction_userId_occurredAt_idx" ON "Transaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_occurredAt_idx" ON "Transaction"("userId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_categoryId_occurredAt_idx" ON "Transaction"("userId", "categoryId", "occurredAt");

-- CreateIndex
CREATE INDEX "Budget_userId_periodStart_idx" ON "Budget"("userId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_period_periodStart_key" ON "Budget"("userId", "categoryId", "period", "periodStart");

-- CreateIndex
CREATE INDEX "SavingsGoal_userId_status_idx" ON "SavingsGoal"("userId", "status");

-- CreateIndex
CREATE INDEX "SavingsGoal_userId_targetDate_idx" ON "SavingsGoal"("userId", "targetDate");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
