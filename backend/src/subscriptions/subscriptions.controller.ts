import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/index.js';
import { CurrentUser, Roles } from '../auth/decorators/index.js';
import { Role, SubscriptionStatus } from '@prisma/client';
import { AssignSubscriptionDto, BulkAssignDto, UpdateSubscriptionDto } from './dto/index.js';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  /**
   * POST /subscriptions/assign — admin assigns a subject to a user
   */
  @Post('assign')
  @Roles(Role.ADMIN)
  async assign(@Body() dto: AssignSubscriptionDto) {
    return this.subscriptionsService.assign(dto);
  }

  /**
   * POST /subscriptions/bulk-assign — admin assigns multiple subjects to a user
   */
  @Post('bulk-assign')
  @Roles(Role.ADMIN)
  async bulkAssign(@Body() dto: BulkAssignDto) {
    return this.subscriptionsService.bulkAssign(dto);
  }

  /**
   * GET /subscriptions — admin lists all subscriptions
   */
  @Get()
  @Roles(Role.ADMIN)
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('status') status?: SubscriptionStatus,
  ) {
    return this.subscriptionsService.findAll(page, limit, userId, subjectId, status);
  }

  /**
   * GET /subscriptions/user/:userId — admin views a user's subscriptions
   */
  @Get('user/:userId')
  @Roles(Role.ADMIN)
  async findByUser(@Param('userId') userId: string) {
    return this.subscriptionsService.findByUser(userId);
  }

  /**
   * GET /subscriptions/my — student gets their active subscriptions
   */
  @Get('my')
  async getMySubscriptions(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getMySubscriptions(userId);
  }

  /**
   * GET /subscriptions/check/:subjectId — check if user has access
   */
  @Get('check/:subjectId')
  async checkAccess(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('subjectId') subjectId: string,
  ) {
    if (role === Role.ADMIN || role === Role.TEACHER) {
      return { hasAccess: true };
    }
    const hasAccess = await this.subscriptionsService.hasAccess(userId, subjectId);
    return { hasAccess };
  }

  /**
   * PUT /subscriptions/:id — admin updates a subscription
   */
  @Put(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, dto);
  }

  /**
   * DELETE /subscriptions/:id — admin revokes a subscription
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  async revoke(@Param('id') id: string) {
    return this.subscriptionsService.revoke(id);
  }
}
