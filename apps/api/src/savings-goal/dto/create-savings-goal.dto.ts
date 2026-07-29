import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, GoalPriority } from '@prisma/client';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const positiveAmount = /^(?=.*[1-9])(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;
export const nonNegativeAmount = /^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/;

const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value;
const normalizeAmount = ({ value }: { value: unknown }): unknown => typeof value === 'number' ? value.toString() : value;

export class CreateSavingsGoalDto {
  @ApiProperty({ example: 'Acil durum fonu' }) @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @ApiProperty({ example: '50000.00' }) @Transform(normalizeAmount) @IsString() @Matches(positiveAmount) targetAmount!: string;
  @ApiProperty({ enum: Currency }) @IsEnum(Currency) currency!: Currency;
  @ApiPropertyOptional({ enum: GoalPriority, default: GoalPriority.MEDIUM }) @IsOptional() @IsEnum(GoalPriority) priority?: GoalPriority;
  @ApiPropertyOptional({ format: 'date', example: '2026-12-31' }) @IsOptional() @Type(() => Date) @IsDate() targetDate?: Date;
}
