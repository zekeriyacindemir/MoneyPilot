import { Transform } from 'class-transformer';
import { Currency, PaymentMethod, RecurrenceFrequency, TransactionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeAmount = ({ value }: { value: unknown }): unknown =>
  typeof value === 'number' ? value.toString() : value;

export const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateRecurringTransactionDto {
  @ApiProperty({ format: 'uuid', example: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({
    description: 'Positive decimal amount with up to four fractional digits.',
    example: '15000.00',
  })
  @Transform(normalizeAmount)
  @IsString()
  @Matches(/^(?=.*[1-9])(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
  amount!: string;

  @ApiProperty({ enum: Currency, example: Currency.TRY })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.BANK_TRANSFER })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Kira' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ enum: RecurrenceFrequency, example: RecurrenceFrequency.MONTHLY })
  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  @ApiProperty({
    format: 'date',
    example: '2026-11-01',
    description:
      'First occurrence as an Istanbul calendar date. May be up to one year in the past; past occurrences are created immediately.',
  })
  @Matches(CALENDAR_DATE_PATTERN)
  @IsISO8601({ strict: true })
  startDate!: string;

  @ApiPropertyOptional({
    format: 'date',
    example: '2027-10-01',
    description: 'Last possible occurrence date.',
  })
  @IsOptional()
  @Matches(CALENDAR_DATE_PATTERN)
  @IsISO8601({ strict: true })
  endDate?: string;
}
