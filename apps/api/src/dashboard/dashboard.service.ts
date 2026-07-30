import { Injectable } from '@nestjs/common';
import {
  BudgetPeriod,
  CategoryType,
  Currency,
  GoalStatus,
  Prisma,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DailyGeneralTipService } from './daily-general-tip.service';
import { ExchangeRateService } from './exchange-rate.service';
import type { DailyCoachingDto } from './dto/daily-coaching.dto';
import type { DashboardPeriod, DashboardSummaryDto } from './dto/dashboard-summary.dto';
import type { FinancialHealthDto } from './dto/financial-health.dto';
import {
  RuleBasedPersonalInsightProvider,
  type CoachingItem,
  type PersonalInsightProvider,
} from './personal-insight.provider';

interface IstanbulDateParts {
  day: number;
  month: number;
  year: number;
}

interface TrendRow {
  bucket: string;
  currency: Currency;
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

export type FinancialHealthSignal = 'income' | 'budget' | 'goal';
export type FinancialHealthLevel = 'Kritik' | 'Dikkat' | 'İyi' | 'Çok iyi';

export interface FinancialHealthComponent {
  key: 'savingsRate' | 'budgetAdherence' | 'goalProgress';
  label: string;
  score: number | null;
  description: string;
}

export interface FinancialHealthRecommendation {
  title: string;
  description: string;
  href: '/dashboard/transactions' | '/dashboard/budgets' | '/dashboard/savings';
}

export interface FinancialHealthResponse {
  currency: Currency;
  isReady: boolean;
  missingSignals: FinancialHealthSignal[];
  score: number | null;
  level: FinancialHealthLevel | null;
  components: FinancialHealthComponent[];
  strongestFactor: string | null;
  recommendations: FinancialHealthRecommendation[];
}

export interface DailyCoachingResponse {
  currency: Currency;
  personalInsight: CoachingItem;
  generalTip: CoachingItem;
}

@Injectable()
export class DashboardService {
  private readonly personalInsightProvider: PersonalInsightProvider =
    new RuleBasedPersonalInsightProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly dailyGeneralTipService: DailyGeneralTipService,
    private readonly exchangeRates: ExchangeRateService,
  ) {}

  async getSummary(userId: string, query: DashboardSummaryDto): Promise<DashboardSummaryResponse> {
    const currency = query.currency ?? Currency.TRY;
    const period = query.period ?? 'current_month';
    const range = this.createRange(period, new Date());
    const userWhere = { userId };
    const periodWhere = {
      ...userWhere,
      occurredAt: { gte: range.start, lt: range.end },
    };
    const [
      allTimeTotals,
      periodTotals,
      recentTransactions,
      trendRows,
    ] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['currency', 'type'], where: userWhere, _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['currency', 'type'], where: periodWhere, _sum: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where: userWhere,
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
    const [allTimeIncome, allTimeExpense, periodIncome, periodExpense] = await Promise.all([
      this.sumConverted(allTimeTotals, currency, TransactionType.INCOME),
      this.sumConverted(allTimeTotals, currency, TransactionType.EXPENSE),
      this.sumConverted(periodTotals, currency, TransactionType.INCOME),
      this.sumConverted(periodTotals, currency, TransactionType.EXPENSE),
    ]);
    const convertedTransactions = await Promise.all(
      recentTransactions.map(async (transaction) => ({
        ...transaction,
        amount: await this.exchangeRates.convert(transaction.amount, transaction.currency, currency),
      })),
    );

    return {
      currency,
      period,
      totalBalance: allTimeIncome.minus(allTimeExpense).toString(),
      periodIncome: periodIncome.toString(),
      periodExpense: periodExpense.toString(),
      savingsRate: periodIncome.isZero()
        ? null
        : periodIncome
            .minus(periodExpense)
            .div(periodIncome)
            .mul(100)
            .toDecimalPlaces(2)
            .toString(),
      recentTransactions: convertedTransactions.map((transaction) => ({
        id: transaction.id,
        category: transaction.category,
        type: transaction.type,
        amount: transaction.amount.toString(),
        currency,
        occurredAt: transaction.occurredAt,
      })),
      trend: this.fillTrend(range, trendRows, period === 'current_month'),
    };
  }

