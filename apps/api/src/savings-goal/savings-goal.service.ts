import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GoalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import type { UpdateCurrentAmountDto } from './dto/update-current-amount.dto';
import type { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

type SavingsGoalRecord = Prisma.SavingsGoalGetPayload<Record<string, never>>;
export interface SavingsGoalResponse {
  id: string; name: string; targetAmount: string; currentAmount: string; remainingAmount: string; progressPercent: string;
  currency: SavingsGoalRecord['currency']; priority: SavingsGoalRecord['priority']; status: GoalStatus; targetDate: Date | null;
  completedAt: Date | null; createdAt: Date; updatedAt: Date;
}

@Injectable()
export class SavingsGoalService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSavingsGoalDto): Promise<SavingsGoalResponse> {
    const goal = await this.prisma.savingsGoal.create({ data: { userId, name: dto.name, targetAmount: dto.targetAmount, currency: dto.currency, ...(dto.priority ? { priority: dto.priority } : {}), ...(dto.targetDate ? { targetDate: this.asCalendarDate(dto.targetDate) } : {}) } });
    return this.toResponse(goal);
  }

  async findAll(userId: string): Promise<SavingsGoalResponse[]> {
    const goals = await this.prisma.savingsGoal.findMany({ where: { userId }, orderBy: [{ status: 'asc' }, { targetDate: 'asc' }, { createdAt: 'desc' }] });
    return goals.map((goal) => this.toResponse(goal));
  }

  async findOne(userId: string, id: string): Promise<SavingsGoalResponse> { return this.toResponse(await this.getOwned(userId, id)); }

  async update(userId: string, id: string, dto: UpdateSavingsGoalDto): Promise<SavingsGoalResponse> {
    const existing = await this.getOwned(userId, id);
    const targetAmount = new Prisma.Decimal(dto.targetAmount ?? existing.targetAmount);
    const currentAmount = new Prisma.Decimal(existing.currentAmount);
    if (dto.status === GoalStatus.COMPLETED && currentAmount.lt(targetAmount)) throw new BadRequestException('A goal can only be completed after its target amount is reached.');
    const completion = this.completionData(currentAmount, targetAmount, dto.status, existing.completedAt);
    const goal = await this.prisma.savingsGoal.update({ where: { id }, data: { ...(dto.name !== undefined ? { name: dto.name } : {}), ...(dto.targetAmount ? { targetAmount: dto.targetAmount } : {}), ...(dto.currency ? { currency: dto.currency } : {}), ...(dto.priority ? { priority: dto.priority } : {}), ...(dto.targetDate !== undefined ? { targetDate: dto.targetDate ? this.asCalendarDate(dto.targetDate) : null } : {}), ...completion } });
    return this.toResponse(goal);
  }

  async updateCurrentAmount(userId: string, id: string, dto: UpdateCurrentAmountDto): Promise<SavingsGoalResponse> {
    const existing = await this.getOwned(userId, id);
    const currentAmount = new Prisma.Decimal(dto.currentAmount);
    const targetAmount = new Prisma.Decimal(existing.targetAmount);
    const completion = this.completionData(currentAmount, targetAmount, undefined, existing.completedAt);
    const goal = await this.prisma.savingsGoal.update({ where: { id }, data: { currentAmount: dto.currentAmount, ...completion } });
    return this.toResponse(goal);
  }

  async remove(userId: string, id: string): Promise<void> { const result = await this.prisma.savingsGoal.deleteMany({ where: { id, userId } }); if (result.count !== 1) throw new NotFoundException('Savings goal not found.'); }

  private async getOwned(userId: string, id: string): Promise<SavingsGoalRecord> { const goal = await this.prisma.savingsGoal.findFirst({ where: { id, userId } }); if (!goal) throw new NotFoundException('Savings goal not found.'); return goal; }
  private completionData(current: Prisma.Decimal, target: Prisma.Decimal, requested: GoalStatus | undefined, completedAt: Date | null): { status: GoalStatus; completedAt: Date | null } {
    if (requested === GoalStatus.ACTIVE || requested === GoalStatus.PAUSED || requested === GoalStatus.CANCELED) return { status: requested, completedAt: null };
    if (requested === GoalStatus.COMPLETED || current.greaterThanOrEqualTo(target)) return { status: GoalStatus.COMPLETED, completedAt: completedAt ?? new Date() };
    return { status: GoalStatus.ACTIVE, completedAt: null };
  }
  private toResponse(goal: SavingsGoalRecord): SavingsGoalResponse { const target = new Prisma.Decimal(goal.targetAmount); const current = new Prisma.Decimal(goal.currentAmount); return { id: goal.id, name: goal.name, targetAmount: target.toString(), currentAmount: current.toString(), remainingAmount: Prisma.Decimal.max(target.sub(current), new Prisma.Decimal(0)).toString(), progressPercent: current.div(target).mul(100).toDecimalPlaces(2).toString(), currency: goal.currency, priority: goal.priority, status: goal.status, targetDate: goal.targetDate, completedAt: goal.completedAt, createdAt: goal.createdAt, updatedAt: goal.updatedAt }; }
  private asCalendarDate(date: Date): Date { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
}
