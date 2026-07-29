ALTER TABLE "User"
ADD COLUMN "budgetAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "savingsGoalAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "weeklySummaryEnabled" BOOLEAN NOT NULL DEFAULT false;
