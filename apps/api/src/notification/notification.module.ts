import { Module } from '@nestjs/common';
import { BudgetModule } from '../budget/budget.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationController } from './notification.controller';
import { NotificationScheduler } from './notification.scheduler';
import { NotificationService } from './notification.service';

@Module({
  imports: [PrismaModule, BudgetModule, DashboardModule, MailModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationScheduler],
})
export class NotificationModule {}
