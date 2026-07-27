import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHealth(): Promise<{ status: 'ok' }> {
    await this.prismaService.$queryRaw`SELECT 1`;

    return { status: 'ok' };
  }
}
