import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SavingsGoalController } from './savings-goal.controller';
import { SavingsGoalService } from './savings-goal.service';

@Module({ imports: [PrismaModule], controllers: [SavingsGoalController], providers: [SavingsGoalService] })
export class SavingsGoalModule {}
