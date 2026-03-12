import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto, UpdateUserDto, AssignRoleDto } from './dto/index.js';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/index.js';
import { Roles, CurrentUser } from '../auth/decorators/index.js';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('role') role?: Role,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(page, limit, role, search);
  }

  @Get('suspicious')
  @Roles(Role.ADMIN)
  async findSuspicious(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.getSuspiciousUsers(page, limit, search);
  }

  @Get(':id/devices')
  @Roles(Role.ADMIN)
  async getDevices(@Param('id') id: string) {
    return this.usersService.getUserDevices(id);
  }

  @Patch(':id/block')
  @Roles(Role.ADMIN)
  async blockUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reason?: string },
  ) {
    return this.usersService.blockUserAccount(id, adminId, body.reason);
  }

  @Patch(':id/unblock')
  @Roles(Role.ADMIN)
  async unblockUser(@Param('id') id: string) {
    return this.usersService.unblockUserAccount(id);
  }

  @Post(':id/devices/block')
  @Roles(Role.ADMIN)
  async blockDevice(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { fingerprintHash: string; reason?: string },
  ) {
    return this.usersService.blockDevice(
      id,
      body.fingerprintHash,
      adminId,
      body.reason,
    );
  }

  @Post(':id/devices/unblock')
  @Roles(Role.ADMIN)
  async unblockDevice(
    @Param('id') id: string,
    @Body() body: { fingerprintHash: string },
  ) {
    return this.usersService.unblockDevice(id, body.fingerprintHash);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  async assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto);
  }
}
