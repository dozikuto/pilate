import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  PrivateSessionsService, CreatePrivateSessionDto, UpdatePrivateSessionStatusDto,
} from './private-sessions.service';
import { PrivateSessionStatus } from '../../entities/private-session-request.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Private Sessions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('private-sessions')
export class PrivateSessionsController {
  constructor(private readonly service: PrivateSessionsService) {}

  @Get('instructors')
  @ApiOperation({ summary: 'Danh sách HLV để học viên chọn xem lịch' })
  listInstructors() {
    return this.service.listInstructors();
  }

  @Get('instructors/:instructorUserId/week')
  @ApiOperation({ summary: 'Lịch dạy 7 ngày của HLV, số chỗ còn trống và khung giờ rảnh' })
  @ApiQuery({ name: 'weekStart', required: false, example: '2026-10-12' })
  getWeek(
    @Param('instructorUserId') instructorUserId: string,
    @Query('weekStart') weekStart?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.service.getInstructorWeek(instructorUserId, weekStart, userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Các đề nghị tập riêng của tôi' })
  findMine(@CurrentUser('id') userId: string) {
    return this.service.findMine(userId);
  }

  @Post()
  @Roles(UserRole.MEMBER)
  @ApiOperation({ summary: 'Đề nghị tập riêng vào khung giờ trống của HLV' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePrivateSessionDto) {
    return this.service.create(userId, dto);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.MEMBER)
  @ApiOperation({ summary: 'Học viên hủy đề nghị tập riêng' })
  cancelMine(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.cancelMine(id, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Quản lý danh sách đề nghị tập riêng' })
  @ApiQuery({ name: 'status', enum: PrivateSessionStatus, required: false })
  @ApiQuery({ name: 'instructorUserId', required: false })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: PrivateSessionStatus,
    @Query('instructorUserId') instructorUserId?: string,
  ) {
    return this.service.findAll({ status, instructorUserId }, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Duyệt / từ chối đề nghị tập riêng' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePrivateSessionStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateStatus(id, dto, user);
  }
}
