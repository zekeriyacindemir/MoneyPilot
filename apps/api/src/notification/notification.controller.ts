import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { NotificationService, type NotificationListResponse } from './notification.service';

const unauthorized = { description: 'Access token is missing or invalid.' };

@Controller('notifications')
@UseGuards(JwtAccessGuard)
@ApiTags('Notifications')
@ApiBearerAuth('access-token')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'List recent notifications',
    description:
      'Returns the 30 most recent notifications and the unread count. Alerts are re-evaluated at most every five minutes per user.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: '0b8f6f0e-7d0a-4c1e-9a9b-3f0c2a1d4e5f',
            type: 'BUDGET_WARNING',
            title: 'Market bütçeniz: %85 kullanıldı',
            body: 'Bu ay ₺4.250,00 / ₺5.000,00 harcandı. Kalan: ₺750,00.',
            href: '/dashboard/budgets',
            readAt: null,
            createdAt: '2026-11-01T09:00:00.000Z',
          },
        ],
        unreadCount: 1,
      },
    },
  })
  @ApiUnauthorizedResponse(unauthorized)
  list(@CurrentUser() user: { sub: string }): Promise<NotificationListResponse> {
    return this.notifications.list(user.sub);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiNoContentResponse({ description: 'All notifications marked as read.' })
  @ApiUnauthorizedResponse(unauthorized)
  async markAllRead(@CurrentUser() user: { sub: string }): Promise<void> {
    await this.notifications.markAllRead(user.sub);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiNoContentResponse({ description: 'Notification marked as read.' })
  @ApiUnauthorizedResponse(unauthorized)
  @ApiNotFoundResponse({ description: 'Notification not found.' })
  async markRead(
    @CurrentUser() user: { sub: string },
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.notifications.markRead(user.sub, id);
  }
}