  async getFinancialHealth(
    userId: string,
    query: FinancialHealthDto,
  ): Promise<FinancialHealthResponse> {
    const now = new Date();
    const monthStart = this.startOfIstanbulMonth(now);
    const monthEnd = this.addMonths(monthStart, 1);
    const periodStart = this.istanbulCalendarMonthStart(now);
    const user = query.currency
      ? null
      : await this.prisma.user.findUnique({
          where: { id: userId },
          select: { defaultCurrency: true },
        });
    const currency = query.currency ?? user?.defaultCurrency ?? Currency.TRY;
    const transactionWhere = { userId, occurredAt: { gte: monthStart, lt: monthEnd } };

    const [income, expense, budgets, goals] = await Promise.all([
      this.sumConvertedWhere({ ...transactionWhere, type: TransactionType.INCOME }, currency),
      this.sumConvertedWhere({ ...transactionWhere, type: TransactionType.EXPENSE }, currency),
      this.prisma.budget.findMany({
        where: {
          userId,
          period: BudgetPeriod.MONTHLY,
          periodStart,
          category: { type: CategoryType.EXPENSE },
        },
        select: { id: true, categoryId: true, amount: true, currency: true, category: { select: { name: true } } },
      }),
      this.prisma.savingsGoal.findMany({
        where: { userId, status: GoalStatus.ACTIVE },
        select: { name: true, currentAmount: true, targetAmount: true, currency: true },
      }),
    ]);
    const spendingByCategory =
      budgets.length === 0
        ? []
        : await this.prisma.transaction.groupBy({
            by: ['categoryId', 'currency'],
            where: {
              ...transactionWhere,
              type: TransactionType.EXPENSE,
              categoryId: { in: budgets.map((budget) => budget.categoryId) },
            },
            _sum: { amount: true },
          });
    const normalizedBudgets = await Promise.all(budgets.map(async (budget) => ({ ...budget, amount: await this.exchangeRates.convert(budget.amount, budget.currency, currency) })));
    const normalizedGoals = await Promise.all(goals.map(async (goal) => ({ ...goal, currentAmount: await this.exchangeRates.convert(goal.currentAmount, goal.currency, currency), targetAmount: await this.exchangeRates.convert(goal.targetAmount, goal.currency, currency) })));
    const spent = await this.convertCategoryTotals(spendingByCategory, currency);
    const missingSignals: FinancialHealthSignal[] = [];
    if (income.isZero()) missingSignals.push('income');
    if (normalizedBudgets.length === 0) missingSignals.push('budget');
    if (normalizedGoals.length === 0) missingSignals.push('goal');

    const savingsRate = income.isZero() ? null : income.minus(expense).div(income).mul(100);
    const savingsScore = savingsRate === null ? null : this.scaleSavingsScore(savingsRate);
    const budgetScore = normalizedBudgets.length === 0 ? null : this.calculateBudgetScore(normalizedBudgets, spent);
    const goalScore = normalizedGoals.length === 0 ? null : this.calculateGoalScore(normalizedGoals);
    const components: FinancialHealthComponent[] = [
      {
        key: 'savingsRate',
        label: 'Tasarruf oranı',
        score: savingsScore,
        description:
          savingsRate === null
            ? 'Bu ay gelir kaydı gerektiği için hesaplanamıyor.'
            : `Net tasarruf oranınız %${savingsRate.toDecimalPlaces(1).toString()}.`,
      },
      {
        key: 'budgetAdherence',
        label: 'Bütçe uyumu',
        score: budgetScore,
        description:
          budgetScore === null
            ? 'Bu para biriminde bu ay için gider bütçesi yok.'
            : `${budgets.length} aylık gider bütçeniz değerlendirildi.`,
      },
      {
        key: 'goalProgress',
        label: 'Hedef ilerlemesi',
        score: goalScore,
        description:
          goalScore === null
            ? 'Aktif birikim hedefi yok.'
            : `${goals.length} aktif birikim hedefiniz değerlendirildi.`,
      },
    ];
    if (missingSignals.length > 0) {
      return {
        currency,
        isReady: false,
        missingSignals,
        score: null,
        level: null,
        components,
        strongestFactor: null,
        recommendations: this.setupRecommendations(missingSignals),
      };
    }
    const scores = {
      savingsRate: savingsScore!,
      budgetAdherence: budgetScore!,
      goalProgress: goalScore!,
    };
    const score = Math.round(
      scores.savingsRate * 0.4 + scores.budgetAdherence * 0.35 + scores.goalProgress * 0.25,
    );
    const strongest = Object.entries(scores).sort(
      ([, a], [, b]) => b - a,
    )[0]?.[0] as FinancialHealthComponent['key'];
    const weakest = Object.entries(scores).sort(
      ([, a], [, b]) => a - b,
    )[0]?.[0] as FinancialHealthComponent['key'];
    return {
      currency,
      isReady: true,
      missingSignals: [],
      score,
      level: this.getHealthLevel(score),
      components,
      strongestFactor: components.find((component) => component.key === strongest)?.label ?? null,
      recommendations: [this.scoreRecommendation(weakest, normalizedBudgets, spent)],
    };
  }

