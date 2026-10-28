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
  Query,
  UseGuards,
} from '@nestjs/common';
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
import {
  CategoryService,
  MAX_CUSTOM_CATEGORIES_PER_USER,
  type CategoryResponse,
} from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const categoryExample = {
  id: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1',
  name: 'Market',
  type: 'EXPENSE',
  color: '#F97316',
  icon: 'shopping-cart',
  isSystem: true,
};
const customCategoryExample = {
  id: '3b0c0d5e-6f0a-4d47-9f55-2c8f3f1e6a10',
  name: 'Freelance',
  type: 'INCOME',
  color: '#14B8A6',
  icon: 'briefcase',
  isSystem: false,
};
const unauthorized = {
  description: 'Access token is missing or invalid.',
  schema: { example: { statusCode: 401, message: 'Unauthorized' } },
};
const notFound = { description: 'Category does not exist or belongs to another user.' };
const systemCategory = { description: 'System categories cannot be changed.' };

@Controller('categories')
@UseGuards(JwtAccessGuard)
@ApiTags('Categories')
@ApiBearerAuth('access-token')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({
    summary: 'List available categories',
    description:
      'Returns system categories and private categories owned by the authenticated user.',
  })
  @ApiOkResponse({
    description: 'Available categories ordered by type and name.',
    schema: { example: [categoryExample] },
  })
  @ApiBadRequestResponse({
    description: 'The type filter is not a valid category type.',
    schema: {
      example: {
        statusCode: 400,
        message: ['type must be one of the following values: INCOME, EXPENSE'],
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse(unauthorized)
  findAll(
    @CurrentUser() user: { sub: string },
    @Query() query: ListCategoriesDto,
  ): Promise<CategoryResponse[]> {
    return this.categoryService.findAll(user.sub, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a private category',
    description: `Names are unique per type, case-insensitively, including system categories. Each user can own up to ${MAX_CUSTOM_CATEGORIES_PER_USER} categories.`,
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({ schema: { example: customCategoryExample } })
  @ApiBadRequestResponse({ description: 'Validation failed or the category limit is reached.' })
  @ApiUnauthorizedResponse(unauthorized)
  @ApiConflictResponse({ description: 'A category with this name and type already exists.' })
  create(
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryResponse> {
    return this.categoryService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Update a private category',
    description: 'The category type cannot be changed after creation.',
  })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiOkResponse({ schema: { example: customCategoryExample } })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiUnauthorizedResponse(unauthorized)
  @ApiForbiddenResponse(systemCategory)
  @ApiNotFoundResponse(notFound)
  @ApiConflictResponse({ description: 'A category with this name and type already exists.' })
  update(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    return this.categoryService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary: 'Delete an unused private category',
    description: 'Categories referenced by transactions or budgets cannot be deleted.',
  })
  @ApiNoContentResponse({ description: 'Category deleted.' })
  @ApiUnauthorizedResponse(unauthorized)
  @ApiForbiddenResponse(systemCategory)
  @ApiNotFoundResponse(notFound)
  @ApiConflictResponse({
    description: 'The category is used by transactions or budgets.',
    schema: {
      example: {
        statusCode: 409,
        error: 'Conflict',
        message: 'The category is used by transactions or budgets and cannot be deleted.',
        transactionCount: 12,
        budgetCount: 1,
      },
    },
  })
  async remove(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.categoryService.remove(user.sub, id);
  }
}
