import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @Transform(({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword?: string;
}
