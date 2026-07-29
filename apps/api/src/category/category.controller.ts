import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CategoryService, type CategoryResponse } from './category.service';
import { ListCategoriesDto } from './dto/list-categories.dto';

const categoryExample = {
  id: '8fe5aa0d-4b3d-4a0a-a2e0-1bb6933693d1',
  name: 'Market',
  type: 'EXPENSE',
  color: '#F97316',
  icon: 'shopping-cart',
  isSystem: true,
};

@Controller('categories')
@UseGuards(JwtAccessGuard)
@ApiTags('Categories')
@ApiBearerAuth('access-token')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({
    summary: 'List available categories',
    description: 'Returns system categories and private categories owned by the authenticated user.',
  })
  @ApiOkResponse({ description: 'Available categories ordered by type and name.', schema: { example: [categoryExample] } })
  @ApiBadRequestResponse({
    description: 'The type filter is not a valid category type.',
    schema: { example: { statusCode: 400, message: ['type must be one of the following values: INCOME, EXPENSE'], error: 'Bad Request' } },
  })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.', schema: { example: { statusCode: 401, message: 'Unauthorized' } } })
  findAll(
    @CurrentUser() user: { sub: string },
    @Query() query: ListCategoriesDto,
  ): Promise<CategoryResponse[]> {
    return this.categoryService.findAll(user.sub, query);
  }
}
