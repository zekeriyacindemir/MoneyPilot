import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsOptional, Matches } from 'class-validator';
import {
  CALENDAR_DATE_PATTERN,
  CreateRecurringTransactionDto,
} from './create-recurring-transaction.dto';

// The type is fixed after creation, like a category's. Schedule changes apply from a future start date.
export class UpdateRecurringTransactionDto extends PartialType(
  OmitType(CreateRecurringTransactionDto, ['type', 'endDate'] as const),
) {
  @ApiPropertyOptional({
    format: 'date',
    nullable: true,
    description: 'Send null to remove the end date.',
  })
  @IsOptional()
  @Matches(CALENDAR_DATE_PATTERN)
  @IsISO8601({ strict: true })
  endDate?: string | null;

  @ApiPropertyOptional({
    description: 'Pause or resume. Occurrences missed while paused are skipped.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
