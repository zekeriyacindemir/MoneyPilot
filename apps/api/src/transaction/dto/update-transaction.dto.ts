import { Transform, Type } from 'class-transformer';
import { Currency, PaymentMethod, TransactionType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateTransactionDto {
  @ApiPropertyOptional({ format: 'uuid', example: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    description: 'Positive decimal amount with up to four fractional digits.',
    example: '150.75',
  })
  @IsOptional()
  @Transform(normalizeAmount)
  @IsString()
  @Matches(/^(?=.*[1-9])(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
  amount?: string;

  @ApiPropertyOptional({ enum: Currency, example: Currency.TRY })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ enum: PaymentMethod, example: PaymentMethod.CARD })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Updated grocery shopping note' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-07-28T10:30:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  occurredAt?: Date;
}
