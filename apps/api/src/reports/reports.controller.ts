import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MonthlyReportDto } from './dto/monthly-report.dto';
import { ReportsService, type MonthlyReportResponse } from './reports.service';

@Controller('reports')
@UseGuards(JwtAccessGuard)
@ApiTags('Reports')
@ApiBearerAuth('access-token')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly financial report for the authenticated user.' })
  @ApiOkResponse({ description: 'Monthly report.' })
  @ApiBadRequestResponse({ description: 'Month or currency is invalid.' })
  @ApiUnauthorizedResponse({ description: 'Access token is missing or invalid.' })
  getMonthlyReport(
    @CurrentUser() user: { sub: string },
    @Query() query: MonthlyReportDto,
  ): Promise<MonthlyReportResponse> {
    return this.reportsService.getMonthlyReport(user.sub, query);
  }
}
