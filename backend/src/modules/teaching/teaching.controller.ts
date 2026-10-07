import {
  Controller, Get, Post, Patch, Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeachingService } from './teaching.service';
import { CreateWorkoutPlanDto, UpdateProgressDto } from './dto/teaching.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Teaching')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teaching')
export class TeachingController {
  constructor(private readonly teachingService: TeachingService) {}

  @Get('my-schedules')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'HLV xem lịch dạy của mình (R3.1)' })
  getMySchedules(@CurrentUser('id') instructorUserId: string) {
    return this.teachingService.getMySchedules(instructorUserId);
  }

  @Get('my-students')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'HLV xem danh sách học viên (R3.2)' })
  getMyStudents(@CurrentUser('id') instructorUserId: string) {
    return this.teachingService.getMyStudents(instructorUserId);
  }

  @Post('workout-plans')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'HLV thiết kế bài tập & ghi nhận buổi tập (R3.4, R3.5)' })
  createWorkoutPlan(
    @CurrentUser('id') instructorUserId: string,
    @Body() dto: CreateWorkoutPlanDto,
  ) {
    return this.teachingService.createWorkoutPlan(instructorUserId, dto);
  }

  @Patch('workout-plans/:id/progress')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'HLV cập nhật tiến độ & gửi phản hồi cho học viên (R3.3, R3.7)' })
  updateProgress(
    @Param('id') id: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.teachingService.updateProgress(id, dto);
  }

  @Get('students/:memberId/progress')
  @ApiOperation({ summary: 'Xem tiến độ học tập của học viên' })
  getMemberProgress(@Param('memberId') memberId: string) {
    return this.teachingService.getMemberProgress(memberId);
  }
}
