import { Injectable } from '@nestjs/common';
import { Currency, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { DashboardPeriod, DashboardSummaryDto } from './dto/dashboard-summary.dto';

interface IstanbulDateParts {
  day: number;
  month: number;
  year: number;
}

interface TrendRow {
  bucket: string;
  expense: string;
  income: string;
}

export interface DashboardTransactionResponse {
  id: string;
  category: {
    id: string;
    name: string;
    type: TransactionType;
    color: string | null;
    icon: string | null;
  };
  type: TransactionType;
  amount: string;
  currency: Currency;
  occurredAt: Date;
}

export interface DashboardTrendPoint {
  expense: string;
  income: string;
  period: string;
}

export interface DashboardSummaryResponse {
  currency: Currency;
  period: DashboardPeriod;
  totalBalance: string;
  periodExpense: string;
  periodIncome: string;
  savingsRate: string | null;
  recentTransactions: DashboardTransactionResponse[];
  trend: DashboardTrendPoint[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, query: DashboardSummaryDto): Promise<DashboardSummaryResponse> {
    const currency = query.currency ?? Currency.TRY;
    const period = query.period ?? 'current_month';
    const range = this.createRange(period, new Date());
    const currencyWhere = { userId, currency };
    const periodWhere = {
      ...currencyWhere,
      occurredAt: { gte: range.start, lt: range.end },
    };
    const [allTimeIncome, allTimeExpense, periodIncome, periodExpense, recentTransactions, trendRows] =
      await Promise.all([
        this.sumAmount({ ...currencyWhere, type: TransactionType.INCOME }),
        this.sumAmount({ ...currencyWhere, type: TransactionType.EXPENSE }),
        this.sumAmount({ ...periodWhere, type: TransactionType.INCOME }),
        this.sumAmount({ ...periodWhere, type: TransactionType.EXPENSE }),
        this.prisma.transaction.findMany({
          where: currencyWhere,
          take: 5,
          orderBy: { occurredAt: 'desc' },
          select: {
            id: true,
            type: true,
            amount: true,
            currency: true,
            occurredAt: true,
            category: {
              select: { id: true, name: true, type: true, color: true, icon: true },
            },
          },
        }),
        this.getTrendRows(userId, currency, range.start, range.end, period === 'current_month'),
      ]);

    return {
      currency,
      period,
      totalBalance: allTimeIncome.minus(allTimeExpense).toString(),
      periodIncome: periodIncome.toString(),
      periodExpense: periodExpense.toString(),
      savingsRate: periodIncome.isZero()
        ? null
        : periodIncome.minus(periodExpense).div(periodIncome).mul(100).toDecimalPlaces(2).toString(),
      recentTransactions: recentTransactions.map((transaction) => ({
        id: transaction.id,
        category: transaction.category,
        type: transaction.type,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        occurredAt: transaction.occurredAt,
      })),
      trend: this.fillTrend(range, trendRows, period === 'current_month'),
    };
  }

  private async sumAmount(where: Prisma.TransactionWhereInput): Promise<Prisma.Decimal> {
    const result = await this.prisma.transaction.aggregate({ where, _sum: { amount: true } });

    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  private async getTrendRows(
    userId: string,
    currency: Currency,
    start: Date,
    end: Date,
    isDaily: boolean,
  ): Promise<TrendRow[]> {
    const format = isDaily ? 'YYYY-MM-DD' : 'YYYY-MM';

    return this.prisma.$queryRaw<TrendRow[]>(Prisma.sql`
      SELECT
        to_char("occurredAt" AT TIME ZONE 'Europe/Istanbul', ${format}) AS bucket,
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0)::text AS income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0)::text AS expense
      FROM "Transaction"
      WHERE "userId" = ${userId}::uuid
        AND currency = ${currency}::"Currency"
        AND "occurredAt" >= ${start}
        AND "occurredAt" < ${end}
      GROUP BY bucket
      ORDER BY bucket
    `);
  }

  private createRange(period: DashboardPeriod, now: Date): { end: Date; start: Date } {
    const currentMonthStart = this.startOfIstanbulMonth(now);
    const months = { current_month: 0, last_3_months: 2, last_6_months: 5, last_12_months: 11 }[period];

    return { start: this.addMonths(currentMonthStart, -months), end: now };
  }

  private fillTrend(
    range: { end: Date; start: Date },
    rows: TrendRow[],
    isDaily: boolean,
  ): DashboardTrendPoint[] {
    const rowByPeriod = new Map(rows.map((row) => [row.bucket, row]));
    const points: DashboardTrendPoint[] = [];
    let cursor = range.start;

    while (cursor < range.end) {
      const period = this.createBucket(cursor, isDaily);
      const row = rowByPeriod.get(period);
      points.push({
        period,
        income: row ? new Prisma.Decimal(row.income).toString() : '0',
        expense: row ? new Prisma.Decimal(row.expense).toString() : '0',
      });
      cursor = isDaily ? this.addIstanbulDays(cursor, 1) : this.addMonths(cursor, 1);
    }

    return points;
  }

  private startOfIstanbulMonth(date: Date): Date {
    const parts = this.getIstanbulDateParts(date);

    return this.createIstanbulDate(parts.year, parts.month, 1);
  }

  private addMonths(date: Date, months: number): Date {
    const parts = this.getIstanbulDateParts(date);
    const value = new Date(Date.UTC(parts.year, parts.month - 1 + months, 1));

    return this.createIstanbulDate(value.getUTCFullYear(), value.getUTCMonth() + 1, 1);
  }

  private addIstanbulDays(date: Date, days: number): Date {
    const parts = this.getIstanbulDateParts(date);
    const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

    return this.createIstanbulDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }

  private createBucket(date: Date, isDaily: boolean): string {
    const parts = this.getIstanbulDateParts(date);
    const month = parts.month.toString().padStart(2, '0');

    return isDaily
      ? `${parts.year}-${month}-${parts.day.toString().padStart(2, '0')}`
      : `${parts.year}-${month}`;
  }

  private getIstanbulDateParts(date: Date): IstanbulDateParts {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date);

    return {
      year: Number(parts.find((part) => part.type === 'year')?.value),
      month: Number(parts.find((part) => part.type === 'month')?.value),
      day: Number(parts.find((part) => part.type === 'day')?.value),
    };
  }

  private createIstanbulDate(year: number, month: number, day: number): Date {
    return new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00+03:00`);
  }
}
