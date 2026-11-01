import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment.validation';
import { NotificationService } from './notification.service';

const RUN_INTERVAL_MS = 60 * 60 * 1000;
// Lets recurring transactions for the hour be created before alerts are evaluated.
const STARTUP_DELAY_MS = 60 * 1000;

/** Evaluates notification alerts hourly. Dedupe keys make overlapping runs harmless. */
@Injectable()
export class NotificationScheduler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(NotificationScheduler.name);
  private timers: NodeJS.Timeout[] = [];
  private running = false;

  constructor(
    private readonly notifications: NotificationService,
    private readonly configuration: ConfigService<Environment, true>,
  ) {}

  onApplicationBootstrap(): void {
    // Tests drive checks explicitly.
    if (this.configuration.get('NODE_ENV', { infer: true }) === 'test') return;

    const startup = setTimeout(() => void this.run(), STARTUP_DELAY_MS);
    const interval = setInterval(() => void this.run(), RUN_INTERVAL_MS);
    this.timers = [startup, interval];
    this.timers.forEach((timer) => timer.unref());
  }

  onApplicationShutdown(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
  }

  private async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const created = await this.notifications.runChecks();
      if (created > 0) this.logger.log(`Created ${created} notification(s).`);
    } catch (error) {
      this.logger.error(
        'Notification checks failed.',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }
}
