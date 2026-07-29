import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BudgetModule } from './budget/budget.module';
import { CategoryModule } from './category/category.module';
import { validateEnvironment } from './config/environment.validation';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SavingsGoalModule } from './savings-goal/savings-goal.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    AuthModule,
    BudgetModule,
    CategoryModule,
    DashboardModule,
    PrismaModule,
    SavingsGoalModule,
    HealthModule,
    TransactionModule,
  ],
})
export class AppModule {}
