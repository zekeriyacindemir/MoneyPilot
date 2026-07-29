import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateCurrentAmountDto } from './dto/update-current-amount.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';
import { SavingsGoalService, type SavingsGoalResponse } from './savings-goal.service';

@Controller('savings-goals') @UseGuards(JwtAccessGuard) @ApiTags('Savings goals') @ApiBearerAuth('access-token')
export class SavingsGoalController {
  constructor(private readonly savingsGoalService: SavingsGoalService) {}
  @Post() @ApiOperation({ summary: 'Create a savings goal' }) @ApiBody({ type: CreateSavingsGoalDto }) @ApiCreatedResponse({ description: 'Savings goal created.' }) @ApiBadRequestResponse({ description: 'Validation failed.' }) @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' }) create(@CurrentUser() user: { sub: string }, @Body() dto: CreateSavingsGoalDto): Promise<SavingsGoalResponse> { return this.savingsGoalService.create(user.sub, dto); }
  @Get() @ApiOperation({ summary: 'List the authenticated user’s savings goals' }) @ApiOkResponse({ description: 'Savings goals, with active goals first.' }) findAll(@CurrentUser() user: { sub: string }): Promise<SavingsGoalResponse[]> { return this.savingsGoalService.findAll(user.sub); }
  @Get(':id') @ApiParam({ name: 'id', format: 'uuid' }) @ApiNotFoundResponse({ description: 'Savings goal not found.' }) findOne(@CurrentUser() user: { sub: string }, @Param('id', new ParseUUIDPipe()) id: string): Promise<SavingsGoalResponse> { return this.savingsGoalService.findOne(user.sub, id); }
  @Patch(':id') @ApiParam({ name: 'id', format: 'uuid' }) @ApiBody({ type: UpdateSavingsGoalDto }) @ApiOkResponse({ description: 'Savings goal updated.' }) @ApiBadRequestResponse({ description: 'Validation failed or the goal cannot be completed yet.' }) update(@CurrentUser() user: { sub: string }, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateSavingsGoalDto): Promise<SavingsGoalResponse> { return this.savingsGoalService.update(user.sub, id, dto); }
  @Patch(':id/current-amount') @ApiParam({ name: 'id', format: 'uuid' }) @ApiBody({ type: UpdateCurrentAmountDto }) @ApiOkResponse({ description: 'Current amount updated; completion is calculated automatically.' }) updateCurrentAmount(@CurrentUser() user: { sub: string }, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateCurrentAmountDto): Promise<SavingsGoalResponse> { return this.savingsGoalService.updateCurrentAmount(user.sub, id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @ApiParam({ name: 'id', format: 'uuid' }) @ApiNoContentResponse({ description: 'Savings goal deleted.' }) async remove(@CurrentUser() user: { sub: string }, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> { await this.savingsGoalService.remove(user.sub, id); }
}
