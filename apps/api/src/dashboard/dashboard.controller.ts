import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { DashboardService, type DashboardSummaryResponse } from './dashboard.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { FinancialHealthDto } from './dto/financial-health.dto';
import { DailyCoachingDto } from './dto/daily-coaching.dto';

@Controller('dashboard')
@UseGuards(JwtAccessGuard)
@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get dashboard summary',
    description:
      'Returns currency-specific financial metrics, a trend series, and recent transactions for the authenticated user.',
  })
  @ApiOkResponse({ description: 'Dashboard summary.' })
  @ApiBadRequestResponse({ description: 'Currency or period is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' })
  getSummary(
    @CurrentUser() user: { sub: string },
    @Query() query: DashboardSummaryDto,
  ): Promise<DashboardSummaryResponse> {
    return this.dashboardService.getSummary(user.sub, query);
  }

  @Get('financial-health')
  @ApiOperation({
    summary: 'Get monthly financial health score',
    description:
      'Returns a currency-specific financial health signal for the current Istanbul calendar month.',
  })
  @ApiOkResponse({ description: 'Financial health score or setup guidance.' })
  @ApiBadRequestResponse({ description: 'Currency is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' })
  getFinancialHealth(
    @CurrentUser() user: { sub: string },
    @Query() query: FinancialHealthDto,
  ): Promise<import('./dashboard.service').FinancialHealthResponse> {
    return this.dashboardService.getFinancialHealth(user.sub, query);
  }

  @Get('daily-coaching')
  @ApiOperation({ summary: 'Get daily personal coaching and a shared general tip' })
  @ApiOkResponse({ description: 'Daily coaching content.' })
  @ApiBadRequestResponse({ description: 'Currency is invalid.' })
  getDailyCoaching(
    @CurrentUser() user: { sub: string },
    @Query() query: DailyCoachingDto,
  ): Promise<import('./dashboard.service').DailyCoachingResponse> {
    return this.dashboardService.getDailyCoaching(user.sub, query);
  }
}
