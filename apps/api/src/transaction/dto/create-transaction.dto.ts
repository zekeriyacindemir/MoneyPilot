import { Transform, Type } from 'class-transformer';
import { Currency, PaymentMethod, TransactionType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
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

export class CreateTransactionDto {
  @ApiProperty({ format: 'uuid', example: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({
    description: 'Positive decimal amount with up to four fractional digits.',
    example: '125.50',
  })
  @Transform(normalizeAmount)
  @IsString()
  @Matches(/^(?=.*[1-9])(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
  amount!: string;

  @ApiProperty({ enum: Currency, example: Currency.TRY })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CARD })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Weekly grocery shopping' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ format: 'date-time', example: '2026-07-28T10:30:00.000Z' })
  @Type(() => Date)
  @IsDate()
  occurredAt!: Date;
}
