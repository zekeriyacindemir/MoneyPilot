import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DailyGeneralTipService } from './daily-general-tip.service';
import { ExchangeRateService } from './exchange-rate.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DailyGeneralTipService, ExchangeRateService],
  exports: [ExchangeRateService],
})
export class DashboardModule {}
