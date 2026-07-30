import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Currency, Prisma, TransactionType } from '@prisma/client';
import { ExchangeRateService } from '../dashboard/exchange-rate.service';
import { PrismaService } from '../prisma/prisma.service';
import type { MonthlyReportDto } from './dto/monthly-report.dto';

interface IstanbulDateParts { month: number; year: number }
export interface MonthlyReportCategory { categoryId: string; color: string | null; name: string; percentage: string; totalExpense: string; transactionCount: number }
export interface MonthlyReportResponse { categories: MonthlyReportCategory[]; currency: Currency; month: string; net: string; previousMonth: { expenseDifference: string; incomeDifference: string; netDifference: string }; savingsRate: string | null; totalExpense: string; totalIncome: string }

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService, private readonly exchangeRates: ExchangeRateService) {}

  async getMonthlyReport(userId: string, query: MonthlyReportDto): Promise<MonthlyReportResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { defaultCurrency: true } });
    if (!user) throw new UnauthorizedException();
    const month = query.month ?? this.monthKey(new Date());
    const currency = query.currency ?? user.defaultCurrency;
    const range = this.createMonthRange(month);
    const previousRange = this.createMonthRange(this.previousMonth(month));
    const [current, previous] = await Promise.all([
      this.prisma.transaction.findMany({ where: { userId, occurredAt: { gte: range.start, lt: range.end } }, select: { amount: true, currency: true, type: true, categoryId: true } }),
      this.prisma.transaction.findMany({ where: { userId, occurredAt: { gte: previousRange.start, lt: previousRange.end } }, select: { amount: true, currency: true, type: true } }),
    ]);
    const [convertedCurrent, convertedPrevious] = await Promise.all([this.convertRows(current, currency), this.convertRows(previous, currency)]);
    const totals = this.totals(convertedCurrent);
    const prior = this.totals(convertedPrevious);
    const byCategory = new Map<string, { count: number; total: Prisma.Decimal }>();
    for (const row of convertedCurrent.filter((item) => item.type === TransactionType.EXPENSE)) {
      const value = byCategory.get(row.categoryId! ) ?? { count: 0, total: new Prisma.Decimal(0) };
      value.count += 1; value.total = value.total.add(row.amount); byCategory.set(row.categoryId!, value);
    }
    const categories = byCategory.size ? await this.prisma.category.findMany({ where: { id: { in: [...byCategory.keys()] } }, select: { id: true, name: true, color: true } }) : [];
    const categoryById = new Map(categories.map((item) => [item.id, item]));
    const net = totals.income.sub(totals.expense); const previousNet = prior.income.sub(prior.expense);
    return {
      month, currency, totalIncome: totals.income.toString(), totalExpense: totals.expense.toString(), net: net.toString(),
      savingsRate: totals.income.isZero() ? null : net.div(totals.income).mul(100).toDecimalPlaces(2).toString(),
      previousMonth: { incomeDifference: totals.income.sub(prior.income).toString(), expenseDifference: totals.expense.sub(prior.expense).toString(), netDifference: net.sub(previousNet).toString() },
      categories: [...byCategory.entries()].map(([categoryId, value]) => ({ categoryId, name: categoryById.get(categoryId)?.name ?? 'Bilinmeyen kategori', color: categoryById.get(categoryId)?.color ?? null, totalExpense: value.total.toString(), transactionCount: value.count, percentage: totals.expense.isZero() ? '0' : value.total.div(totals.expense).mul(100).toDecimalPlaces(2).toString() })).sort((a, b) => new Prisma.Decimal(b.totalExpense).comparedTo(a.totalExpense)),
    };
  }

  private async convertRows<T extends { amount: Prisma.Decimal; currency: Currency }>(rows: T[], target: Currency): Promise<(T & { amount: Prisma.Decimal })[]> { return Promise.all(rows.map(async (row) => ({ ...row, amount: await this.exchangeRates.convert(row.amount, row.currency, target) }))); }
  private totals(rows: { amount: Prisma.Decimal; type: TransactionType }[]) { return rows.reduce((total, row) => ({ income: row.type === TransactionType.INCOME ? total.income.add(row.amount) : total.income, expense: row.type === TransactionType.EXPENSE ? total.expense.add(row.amount) : total.expense }), { income: new Prisma.Decimal(0), expense: new Prisma.Decimal(0) }); }
  private createMonthRange(month: string) { const [year, number] = this.parseMonth(month); const next = new Date(Date.UTC(year, number, 1)); return { start: this.createIstanbulDate(year, number), end: this.createIstanbulDate(next.getUTCFullYear(), next.getUTCMonth() + 1) }; }
  private previousMonth(month: string) { const [year, number] = this.parseMonth(month); const previous = new Date(Date.UTC(year, number - 2, 1)); return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`; }
  private monthKey(date: Date) { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit' }).formatToParts(date); const value: IstanbulDateParts = { year: Number(parts.find((part) => part.type === 'year')?.value), month: Number(parts.find((part) => part.type === 'month')?.value) }; return `${value.year}-${String(value.month).padStart(2, '0')}`; }
  private parseMonth(month: string): [number, number] { const values = month.split('-').map(Number); return [values[0]!, values[1]!]; }
  private createIstanbulDate(year: number, month: number) { return new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+03:00`); }
}
