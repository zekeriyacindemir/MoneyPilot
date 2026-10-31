import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment.validation';
import { RecurringTransactionService } from './recurring-transaction.service';

const RUN_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Materializes due recurring transactions on startup and hourly. Generation is idempotent and
 * row-locked, so running it on several API instances at once is safe.
 */
@Injectable()
export class RecurringTransactionScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(RecurringTransactionScheduler.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly recurringTransactions: RecurringTransactionService,
    private readonly configuration: ConfigService<Environment, true>,
  ) {}

  onApplicationBootstrap(): void {
    // Tests drive generation explicitly with a fixed clock.
    if (this.configuration.get('NODE_ENV', { infer: true }) === 'test') return;

    void this.run();
    this.timer = setInterval(() => void this.run(), RUN_INTERVAL_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const created = await this.recurringTransactions.generateDue();
      if (created > 0) this.logger.log(`Created ${created} recurring transaction(s).`);
    } catch (error) {
      this.logger.error(
        'Recurring transaction generation failed.',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }
}
