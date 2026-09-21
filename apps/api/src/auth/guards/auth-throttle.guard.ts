import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';

/** Per-process protection. Multi-replica deployments also need a shared edge limit. */
@Injectable()
export class AuthThrottleGuard implements CanActivate {
  private readonly windows = new Map<string, { count: number; until: number }>();
  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    if (request.method === 'GET') return true;
    const now = Date.now();
    for (const [key, value] of this.windows) if (value.until <= now) this.windows.delete(key);
    const key = (request.ip ?? request.socket.remoteAddress ?? 'unknown') + ':' + request.path;
    const window = this.windows.get(key) ?? { count: 0, until: now + 60_000 };
    const limit = request.path.endsWith('/refresh') ? 120 : 30;
    if (window.count >= limit || (!this.windows.has(key) && this.windows.size >= 10_000)) {
      http.getResponse<Response>().setHeader('Retry-After', Math.max(1, Math.ceil((window.until - now) / 1000)));
      throw new HttpException('Çok fazla deneme yaptınız. Bir dakika sonra tekrar deneyin.', HttpStatus.TOO_MANY_REQUESTS);
    }
    window.count += 1;
    this.windows.set(key, window);
    return true;
  }
}
