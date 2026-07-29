import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BudgetPeriod, CategoryType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { ListBudgetsDto } from './dto/list-budgets.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';

const budgetInclude = { category: { select: { id: true, name: true, type: true, color: true, icon: true } } } satisfies Prisma.BudgetInclude;
type BudgetWithCategory = Prisma.BudgetGetPayload<{ include: typeof budgetInclude }>;
type DateParts = { year: number; month: number; day: number };

export interface BudgetResponse {
  id: string; categoryId: string; category: BudgetWithCategory['category']; type: CategoryType;
  amount: string; currency: BudgetWithCategory['currency']; period: BudgetPeriod; periodStart: Date; periodEnd: Date;
  actualAmount: string; remainingAmount: string; progressPercent: string; createdAt: Date; updatedAt: Date;
}

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBudgetDto): Promise<BudgetResponse> {
    const periodStart = this.normalizePeriodStart(dto.periodStart, dto.period);
    try {
      const budget = await this.prisma.$transaction(async (prisma) => {
        await this.assertCategoryAccess(prisma, userId, dto.categoryId, dto.type);
        return prisma.budget.create({ data: { userId, categoryId: dto.categoryId, amount: dto.amount, currency: dto.currency, period: dto.period, periodStart }, include: budgetInclude });
      });
      return this.toResponse(budget);
    } catch (error: unknown) { this.rethrowConflict(error); }
  }

  async findAll(userId: string, query: ListBudgetsDto): Promise<BudgetResponse[]> {
    const selectedDate = this.calendarDate(query.date ?? new Date());
    const budgets = await this.prisma.budget.findMany({ where: { userId, ...(query.period ? { period: query.period } : {}) }, include: budgetInclude, orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }] });
    const matching = budgets.filter((budget) => {
      const start = this.asUtcDate(budget.periodStart); const end = this.periodEnd(start, budget.period);
      return selectedDate >= start && selectedDate <= end;
    });
    return Promise.all(matching.map((budget) => this.toResponse(budget)));
  }

  async findOne(userId: string, id: string): Promise<BudgetResponse> {
    const budget = await this.prisma.budget.findFirst({ where: { id, userId }, include: budgetInclude });
    if (!budget) throw new NotFoundException('Budget not found.');
    return this.toResponse(budget);
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto): Promise<BudgetResponse> {
    try {
      const budget = await this.prisma.$transaction(async (prisma) => {
        const existing = await prisma.budget.findFirst({ where: { id, userId } });
        if (!existing) throw new NotFoundException('Budget not found.');
        const categoryId = dto.categoryId ?? existing.categoryId;
        if (dto.categoryId || dto.type) await this.assertCategoryAccess(prisma, userId, categoryId, dto.type);
        const period = dto.period ?? existing.period;
        const periodStart = this.normalizePeriodStart(dto.periodStart ?? existing.periodStart, period);
        return prisma.budget.update({ where: { id }, data: { ...(dto.categoryId ? { categoryId: dto.categoryId } : {}), ...(dto.amount ? { amount: dto.amount } : {}), ...(dto.currency ? { currency: dto.currency } : {}), ...(dto.period ? { period: dto.period } : {}), periodStart }, include: budgetInclude });
      });
      return this.toResponse(budget);
    } catch (error: unknown) { this.rethrowConflict(error); }
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.prisma.budget.deleteMany({ where: { id, userId } });
    if (result.count !== 1) throw new NotFoundException('Budget not found.');
  }

  private async toResponse(budget: BudgetWithCategory): Promise<BudgetResponse> {
    const periodStart = this.asUtcDate(budget.periodStart); const periodEnd = this.periodEnd(periodStart, budget.period);
    const aggregate = await this.prisma.transaction.aggregate({ _sum: { amount: true }, where: { userId: budget.userId, categoryId: budget.categoryId, type: budget.category.type, currency: budget.currency, occurredAt: { gte: this.startOfIstanbulDay(periodStart), lte: this.endOfIstanbulDay(periodEnd) } } });
    const actual = aggregate._sum.amount ?? new Prisma.Decimal(0); const amount = new Prisma.Decimal(budget.amount);
    const progress = amount.isZero() ? new Prisma.Decimal(0) : actual.div(amount).mul(100);
    return { id: budget.id, categoryId: budget.categoryId, category: budget.category, type: budget.category.type, amount: amount.toString(), currency: budget.currency, period: budget.period, periodStart, periodEnd, actualAmount: actual.toString(), remainingAmount: amount.sub(actual).toString(), progressPercent: progress.toDecimalPlaces(2).toString(), createdAt: budget.createdAt, updatedAt: budget.updatedAt };
  }

  private async assertCategoryAccess(prisma: Prisma.TransactionClient | Pick<PrismaService, 'category'>, userId: string, categoryId: string, type?: CategoryType): Promise<void> {
    const category = await prisma.category.findUnique({ where: { id: categoryId }, select: { userId: true, isSystem: true, type: true } });
    if (!category) throw new NotFoundException('Category not found.');
    if (!category.isSystem && category.userId !== userId) throw new NotFoundException('Category not found.');
    if (type && category.type !== type) throw new BadRequestException('Budget type must match the category type.');
  }
  private normalizePeriodStart(date: Date, period: BudgetPeriod): Date { const p = this.istanbulParts(date); let result = new Date(Date.UTC(p.year, p.month - 1, p.day)); if (period === BudgetPeriod.WEEKLY) { const day = result.getUTCDay() || 7; result.setUTCDate(result.getUTCDate() - day + 1); } else if (period === BudgetPeriod.MONTHLY) result = new Date(Date.UTC(p.year, p.month - 1, 1)); else if (period === BudgetPeriod.YEARLY) result = new Date(Date.UTC(p.year, 0, 1)); return result; }
  private calendarDate(date: Date): Date { const p = this.istanbulParts(date); return new Date(Date.UTC(p.year, p.month - 1, p.day)); }
  private asUtcDate(date: Date): Date { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
  private periodEnd(start: Date, period: BudgetPeriod): Date { const end = new Date(start); if (period === BudgetPeriod.WEEKLY) end.setUTCDate(end.getUTCDate() + 6); if (period === BudgetPeriod.MONTHLY) end.setUTCMonth(end.getUTCMonth() + 1, 0); if (period === BudgetPeriod.YEARLY) end.setUTCFullYear(end.getUTCFullYear() + 1, 0); return end; }
  private startOfIstanbulDay(date: Date): Date { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - 3 * 60 * 60 * 1000); }
  private endOfIstanbulDay(date: Date): Date { return new Date(this.startOfIstanbulDay(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1))).getTime() - 1); }
  private istanbulParts(date: Date): DateParts { const values = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); const get = (type: string) => Number(values.find((part) => part.type === type)?.value); return { year: get('year'), month: get('month'), day: get('day') }; }
  private rethrowConflict(error: unknown): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('A budget already exists for this category and period.'); throw error; }
}
