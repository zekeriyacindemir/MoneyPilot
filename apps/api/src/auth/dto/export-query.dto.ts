import { IsEnum } from 'class-validator';

export class ExportQueryDto {
  @IsEnum(['json', 'csv']) format!: 'json' | 'csv';
}
