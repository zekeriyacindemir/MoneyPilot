import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { DashboardService, type DashboardSummaryResponse } from './dashboard.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@Controller('dashboard')
@UseGuards(JwtAccessGuard)
@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary', description: 'Returns currency-specific financial metrics, a trend series, and recent transactions for the authenticated user.' })
  @ApiOkResponse({ description: 'Dashboard summary.' })
  @ApiBadRequestResponse({ description: 'Currency or period is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' })
  getSummary(
    @CurrentUser() user: { sub: string },
    @Query() query: DashboardSummaryDto,
  ): Promise<DashboardSummaryResponse> {
    return this.dashboardService.getSummary(user.sub, query);
  }
}
