import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Currency } from '@prisma/client';

export class UpdatePreferencesDto {
  @IsOptional() @IsEnum(Currency) defaultCurrency?: Currency;
  @IsOptional() @IsBoolean() budgetAlertsEnabled?: boolean;
  @IsOptional() @IsBoolean() savingsGoalAlertsEnabled?: boolean;
  @IsOptional() @IsBoolean() weeklySummaryEnabled?: boolean;
}
