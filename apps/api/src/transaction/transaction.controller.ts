import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionService, type TransactionListResponse, type TransactionResponse } from './transaction.service';

const transactionExample = {
  id: '7c83b7b1-977d-4c35-a0d4-0be4ab8f5299',
  categoryId: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1',
  category: {
    id: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1',
    name: 'Market',
    type: 'EXPENSE',
    color: '#F97316',
    icon: 'shopping-cart',
  },
  type: 'EXPENSE',
  amount: '125.5',
  currency: 'TRY',
  paymentMethod: 'CARD',
  note: 'Weekly grocery shopping',
  occurredAt: '2026-07-28T10:30:00.000Z',
  createdAt: '2026-07-28T10:35:00.000Z',
  updatedAt: '2026-07-28T10:35:00.000Z',
};

const listTransactionExample = {
  items: [transactionExample],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const validationErrorExample = {
  statusCode: 400,
  message: ['amount must match /^(?=.*[1-9])(?:0|[1-9]\\d{0,14})(?:\\.\\d{1,4})?$/ regular expression'],
  error: 'Bad Request',
};

const unauthorizedErrorExample = {
  statusCode: 401,
  message: 'Unauthorized',
};

const forbiddenErrorExample = {
  statusCode: 403,
  message: 'You do not have access to this category.',
  error: 'Forbidden',
};

const notFoundErrorExample = {
  statusCode: 404,
  message: 'Transaction not found.',
  error: 'Not Found',
};

const conflictErrorExample = {
  statusCode: 409,
  message: 'The category is no longer available.',
  error: 'Conflict',
};

@Controller('transactions')
@UseGuards(JwtAccessGuard)
@ApiTags('Transactions')
@ApiBearerAuth('access-token')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a transaction',
    description: 'Creates an income or expense transaction for the authenticated user.',
  })
  @ApiBody({
    type: CreateTransactionDto,
    examples: {
      expense: {
        summary: 'Expense transaction',
        value: {
          categoryId: transactionExample.categoryId,
          type: 'EXPENSE',
          amount: '125.50',
          currency: 'TRY',
          paymentMethod: 'CARD',
          note: 'Weekly grocery shopping',
          occurredAt: '2026-07-28T10:30:00.000Z',
        },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Transaction created.', schema: { example: transactionExample } })
  @ApiBadRequestResponse({ description: 'Validation failed or category type does not match.', schema: { example: validationErrorExample } })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.', schema: { example: unauthorizedErrorExample } })
  @ApiForbiddenResponse({ description: 'The category belongs to another user.', schema: { example: forbiddenErrorExample } })
  @ApiNotFoundResponse({ description: 'Category does not exist.', schema: { example: { ...notFoundErrorExample, message: 'Category not found.' } } })
  @ApiConflictResponse({ description: 'Category was deleted during the request.', schema: { example: conflictErrorExample } })
  create(@CurrentUser() user: { sub: string }, @Body() createDto: CreateTransactionDto): Promise<TransactionResponse> {
    return this.transactionService.create(user.sub, createDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List transactions',
    description: 'Returns only the authenticated user’s transactions with filters, sorting, and pagination.',
  })
  @ApiOkResponse({ description: 'Paginated transaction list.', schema: { example: listTransactionExample } })
  @ApiBadRequestResponse({ description: 'Invalid pagination, sort, or date range.', schema: { example: validationErrorExample } })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.', schema: { example: unauthorizedErrorExample } })
  @ApiForbiddenResponse({ description: 'The category filter belongs to another user.', schema: { example: forbiddenErrorExample } })
  @ApiNotFoundResponse({ description: 'Category filter does not exist.', schema: { example: { ...notFoundErrorExample, message: 'Category not found.' } } })
  findAll(@CurrentUser() user: { sub: string }, @Query() query: ListTransactionsDto): Promise<TransactionListResponse> {
    return this.transactionService.findAll(user.sub, query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid', example: transactionExample.id })
  @ApiOperation({
    summary: 'Get a transaction',
    description: 'Returns one transaction owned by the authenticated user.',
  })
  @ApiOkResponse({ description: 'Transaction found.', schema: { example: transactionExample } })
  @ApiBadRequestResponse({ description: 'Transaction id is not a UUID.', schema: { example: validationErrorExample } })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.', schema: { example: unauthorizedErrorExample } })
  @ApiNotFoundResponse({ description: 'Transaction does not exist or is not owned by the caller.', schema: { example: notFoundErrorExample } })
  findOne(@CurrentUser() user: { sub: string }, @Param('id', new ParseUUIDPipe()) id: string): Promise<TransactionResponse> {
    return this.transactionService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', format: 'uuid', example: transactionExample.id })
  @ApiOperation({
    summary: 'Update a transaction',
    description: 'Updates supplied fields of a transaction owned by the authenticated user.',
  })
  @ApiBody({
    type: UpdateTransactionDto,
    examples: {
      updateAmountAndNote: {
        summary: 'Update amount and note',
        value: { amount: '150.75', note: 'Updated grocery shopping note' },
      },
    },
  })
  @ApiOkResponse({ description: 'Transaction updated.', schema: { example: { ...transactionExample, amount: '150.75', note: 'Updated grocery shopping note' } } })
  @ApiBadRequestResponse({ description: 'Validation failed or category type does not match.', schema: { example: validationErrorExample } })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.', schema: { example: unauthorizedErrorExample } })
  @ApiForbiddenResponse({ description: 'The category belongs to another user.', schema: { example: forbiddenErrorExample } })
  @ApiNotFoundResponse({ description: 'Transaction or category does not exist.', schema: { example: notFoundErrorExample } })
  @ApiConflictResponse({ description: 'Category was deleted during the request.', schema: { example: conflictErrorExample } })
  update(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateDto: UpdateTransactionDto,
  ): Promise<TransactionResponse> {
    return this.transactionService.update(user.sub, id, updateDto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', format: 'uuid', example: transactionExample.id })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a transaction',
    description: 'Deletes a transaction owned by the authenticated user.',
  })
  @ApiNoContentResponse({ description: 'Transaction deleted.' })
  @ApiBadRequestResponse({ description: 'Transaction id is not a UUID.', schema: { example: validationErrorExample } })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.', schema: { example: unauthorizedErrorExample } })
  @ApiNotFoundResponse({ description: 'Transaction does not exist or is not owned by the caller.', schema: { example: notFoundErrorExample } })
  async remove(@CurrentUser() user: { sub: string }, @Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.transactionService.remove(user.sub, id);
  }
}
