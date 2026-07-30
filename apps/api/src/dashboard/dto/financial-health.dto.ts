import { Currency } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class FinancialHealthDto {
  @ApiPropertyOptional({ enum: Currency, example: Currency.TRY })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
