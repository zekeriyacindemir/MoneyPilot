import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetPeriod } from '@prisma/client';
import { IsDate, IsEnum, IsOptional } from 'class-validator';

export class ListBudgetsDto {
  @ApiPropertyOptional({ enum: BudgetPeriod }) @IsOptional() @IsEnum(BudgetPeriod) period?: BudgetPeriod;
  @ApiPropertyOptional({ format: 'date', description: 'Date that must fall within the returned budget period.' }) @IsOptional() @Type(() => Date) @IsDate() date?: Date;
}