  async getDailyCoaching(userId: string, query: DailyCoachingDto): Promise<DailyCoachingResponse> {
    const now = new Date();
    const user = query.currency
      ? null
      : await this.prisma.user.findUnique({
          where: { id: userId },
          select: { defaultCurrency: true },
        });
    const currency = query.currency ?? user?.defaultCurrency ?? Currency.TRY;
    const monthStart = this.startOfIstanbulMonth(now);
    const monthEnd = this.addMonths(monthStart, 1);
    const previousMonthStart = this.addMonths(monthStart, -1);
    const periodStart = this.istanbulCalendarMonthStart(now);
    const where = { userId };
    const [health, currentIncome, currentExpense, previousIncome, previousExpense, budgets, goals] =
      await Promise.all([
        this.getFinancialHealth(userId, { currency }),
        this.sumConvertedWhere({ ...where, type: TransactionType.INCOME, occurredAt: { gte: monthStart, lt: monthEnd } }, currency),
        this.sumConvertedWhere({ ...where, type: TransactionType.EXPENSE, occurredAt: { gte: monthStart, lt: monthEnd } }, currency),
        this.sumConvertedWhere({ ...where, type: TransactionType.INCOME, occurredAt: { gte: previousMonthStart, lt: monthStart } }, currency),
        this.sumConvertedWhere({ ...where, type: TransactionType.EXPENSE, occurredAt: { gte: previousMonthStart, lt: monthStart } }, currency),
        this.prisma.budget.findMany({
          where: { userId, period: BudgetPeriod.MONTHLY, periodStart },
          select: { categoryId: true, amount: true, currency: true, category: { select: { name: true } } },
        }),
        this.prisma.savingsGoal.findMany({
          where: { userId, status: GoalStatus.ACTIVE },
          select: { name: true, currentAmount: true, targetAmount: true, currency: true, targetDate: true, createdAt: true },
        }),
      ]);
    const spending = budgets.length
      ? await this.prisma.transaction.groupBy({
          by: ['categoryId', 'currency'],
          where: {
            ...where,
            type: TransactionType.EXPENSE,
            occurredAt: { gte: monthStart, lt: monthEnd },
            categoryId: { in: budgets.map((budget) => budget.categoryId) },
          },
          _sum: { amount: true },
        })
      : [];
    const normalizedBudgets = await Promise.all(budgets.map(async (budget) => ({ ...budget, amount: await this.exchangeRates.convert(budget.amount, budget.currency, currency) })));
    const normalizedGoals = await Promise.all(goals.map(async (goal) => ({ ...goal, currentAmount: await this.exchangeRates.convert(goal.currentAmount, goal.currency, currency), targetAmount: await this.exchangeRates.convert(goal.targetAmount, goal.currency, currency) })));
    const spentByCategory = await this.convertCategoryTotals(spending, currency);
    const exceeded = normalizedBudgets.find((budget) =>
      (spentByCategory.get(budget.categoryId) ?? new Prisma.Decimal(0)).gt(budget.amount),
    );
    const behindGoal = normalizedGoals.find((goal) => {
      if (!goal.targetDate || goal.targetDate <= now || goal.targetDate <= goal.createdAt) return false;
      const expected = (now.getTime() - goal.createdAt.getTime()) / (goal.targetDate.getTime() - goal.createdAt.getTime());
      return goal.currentAmount.div(goal.targetAmount).toNumber() < expected * 0.8;
    });
    const currentRate = currentIncome.isZero()
      ? null
      : currentIncome.minus(currentExpense).div(currentIncome).mul(100).toNumber();
    const previousRate = previousIncome.isZero()
      ? null
      : previousIncome.minus(previousExpense).div(previousIncome).mul(100).toNumber();
    const personalInsight = this.personalInsightProvider.getInsight({
      currency,
      isHealthReady: health.isReady,
      missingSignals: health.missingSignals,
      healthScore: health.score,
      hasExceededBudget: Boolean(exceeded),
      exceededBudgetName: exceeded?.category.name ?? null,
      currentSavingsRate: currentRate,
      previousSavingsRate: previousRate,
      behindGoalName: behindGoal?.name ?? null,
      positive: health.isReady && (health.score ?? 0) >= 60 && !exceeded && !behindGoal,
    });
    return {
      currency,
      personalInsight,
      generalTip: await this.dailyGeneralTipService.getTip(this.startOfIstanbulDay(now)),
    };
  }

