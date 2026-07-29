import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ListCategoriesDto } from './dto/list-categories.dto';

export interface CategoryResponse {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string | null;
  icon: string | null;
  isSystem: boolean;
}

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: ListCategoriesDto): Promise<CategoryResponse[]> {
    const where: Prisma.CategoryWhereInput = {
      OR: [{ isSystem: true }, { userId }],
      ...(query.type ? { type: query.type } : {}),
      ...(query.search ? { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } } : {}),
    };

    return this.prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        type: true,
        color: true,
        icon: true,
        isSystem: true,
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }
}
