import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { Currency } from '@prisma/client';

const normalizeAmount = ({ value }: { value: unknown }): unknown =>
  typeof value === 'number' ? value.toString() : value;

export class UpdatePreferencesDto {
  @IsOptional() @IsEnum(Currency) defaultCurrency?: Currency;
  @IsOptional() @IsBoolean() budgetAlertsEnabled?: boolean;
  @IsOptional() @IsBoolean() savingsGoalAlertsEnabled?: boolean;
  @IsOptional() @IsBoolean() weeklySummaryEnabled?: boolean;
  /** Money held before the first recorded transaction; negative for an initial debt. */
  @IsOptional()
  @Transform(normalizeAmount)
  @IsString()
  @Matches(/^-?(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
  openingBalance?: string;
  @IsOptional() @IsEnum(Currency) openingBalanceCurrency?: Currency;
}