  private scaleSavingsScore(rate: Prisma.Decimal): number {
    if (rate.lte(-25)) return 0;
    if (rate.gte(20)) return 100;
    return rate.add(25).div(45).mul(100).toDecimalPlaces(2).toNumber();
  }

  private calculateBudgetScore(
    budgets: { amount: Prisma.Decimal; categoryId: string }[],
    spent: Map<string, Prisma.Decimal>,
  ): number {
    const total = budgets.reduce((sum, budget) => sum.add(budget.amount), new Prisma.Decimal(0));
    if (total.isZero()) return 0;
    const weighted = budgets.reduce((sum, budget) => {
      const ratio = (spent.get(budget.categoryId) ?? new Prisma.Decimal(0)).div(budget.amount);
      const itemScore = ratio.lte(1)
        ? new Prisma.Decimal(100)
        : ratio.gte(1.5)
          ? new Prisma.Decimal(0)
          : new Prisma.Decimal(150).sub(ratio.mul(100)).mul(2);
      return sum.add(itemScore.mul(budget.amount));
    }, new Prisma.Decimal(0));
    return weighted.div(total).toDecimalPlaces(2).toNumber();
  }

  private calculateGoalScore(
    goals: { currentAmount: Prisma.Decimal; targetAmount: Prisma.Decimal }[],
  ): number {
    return goals
      .reduce(
        (sum, goal) =>
          sum.add(
            Prisma.Decimal.min(
              goal.currentAmount.div(goal.targetAmount).mul(100),
              new Prisma.Decimal(100),
            ),
          ),
        new Prisma.Decimal(0),
      )
      .div(goals.length)
      .toDecimalPlaces(2)
      .toNumber();
  }

  private getHealthLevel(score: number): FinancialHealthLevel {
    return score < 40 ? 'Kritik' : score < 60 ? 'Dikkat' : score < 80 ? 'İyi' : 'Çok iyi';
  }

  private setupRecommendations(signals: FinancialHealthSignal[]): FinancialHealthRecommendation[] {
    const recommendations: Record<FinancialHealthSignal, FinancialHealthRecommendation> = {
      income: {
        title: 'Bu ay bir gelir kaydedin',
        description: 'Tasarruf oranınızı hesaplamak için gelir işlemi ekleyin.',
        href: '/dashboard/transactions',
      },
      budget: {
        title: 'Aylık gider bütçesi oluşturun',
        description:
          'Bütçe uyumunuzu görmek için seçili para biriminde aylık gider bütçesi ekleyin.',
        href: '/dashboard/budgets',
      },
      goal: {
        title: 'Aktif birikim hedefi ekleyin',
        description: 'Hedef ilerlemenizi değerlendirmek için bir hedef oluşturun.',
        href: '/dashboard/savings',
      },
    };
    return signals.map((signal) => recommendations[signal]);
  }

  private scoreRecommendation(
    key: FinancialHealthComponent['key'],
    budgets: { amount: Prisma.Decimal; categoryId: string; category: { name: string } }[],
    spent: Map<string, Prisma.Decimal>,
  ): FinancialHealthRecommendation {
    if (key === 'savingsRate')
      return {
        title: 'Tasarruf payınızı güçlendirin',
        description: 'Giderlerinizi gözden geçirin ve tüm gelirlerinizi kaydedin.',
        href: '/dashboard/transactions',
      };
    if (key === 'goalProgress')
      return {
        title: 'Hedefinize düzenli katkı yapın',
        description: 'Aktif hedefinize küçük ve düzenli katkılar ekleyin.',
        href: '/dashboard/savings',
      };
    const mostOver = [...budgets].sort((a, b) =>
      (spent.get(b.categoryId) ?? new Prisma.Decimal(0))
        .div(b.amount)
        .comparedTo((spent.get(a.categoryId) ?? new Prisma.Decimal(0)).div(a.amount)),
    )[0];
    return {
      title: 'Bütçenizi gözden geçirin',
      description: mostOver
        ? `${mostOver.category.name} kategorisindeki harcamanızı kontrol edin.`
        : 'Aşılmış kategorilerinizi kontrol edin.',
      href: '/dashboard/budgets',
    };
  }

  private istanbulCalendarMonthStart(date: Date): Date {
    const parts = this.getIstanbulDateParts(date);
    return new Date(Date.UTC(parts.year, parts.month - 1, 1));
  }

  private async sumAmount(where: Prisma.TransactionWhereInput): Promise<Prisma.Decimal> {
    const result = await this.prisma.transaction.aggregate({ where, _sum: { amount: true } });

    return result._sum.amount ?? new Prisma.Decimal(0);
  }

