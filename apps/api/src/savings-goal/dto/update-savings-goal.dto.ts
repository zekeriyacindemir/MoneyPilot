import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { GoalStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateSavingsGoalDto } from './create-savings-goal.dto';

export class UpdateSavingsGoalDto extends PartialType(CreateSavingsGoalDto) {
  @ApiPropertyOptional({ enum: GoalStatus }) @IsOptional() @IsEnum(GoalStatus) status?: GoalStatus;
}
