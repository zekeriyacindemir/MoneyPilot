import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BudgetPeriod, Currency, CategoryType } from '@prisma/client';
import { IsDate, IsEnum, IsString, IsUUID, Matches } from 'class-validator';

const normalizeAmount = ({ value }: { value: unknown }): unknown => typeof value === 'number' ? value.toString() : value;

export class CreateBudgetDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() categoryId!: string;
  @ApiProperty({ enum: CategoryType }) @IsEnum(CategoryType) type!: CategoryType;
  @ApiProperty({ example: '5000.00' }) @Transform(normalizeAmount) @IsString() @Matches(/^(?=.*[1-9])(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/) amount!: string;
  @ApiProperty({ enum: Currency }) @IsEnum(Currency) currency!: Currency;
  @ApiProperty({ enum: BudgetPeriod }) @IsEnum(BudgetPeriod) period!: BudgetPeriod;
  @ApiProperty({ format: 'date', example: '2026-07-28' }) @Type(() => Date) @IsDate() periodStart!: Date;
}
