import { Transform } from 'class-transformer';
import { CategoryType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const CATEGORY_NAME_MAX_LENGTH = 50;
export const CATEGORY_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const CATEGORY_ICON_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @ApiProperty({ maxLength: CATEGORY_NAME_MAX_LENGTH, example: 'Freelance' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATEGORY_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ enum: CategoryType, example: CategoryType.INCOME })
  @IsEnum(CategoryType)
  type!: CategoryType;

  @ApiPropertyOptional({ pattern: CATEGORY_COLOR_PATTERN.source, example: '#14B8A6' })
  @IsOptional()
  @Matches(CATEGORY_COLOR_PATTERN, { message: 'color must be a hex color such as #14B8A6' })
  color?: string;

  @ApiPropertyOptional({ maxLength: 50, example: 'briefcase' })
  @IsOptional()
  @MaxLength(50)
  @Matches(CATEGORY_ICON_PATTERN, { message: 'icon must be a lowercase kebab-case name' })
  icon?: string;
}