  private async sumConvertedWhere(
    where: Prisma.TransactionWhereInput,
    targetCurrency: Currency,
  ): Promise<Prisma.Decimal> {
    const rows = await this.prisma.transaction.groupBy({
      by: ['currency'],
      where,
      _sum: { amount: true },
    });
    const amounts = await Promise.all(
      rows.map((row) =>
        this.exchangeRates.convert(row._sum.amount ?? new Prisma.Decimal(0), row.currency, targetCurrency),
      ),
    );
    return amounts.reduce((sum, amount) => sum.add(amount), new Prisma.Decimal(0));
  }

  private async convertCategoryTotals(
    rows: { categoryId: string; currency: Currency; _sum: { amount: Prisma.Decimal | null } }[],
    targetCurrency: Currency,
  ): Promise<Map<string, Prisma.Decimal>> {
    const converted = await Promise.all(rows.map(async (row) => ({
      categoryId: row.categoryId,
      amount: await this.exchangeRates.convert(row._sum.amount ?? new Prisma.Decimal(0), row.currency, targetCurrency),
    })));
    return converted.reduce((totals, row) => {
      totals.set(row.categoryId, (totals.get(row.categoryId) ?? new Prisma.Decimal(0)).add(row.amount));
      return totals;
    }, new Map<string, Prisma.Decimal>());
  }

  private async sumConverted(
    totals: { currency: Currency; type: TransactionType; _sum: { amount: Prisma.Decimal | null } }[],
    targetCurrency: Currency,
    type: TransactionType,
  ): Promise<Prisma.Decimal> {
    const converted = await Promise.all(
      totals
        .filter((total) => total.type === type && total._sum.amount)
        .map((total) => this.exchangeRates.convert(total._sum.amount!, total.currency, targetCurrency)),
    );
    return converted.reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0));
  }

  private async getTrendRows(
    userId: string,
    targetCurrency: Currency,
    start: Date,
    end: Date,
    isDaily: boolean,
  ): Promise<TrendRow[]> {
    const format = isDaily ? 'YYYY-MM-DD' : 'YYYY-MM';

    const rows = await this.prisma.$queryRaw<TrendRow[]>(Prisma.sql`
      SELECT
        to_char("occurredAt" AT TIME ZONE 'Europe/Istanbul', ${format}) AS bucket,
        currency,
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0)::text AS income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0)::text AS expense
      FROM "Transaction"
      WHERE "userId" = ${userId}::uuid
        AND "occurredAt" >= ${start}
        AND "occurredAt" < ${end}
      GROUP BY bucket, currency
      ORDER BY bucket
    `);
    const converted = await Promise.all(rows.map(async (row) => ({
      bucket: row.bucket,
      income: await this.exchangeRates.convert(new Prisma.Decimal(row.income), row.currency, targetCurrency),
      expense: await this.exchangeRates.convert(new Prisma.Decimal(row.expense), row.currency, targetCurrency),
    })));
    const totals = new Map<string, { income: Prisma.Decimal; expense: Prisma.Decimal }>();
    for (const row of converted) {
      const current = totals.get(row.bucket) ?? { income: new Prisma.Decimal(0), expense: new Prisma.Decimal(0) };
      totals.set(row.bucket, { income: current.income.plus(row.income), expense: current.expense.plus(row.expense) });
    }
    return [...totals.entries()].map(([bucket, total]) => ({ bucket, currency: targetCurrency, income: total.income.toString(), expense: total.expense.toString() }));
  }

  private createRange(period: DashboardPeriod, now: Date): { end: Date; start: Date } {
    const currentMonthStart = this.startOfIstanbulMonth(now);
    const months = { current_month: 0, last_3_months: 2, last_6_months: 5, last_12_months: 11 }[
      period
    ];

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

  private startOfIstanbulDay(date: Date): Date {
    const parts = this.getIstanbulDateParts(date);
    return this.createIstanbulDate(parts.year, parts.month, parts.day);
  }

  private addMonths(date: Date, months: number): Date {
    const parts = this.getIstanbulDateParts(date);
    const value = new Date(Date.UTC(parts.year, parts.month - 1 + months, 1));

    return this.createIstanbulDate(value.getUTCFullYear(), value.getUTCMonth() + 1, 1);
  }

  private addIstanbulDays(date: Date, days: number): Date {
    const parts = this.getIstanbulDateParts(date);
    const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

    return this.createIstanbulDate(
      value.getUTCFullYear(),
      value.getUTCMonth() + 1,
      value.getUTCDate(),
    );
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
    return new Date(
      `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00+03:00`,
    );
  }
}
