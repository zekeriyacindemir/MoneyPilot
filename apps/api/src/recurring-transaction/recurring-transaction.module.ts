import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecurringTransactionController } from './recurring-transaction.controller';
import { RecurringTransactionScheduler } from './recurring-transaction.scheduler';
import { RecurringTransactionService } from './recurring-transaction.service';

@Module({
  imports: [PrismaModule],
  controllers: [RecurringTransactionController],
  providers: [RecurringTransactionService, RecurringTransactionScheduler],
})
export class RecurringTransactionModule {}
