import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { ListTransactionsDto } from './dto/list-transactions.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';

const transactionInclude = {
  category: {
    select: {
      id: true,
      name: true,
      type: true,
      color: true,
      icon: true,
    },
  },
} satisfies Prisma.TransactionInclude;

type TransactionWithCategory = Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>;

export interface TransactionResponse {
  id: string;
  categoryId: string;
  category: TransactionWithCategory['category'];
  type: TransactionType;
  amount: string;
  currency: TransactionWithCategory['currency'];
  paymentMethod: TransactionWithCategory['paymentMethod'];
  note: string | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionListResponse {
  items: TransactionResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createDto: CreateTransactionDto): Promise<TransactionResponse> {
    try {
      const transaction = await this.prisma.$transaction(async (prisma) => {
        await this.assertCategoryAccess(prisma, userId, createDto.categoryId, createDto.type);

        return prisma.transaction.create({
          data: {
            userId,
            categoryId: createDto.categoryId,
            type: createDto.type,
            amount: createDto.amount,
            currency: createDto.currency,
            paymentMethod: createDto.paymentMethod,
            note: createDto.note,
            occurredAt: createDto.occurredAt,
          },
          include: transactionInclude,
        });
      });

      return this.toResponse(transaction);
    } catch (error: unknown) {
      this.rethrowCategoryConflict(error);
    }
  }

  async findAll(userId: string, query: ListTransactionsDto): Promise<TransactionListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom must be before or equal to dateTo.');
    }

    if (query.category) {
      await this.assertCategoryAccess(this.prisma, userId, query.category);
    }

    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(query.category ? { categoryId: query.category } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? { note: { contains: query.search.trim(), mode: Prisma.QueryMode.insensitive } }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            occurredAt: {
              ...(query.dateFrom ? { gte: query.dateFrom } : {}),
              ...(query.dateTo ? { lte: query.dateTo } : {}),
            },
          }
        : {}),
    };
    const orderBy = this.createOrderBy(query.sortBy ?? 'occurredAt', query.sortOrder ?? 'desc');
    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: transactionInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items: transactions.map((transaction) => this.toResponse(transaction)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(userId: string, id: string): Promise<TransactionResponse> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: transactionInclude,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }

    return this.toResponse(transaction);
  }

  async update(userId: string, id: string, updateDto: UpdateTransactionDto): Promise<TransactionResponse> {
    try {
      const transaction = await this.prisma.$transaction(async (prisma) => {
        const existing = await prisma.transaction.findFirst({
          where: { id, userId },
          select: { categoryId: true, type: true },
        });

        if (!existing) {
          throw new NotFoundException('Transaction not found.');
        }

        const categoryId = updateDto.categoryId ?? existing.categoryId;
        const type = updateDto.type ?? existing.type;

        if (updateDto.categoryId || updateDto.type) {
          await this.assertCategoryAccess(prisma, userId, categoryId, type);
        }

        return prisma.transaction.update({
          where: { id },
          data: updateDto,
          include: transactionInclude,
        });
      });

      return this.toResponse(transaction);
    } catch (error: unknown) {
      this.rethrowCategoryConflict(error);
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.prisma.transaction.deleteMany({
      where: { id, userId },
    });

    if (result.count !== 1) {
      throw new NotFoundException('Transaction not found.');
    }
  }

  private async assertCategoryAccess(
    prisma: Pick<PrismaService, 'category'> | Prisma.TransactionClient,
    userId: string,
    categoryId: string,
    transactionType?: TransactionType,
  ): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { userId: true, isSystem: true, type: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    if (!category.isSystem && category.userId !== userId) {
      throw new ForbiddenException('You do not have access to this category.');
    }

    if (transactionType && category.type !== transactionType) {
      throw new BadRequestException('Transaction type must match the category type.');
    }
  }

  private createOrderBy(
    sortBy: NonNullable<ListTransactionsDto['sortBy']>,
    sortOrder: 'asc' | 'desc',
  ): Prisma.TransactionOrderByWithRelationInput {
    return { [sortBy]: sortOrder };
  }

  private toResponse(transaction: TransactionWithCategory): TransactionResponse {
    return {
      id: transaction.id,
      categoryId: transaction.categoryId,
      category: transaction.category,
      type: transaction.type,
      amount: transaction.amount.toString(),
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      note: transaction.note,
      occurredAt: transaction.occurredAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  private rethrowCategoryConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new ConflictException('The category is no longer available.');
    }

    throw error;
  }
}
