import { Transform } from 'class-transformer';
import { CategoryType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ListCategoriesDto {
  @ApiPropertyOptional({ enum: CategoryType, example: CategoryType.EXPENSE })
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

  @ApiPropertyOptional({ example: 'market' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;
}
