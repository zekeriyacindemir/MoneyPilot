import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';

type ExchangeRateResponse = { rates?: Partial<Record<Currency, number>> };

/**
 * Fetches a small, cached set of daily FX rates for dashboard presentation.
 * Stored transactions remain in their original currency; conversion is only
 * performed while composing a cross-currency overview.
 */
@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly cache = new Map<Currency, { expiresAt: number; rates: Map<Currency, number> }>();

  async convert(amount: Prisma.Decimal, from: Currency, to: Currency): Promise<Prisma.Decimal> {
    if (from === to) return amount;

    const rates = await this.getRates(from);
    const rate = rates.get(to);
    if (!rate) {
      throw new Error(`Exchange rate is unavailable for ${from}/${to}.`);
    }

    return amount.mul(rate);
  }

  private async getRates(base: Currency): Promise<Map<Currency, number>> {
    const cached = this.cache.get(base);
    if (cached && cached.expiresAt > Date.now()) return cached.rates;

    const symbols = (Object.values(Currency) as Currency[]).filter((currency) => currency !== base);
    const url = new URL('https://api.frankfurter.dev/v1/latest');
    url.searchParams.set('base', base);
    url.searchParams.set('symbols', symbols.join(','));

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4_000) });
      if (!response.ok) throw new Error(`Rate service returned ${response.status}.`);
      const body = (await response.json()) as ExchangeRateResponse;
      const rates = new Map<Currency, number>([[base, 1]]);
      for (const currency of symbols) {
        const rate = body.rates?.[currency];
        if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) rates.set(currency, rate);
      }
      if (rates.size !== Object.values(Currency).length) throw new Error('Rate service returned incomplete data.');

      this.cache.set(base, { rates, expiresAt: Date.now() + 6 * 60 * 60 * 1_000 });
      return rates;
    } catch (error) {
      this.logger.warn(`Could not load FX rates with ${base} as base: ${error instanceof Error ? error.message : 'unknown error'}`);
      throw new ServiceUnavailableException(
        'Güncel döviz kuru alınamadı. Lütfen biraz sonra tekrar deneyin.',
      );
    }
  }
}
