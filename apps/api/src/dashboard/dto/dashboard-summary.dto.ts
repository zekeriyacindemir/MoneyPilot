import { Transform } from 'class-transformer';
import { Currency } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export const dashboardPeriods = ['current_month', 'last_3_months', 'last_6_months', 'last_12_months'] as const;

export type DashboardPeriod = (typeof dashboardPeriods)[number];

export class DashboardSummaryDto {
  @ApiPropertyOptional({ enum: Currency, default: Currency.TRY, example: Currency.TRY })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ enum: dashboardPeriods, default: 'current_month', example: 'last_6_months' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEnum(dashboardPeriods)
  period?: DashboardPeriod;
}
