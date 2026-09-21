import { ServiceUnavailableException, type ExecutionContext } from '@nestjs/common';
import { Currency, GoalStatus, Prisma } from '@prisma/client';
import { ExchangeRateService } from '../src/dashboard/exchange-rate.service';
import { SavingsGoalService } from '../src/savings-goal/savings-goal.service';
import { AuthThrottleGuard } from '../src/auth/guards/auth-throttle.guard';
import type { PrismaService } from '../src/prisma/prisma.service';

describe('Exchange rate reliability', () => {
 afterEach(() => jest.restoreAllMocks());
 it('shares cold-cache requests and retains valid cached rates', async () => {
  const fetcher=jest.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({rates:{TRY:40,EUR:.9,GBP:.8}})} as Response);
  const service=new ExchangeRateService();
  const values=await Promise.all(Array.from({length:20},()=>service.convert(new Prisma.Decimal(2),Currency.USD,Currency.TRY)));
  expect(values.every(value=>value.equals(80))).toBe(true); expect(fetcher).toHaveBeenCalledTimes(1);
  await service.convert(new Prisma.Decimal(1),Currency.USD,Currency.TRY); expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('returns 503 for missing rates, then permits a successful retry', async () => {
  const fetcher=jest.spyOn(globalThis,'fetch').mockResolvedValueOnce({ok:true,json:async()=>({rates:{TRY:40}})} as Response).mockResolvedValueOnce({ok:true,json:async()=>({rates:{TRY:40,EUR:.9,GBP:.8}})} as Response);
  const service=new ExchangeRateService();
  await expect(service.convert(new Prisma.Decimal(1),Currency.USD,Currency.TRY)).rejects.toBeInstanceOf(ServiceUnavailableException);
  await expect(service.convert(new Prisma.Decimal(1),Currency.USD,Currency.TRY)).resolves.toEqual(new Prisma.Decimal(40));
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('does not contact the provider for same-currency values',async()=>{const fetcher=jest.spyOn(globalThis,'fetch');await new ExchangeRateService().convert(new Prisma.Decimal(1),Currency.TRY,Currency.TRY);expect(fetcher).not.toHaveBeenCalled();});
});

describe('Savings goal edits',()=>{
 it.each([GoalStatus.PAUSED,GoalStatus.CANCELED])('preserves %s on name and amount edits',async(status)=>{
  const record={id:'goal',userId:'owner',name:'Goal',targetAmount:new Prisma.Decimal(100),currentAmount:new Prisma.Decimal(20),currency:Currency.TRY,priority:'MEDIUM',status,completedAt:null,targetDate:null,createdAt:new Date(),updatedAt:new Date()};
  const db={savingsGoal:{findFirst:jest.fn().mockResolvedValue(record),update:jest.fn().mockImplementation(async({data})=>({...record,...data}))}};
  const service=new SavingsGoalService(db as unknown as PrismaService);
  expect((await service.update('owner','goal',{name:'Renamed'})).status).toBe(status);
  expect((await service.updateCurrentAmount('owner','goal',{currentAmount:'40'})).status).toBe(status);
 });
});

describe('Authentication rate limit',()=>{
 it('limits repeated attempts and opens a new window after expiry',()=>{
  const guard=new AuthThrottleGuard();const setHeader=jest.fn();const context={switchToHttp:()=>({getRequest:()=>({method:'POST',path:'/auth/login',ip:'127.0.0.1'}),getResponse:()=>({setHeader})})} as unknown as ExecutionContext;
  const now=jest.spyOn(Date,'now').mockReturnValue(0);
  try { for(let i=0;i<30;i++)expect(guard.canActivate(context)).toBe(true);
   expect(()=>guard.canActivate(context)).toThrow('Çok fazla');expect(setHeader).toHaveBeenCalledWith('Retry-After',60);
   now.mockReturnValue(60_001);expect(guard.canActivate(context)).toBe(true);
  }finally{now.mockRestore();}
 });
});
