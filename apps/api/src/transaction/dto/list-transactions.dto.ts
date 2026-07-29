import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ListTransactionsDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ format: 'uuid', example: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1' })
  @IsOptional()
  @IsUUID()
  category?: string;

  @ApiPropertyOptional({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-07-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ format: 'date-time', example: '2026-07-31T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @ApiPropertyOptional({ example: 'grocery' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  search?: string;

  @ApiPropertyOptional({ enum: ['occurredAt', 'amount', 'createdAt', 'updatedAt'], example: 'occurredAt' })
  @IsOptional()
  @IsIn(['occurredAt', 'amount', 'createdAt', 'updatedAt'])
  sortBy?: 'occurredAt' | 'amount' | 'createdAt' | 'updatedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
