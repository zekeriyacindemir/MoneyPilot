import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { nonNegativeAmount } from './create-savings-goal.dto';

const normalizeAmount = ({ value }: { value: unknown }): unknown => typeof value === 'number' ? value.toString() : value;

export class UpdateCurrentAmountDto {
  @ApiProperty({ example: '12500.50' }) @Transform(normalizeAmount) @IsString() @Matches(nonNegativeAmount) currentAmount!: string;
}
