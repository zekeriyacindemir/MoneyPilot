import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
import {
  MAX_RECURRING_TRANSACTIONS_PER_USER,
  RecurringTransactionService,
  type RecurringTransactionResponse,
} from './recurring-transaction.service';

const recurringExample = {
  id: '5c1d7a43-2f7e-4b8e-9a61-0c2d5b9e7f10',
  categoryId: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1',
  category: {
    id: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1',
    name: 'Kira',
    type: 'EXPENSE',
    color: '#8B5CF6',
    icon: 'house',
  },
  type: 'EXPENSE',
  amount: '15000',
  currency: 'TRY',
  paymentMethod: 'BANK_TRANSFER',
  note: 'Ev kirası',
  frequency: 'MONTHLY',
  startDate: '2026-11-01',
  endDate: null,
  nextRunOn: '2026-11-01',
  isActive: true,
};
const unauthorized = { description: 'Access token is missing or invalid.' };
const notFound = { description: 'Recurring transaction not found.' };

@Controller('recurring-transactions')
@UseGuards(JwtAccessGuard)
@ApiTags('Recurring transactions')
@ApiBearerAuth('access-token')
export class RecurringTransactionController {
  constructor(private readonly recurringTransactions: RecurringTransactionService) {}

  @Get()
  @ApiOperation({
    summary: 'List recurring transactions',
    description: 'Active schedules first, ordered by next run date.',
  })
  @ApiOkResponse({ schema: { example: [recurringExample] } })
  @ApiUnauthorizedResponse(unauthorized)
  findAll(@CurrentUser() user: { sub: string }): Promise<RecurringTransactionResponse[]> {
    return this.recurringTransactions.findAll(user.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a recurring transaction',
    description: `Occurrences due up to today (Istanbul) are created immediately and later ones automatically. Each user can have up to ${MAX_RECURRING_TRANSACTIONS_PER_USER} schedules.`,
  })
  @ApiBody({ type: CreateRecurringTransactionDto })
  @ApiCreatedResponse({ schema: { example: recurringExample } })
  @ApiBadRequestResponse({
    description: 'Validation failed, dates are out of range or the limit is reached.',
  })
  @ApiUnauthorizedResponse(unauthorized)
  @ApiForbiddenResponse({ description: 'The category belongs to another user.' })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponse> {
    return this.recurringTransactions.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Update, pause or resume a recurring transaction',
    description:
      'Changes apply to future occurrences only. A new schedule (startDate or frequency) must start today or later.',
  })
  @ApiBody({ type: UpdateRecurringTransactionDto })
  @ApiOkResponse({ schema: { example: recurringExample } })
  @ApiBadRequestResponse({
    description: 'Validation failed or the new schedule starts in the past.',
  })
  @ApiUnauthorizedResponse(unauthorized)
  @ApiNotFoundResponse(notFound)
  update(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponse> {
    return this.recurringTransactions.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Delete a recurring transaction',
    description: 'Transactions it already created are kept.',
  })
  @ApiNoContentResponse({ description: 'Recurring transaction deleted.' })
  @ApiUnauthorizedResponse(unauthorized)
  @ApiNotFoundResponse(notFound)
  async remove(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.recurringTransactions.remove(user.sub, id);
  }
}
