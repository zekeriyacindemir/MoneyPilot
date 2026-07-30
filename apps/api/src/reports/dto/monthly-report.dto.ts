import { Transform } from 'class-transformer';
import { Currency } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';

export class MonthlyReportDto {
  @ApiPropertyOptional({ example: '2026-07', format: 'YYYY-MM' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;

  @ApiPropertyOptional({ enum: Currency, example: Currency.TRY })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
