import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type CategoryType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { ListCategoriesDto } from './dto/list-categories.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

export const MAX_CUSTOM_CATEGORIES_PER_USER = 100;

export interface CategoryResponse {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string | null;
  icon: string | null;
  isSystem: boolean;
}

const categorySelect = {
  id: true,
  name: true,
  type: true,
  color: true,
  icon: true,
  isSystem: true,
} satisfies Prisma.CategorySelect;

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: ListCategoriesDto): Promise<CategoryResponse[]> {
    const where: Prisma.CategoryWhereInput = {
      OR: [{ isSystem: true }, { userId }],
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } }
        : {}),
    };

    return this.prisma.category.findMany({
      where,
      select: categorySelect,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryResponse> {
    return this.prisma.$transaction(async (prisma) => {
      await this.lockUserCategories(prisma, userId);

      const customCategoryCount = await prisma.category.count({
        where: { userId, isSystem: false },
      });
      if (customCategoryCount >= MAX_CUSTOM_CATEGORIES_PER_USER) {
        throw new BadRequestException(
          `You can create at most ${MAX_CUSTOM_CATEGORIES_PER_USER} categories.`,
        );
      }
      await this.assertNameAvailable(prisma, userId, dto.type, dto.name);

      return prisma.category.create({
        data: {
          userId,
          name: dto.name,
          type: dto.type,
          isSystem: false,
          color: dto.color ?? null,
          icon: dto.icon ?? null,
        },
        select: categorySelect,
      });
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    return this.prisma.$transaction(async (prisma) => {
      await this.lockUserCategories(prisma, userId);
      const category = await this.findOwnedCategory(prisma, userId, id);

      if (dto.name !== undefined && dto.name.toLowerCase() !== category.name.toLowerCase()) {
        await this.assertNameAvailable(prisma, userId, category.type, dto.name, id);
      }

      return prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.color !== undefined ? { color: dto.color } : {}),
          ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        },
        select: categorySelect,
      });
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (prisma) => {
        await this.findOwnedCategory(prisma, userId, id);

        const [transactionCount, budgetCount] = await Promise.all([
          prisma.transaction.count({ where: { categoryId: id } }),
          prisma.budget.count({ where: { categoryId: id } }),
        ]);
        if (transactionCount > 0 || budgetCount > 0) {
          throw new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            message: 'The category is used by transactions or budgets and cannot be deleted.',
            transactionCount,
            budgetCount,
          });
        }

        await prisma.category.delete({ where: { id } });
      });
    } catch (error) {
      // A transaction or budget may reference the category after the usage check.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'The category is used by transactions or budgets and cannot be deleted.',
        );
      }
      throw error;
    }
  }

  private async findOwnedCategory(
    prisma: Prisma.TransactionClient,
    userId: string,
    id: string,
  ): Promise<{ name: string; type: CategoryType }> {
    const category = await prisma.category.findUnique({
      where: { id },
      select: { userId: true, isSystem: true, name: true, type: true },
    });

    if (!category || (!category.isSystem && category.userId !== userId)) {
      throw new NotFoundException('Category not found.');
    }
    if (category.isSystem) {
      throw new ForbiddenException('System categories cannot be changed.');
    }

    return category;
  }

  private async assertNameAvailable(
    prisma: Prisma.TransactionClient,
    userId: string,
    type: CategoryType,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate = await prisma.category.findFirst({
      where: {
        type,
        name: { equals: name, mode: Prisma.QueryMode.insensitive },
        OR: [{ isSystem: true }, { userId }],
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('A category with this name already exists.');
    }
  }

  /** Serializes category writes per user so count and name checks cannot race. */
  private async lockUserCategories(prisma: Prisma.TransactionClient, userId: string) {
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('category'), hashtext(${userId}))`;
  }
}
