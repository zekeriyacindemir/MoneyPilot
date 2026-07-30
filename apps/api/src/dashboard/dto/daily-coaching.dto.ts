import { Currency } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class DailyCoachingDto {
  @ApiPropertyOptional({ enum: Currency, example: Currency.TRY })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
