import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { BudgetService, type BudgetResponse } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { ListBudgetsDto } from './dto/list-budgets.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

const budgetExample = { id: '7c83b7b1-977d-4c35-a0d4-0be4ab8f5299', categoryId: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1', category: { id: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1', name: 'Market', type: 'EXPENSE', color: '#F97316', icon: 'shopping-cart' }, type: 'EXPENSE', amount: '5000', currency: 'TRY', period: 'MONTHLY', periodStart: '2026-07-01T00:00:00.000Z', periodEnd: '2026-07-31T00:00:00.000Z', actualAmount: '1250.5', remainingAmount: '3749.5', progressPercent: '25.01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' };
const validation = { statusCode: 400, message: ['amount must be a positive decimal with at most four fractional digits'], error: 'Bad Request' };

@Controller('budgets') @UseGuards(JwtAccessGuard) @ApiTags('Budgets') @ApiBearerAuth('access-token')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}
  @Post() @ApiOperation({ summary: 'Create a budget or income target' }) @ApiBody({ type: CreateBudgetDto, examples: { monthlyExpense: { value: { categoryId: budgetExample.categoryId, type: 'EXPENSE', amount: '5000.00', currency: 'TRY', period: 'MONTHLY', periodStart: '2026-07-28' } } } }) @ApiCreatedResponse({ schema: { example: budgetExample } }) @ApiBadRequestResponse({ schema: { example: validation } }) @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' }) @ApiNotFoundResponse({ description: 'Category does not exist or is unavailable.' }) @ApiConflictResponse({ description: 'A budget exists for this category and period.' })
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateBudgetDto): Promise<BudgetResponse> { return this.budgetService.create(user.sub, dto); }
  @Get() @ApiOperation({ summary: 'List budgets active on a date', description: 'Defaults to today in Europe/Istanbul. Use period and date for past or future periods.' }) @ApiOkResponse({ schema: { example: [budgetExample] } }) @ApiBadRequestResponse({ schema: { example: validation } }) @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' })
  findAll(@CurrentUser() user: { sub: string }, @Query() query: ListBudgetsDto): Promise<BudgetResponse[]> { return this.budgetService.findAll(user.sub, query); }
  @Get(':id') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ summary: 'Get a budget' }) @ApiOkResponse({ schema: { example: budgetExample } }) @ApiBadRequestResponse({ schema: { example: validation } }) @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' }) @ApiNotFoundResponse({ description: 'Budget not found.' })
  findOne(@CurrentUser() user: { sub: string }, @Param('id', new ParseUUIDPipe()) id: string): Promise<BudgetResponse> { return this.budgetService.findOne(user.sub, id); }
  @Patch(':id') @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ summary: 'Update a budget' }) @ApiBody({ type: UpdateBudgetDto }) @ApiOkResponse({ schema: { example: budgetExample } }) @ApiBadRequestResponse({ schema: { example: validation } }) @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' }) @ApiNotFoundResponse({ description: 'Budget or category not found.' }) @ApiConflictResponse({ description: 'A budget exists for this category and period.' })
  update(@CurrentUser() user: { sub: string }, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateBudgetDto): Promise<BudgetResponse> { return this.budgetService.update(user.sub, id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @ApiParam({ name: 'id', format: 'uuid' }) @ApiOperation({ summary: 'Delete a budget' }) @ApiNoContentResponse({ description: 'Budget deleted.' }) @ApiBadRequestResponse({ schema: { example: validation } }) @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' }) @ApiNotFoundResponse({ description: 'Budget not found.' })
  async remove(@CurrentUser() user: { sub: string }, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> { await this.budgetService.remove(user.sub, id); }
}
