import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type RecurrenceFrequency,
  type RecurringTransaction,
  type TransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import type { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
import {
  addDays,
  firstIndexOnOrAfter,
  istanbulToday,
  occurredAtFor,
  occurrenceDate,
} from './recurrence';

export const MAX_RECURRING_TRANSACTIONS_PER_USER = 50;
const MAX_BACKFILL_DAYS = 366;
const MAX_FUTURE_START_DAYS = 5 * 366;
// A one-year weekly backfill is 53 occurrences; the cap only guards against unexpected data.
const MAX_OCCURRENCES_PER_RUN = 400;
const GENERATION_BATCH_SIZE = 100;

const recurringInclude = {
  category: { select: { id: true, name: true, type: true, color: true, icon: true } },
} satisfies Prisma.RecurringTransactionInclude;

type RecurringWithCategory = Prisma.RecurringTransactionGetPayload<{
  include: typeof recurringInclude;
}>;

export interface RecurringTransactionResponse {
  id: string;
  categoryId: string;
  category: RecurringWithCategory['category'];
  type: TransactionType;
  amount: string;
  currency: RecurringTransaction['currency'];
  paymentMethod: RecurringTransaction['paymentMethod'];
  note: string | null;
  frequency: RecurrenceFrequency;
  startDate: string;
  endDate: string | null;
  nextRunOn: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RecurringTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<RecurringTransactionResponse[]> {
    const rules = await this.prisma.recurringTransaction.findMany({
      where: { userId },
      include: recurringInclude,
      orderBy: [{ isActive: 'desc' }, { nextRunOn: { sort: 'asc', nulls: 'last' } }],
    });
    return rules.map((rule) => this.toResponse(rule));
  }

  async create(
    userId: string,
    dto: CreateRecurringTransactionDto,
    now = new Date(),
  ): Promise<RecurringTransactionResponse> {
    const today = istanbulToday(now);
    const startDate = this.parseDate(dto.startDate);
    const endDate = dto.endDate ? this.parseDate(dto.endDate) : null;

    if (startDate < addDays(today, -MAX_BACKFILL_DAYS)) {
      throw new BadRequestException('startDate can be at most one year in the past.');
    }
    if (startDate > addDays(today, MAX_FUTURE_START_DAYS)) {
      throw new BadRequestException('startDate can be at most five years in the future.');
    }
    this.assertEndDate(startDate, endDate);

    const rule = await this.prisma.$transaction(async (prisma) => {
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('recurring-transaction'), hashtext(${userId}))`;
      const count = await prisma.recurringTransaction.count({ where: { userId } });
      if (count >= MAX_RECURRING_TRANSACTIONS_PER_USER) {
        throw new BadRequestException(
          `You can create at most ${MAX_RECURRING_TRANSACTIONS_PER_USER} recurring transactions.`,
        );
      }
      await this.assertCategoryAccess(prisma, userId, dto.categoryId, dto.type);

      return prisma.recurringTransaction.create({
        data: {
          userId,
          categoryId: dto.categoryId,
          type: dto.type,
          amount: dto.amount,
          currency: dto.currency,
          paymentMethod: dto.paymentMethod,
          note: dto.note,
          frequency: dto.frequency,
          startDate,
          endDate,
          nextRunOn: startDate,
        },
        select: { id: true },
      });
    });

    await this.generateForRule(rule.id, today);
    return this.findOne(userId, rule.id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateRecurringTransactionDto,
    now = new Date(),
  ): Promise<RecurringTransactionResponse> {
    const today = istanbulToday(now);

    await this.prisma.$transaction(async (prisma) => {
      const rule = await this.lockOwnedRule(prisma, userId, id);
      const startDate = dto.startDate ? this.parseDate(dto.startDate) : rule.startDate;
      const frequency = dto.frequency ?? rule.frequency;
      const endDate =
        dto.endDate === undefined
          ? rule.endDate
          : dto.endDate === null
            ? null
            : this.parseDate(dto.endDate);
      const isActive = dto.isActive ?? rule.isActive;
      const scheduleChanged =
        startDate.getTime() !== rule.startDate.getTime() || frequency !== rule.frequency;

      if (dto.categoryId && dto.categoryId !== rule.categoryId) {
        await this.assertCategoryAccess(prisma, userId, dto.categoryId, rule.type);
      }

      let occurrenceIndex = rule.occurrenceIndex;
      if (scheduleChanged) {
        // Rescheduling never backfills: occurrences before today were already handled or skipped.
        if (startDate < today) {
          throw new BadRequestException(
            'A new schedule must start today or later. Existing transactions are kept.',
          );
        }
        if (startDate > addDays(today, MAX_FUTURE_START_DAYS)) {
          throw new BadRequestException('startDate can be at most five years in the future.');
        }
        occurrenceIndex = 0;
      } else if ((isActive && !rule.isActive) || rule.nextRunOn === null) {
        // Resuming a paused or finished schedule skips occurrences that are already in the past.
        occurrenceIndex = Math.max(
          occurrenceIndex,
          firstIndexOnOrAfter(startDate, frequency, today),
        );
      }
      this.assertEndDate(startDate, endDate);

      await prisma.recurringTransaction.update({
        where: { id },
        data: {
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
          frequency,
          startDate,
          endDate,
          isActive,
          occurrenceIndex,
          nextRunOn: this.nextRunOn(startDate, frequency, occurrenceIndex, endDate),
        },
      });
    });

    await this.generateForRule(id, today);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    // Generated transactions are kept; their link is cleared by the foreign key (SET NULL).
    const result = await this.prisma.recurringTransaction.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Recurring transaction not found.');
  }

  /** Creates every due occurrence of active schedules. Safe to run concurrently. */
  async generateDue(now = new Date()): Promise<number> {
    const today = istanbulToday(now);
    const attempted = new Set<string>();
    let created = 0;

    for (;;) {
      const rules = await this.prisma.recurringTransaction.findMany({
        where: { isActive: true, nextRunOn: { lte: today }, id: { notIn: [...attempted] } },
        select: { id: true },
        orderBy: { nextRunOn: 'asc' },
        take: GENERATION_BATCH_SIZE,
      });
      if (rules.length === 0) return created;

      for (const { id } of rules) {
        attempted.add(id);
        created += await this.generateForRule(id, today);
      }
    }
  }

  private async generateForRule(id: string, today: Date): Promise<number> {
    return this.prisma.$transaction(async (prisma) => {
      // Serializes generators (scheduler, API requests, other instances) for this schedule.
      await prisma.$queryRaw`SELECT id FROM "RecurringTransaction" WHERE id = ${id}::uuid FOR UPDATE`;
      const rule = await prisma.recurringTransaction.findUnique({ where: { id } });
      if (!rule || !rule.isActive || !rule.nextRunOn || rule.nextRunOn > today) return 0;

      const rows: Prisma.TransactionCreateManyInput[] = [];
      let index = rule.occurrenceIndex;
      let date = occurrenceDate(rule.startDate, rule.frequency, index);
      while (
        date <= today &&
        (!rule.endDate || date <= rule.endDate) &&
        rows.length < MAX_OCCURRENCES_PER_RUN
      ) {
        rows.push({
          userId: rule.userId,
          categoryId: rule.categoryId,
          type: rule.type,
          amount: rule.amount,
          currency: rule.currency,
          paymentMethod: rule.paymentMethod,
          note: rule.note,
          occurredAt: occurredAtFor(date),
          recurringTransactionId: rule.id,
          recurrenceIndex: index,
        });
        index += 1;
        date = occurrenceDate(rule.startDate, rule.frequency, index);
      }

      const result = await prisma.transaction.createMany({ data: rows, skipDuplicates: true });
      await prisma.recurringTransaction.update({
        where: { id },
        data: {
          occurrenceIndex: index,
          nextRunOn: this.nextRunOn(rule.startDate, rule.frequency, index, rule.endDate),
        },
      });
      return result.count;
    });
  }

  private async findOne(userId: string, id: string): Promise<RecurringTransactionResponse> {
    const rule = await this.prisma.recurringTransaction.findFirst({
      where: { id, userId },
      include: recurringInclude,
    });
    if (!rule) throw new NotFoundException('Recurring transaction not found.');
    return this.toResponse(rule);
  }

  private async lockOwnedRule(
    prisma: Prisma.TransactionClient,
    userId: string,
    id: string,
  ): Promise<RecurringTransaction> {
    await prisma.$queryRaw`SELECT id FROM "RecurringTransaction" WHERE id = ${id}::uuid FOR UPDATE`;
    const rule = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
    if (!rule) throw new NotFoundException('Recurring transaction not found.');
    return rule;
  }

  private nextRunOn(
    startDate: Date,
    frequency: RecurrenceFrequency,
    index: number,
    endDate: Date | null,
  ): Date | null {
    const next = occurrenceDate(startDate, frequency, index);
    return endDate && next > endDate ? null : next;
  }

  private assertEndDate(startDate: Date, endDate: Date | null): void {
    if (endDate && endDate < startDate) {
      throw new BadRequestException('endDate cannot be before startDate.');
    }
  }

  private parseDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private async assertCategoryAccess(
    prisma: Prisma.TransactionClient,
    userId: string,
    categoryId: string,
    type: TransactionType,
  ): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { userId: true, isSystem: true, type: true },
    });

    if (!category) throw new NotFoundException('Category not found.');
    if (!category.isSystem && category.userId !== userId) {
      throw new ForbiddenException('You do not have access to this category.');
    }
    if (category.type !== type) {
      throw new BadRequestException('Recurring transaction type must match the category type.');
    }
  }

  private toResponse(rule: RecurringWithCategory): RecurringTransactionResponse {
    const formatDate = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;
    return {
      id: rule.id,
      categoryId: rule.categoryId,
      category: rule.category,
      type: rule.type,
      amount: rule.amount.toString(),
      currency: rule.currency,
      paymentMethod: rule.paymentMethod,
      note: rule.note,
      frequency: rule.frequency,
      startDate: rule.startDate.toISOString().slice(0, 10),
      endDate: formatDate(rule.endDate),
      nextRunOn: formatDate(rule.nextRunOn),
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
