import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TeachingService } from './teaching.service';
import { CreateWorkoutPlanDto, UpdateWorkoutPlanDto, UpdateProgressDto, TeachingQueryDto, TeachingCheckInDto } from './dto/teaching.dto';
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

  @Get('schedules')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.RECEPTIONIST)
  getSchedules(@CurrentUser() user: any, @Query() query: TeachingQueryDto) {
    return this.teachingService.getSchedules(user, query);
  }

  @Get('my-schedules')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  getMySchedules(@CurrentUser() user: any) {
    return this.teachingService.getSchedules(user, { instructorId: user.id });
  }

  @Get('students')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.RECEPTIONIST)
  getStudents(@CurrentUser() user: any, @Query() query: TeachingQueryDto) {
    return this.teachingService.getStudents(user, query);
  }

  @Get('my-students')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  getMyStudents(@CurrentUser() user: any) {
    return this.teachingService.getStudents(user, { instructorId: user.id });
  }

  @Post('schedules/:id/check-in')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.RECEPTIONIST)
  checkIn(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Body() dto: TeachingCheckInDto) {
    return this.teachingService.checkIn(id, user, dto);
  }

  @Get('workout-plans')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.RECEPTIONIST)
  getWorkoutPlans(@CurrentUser() user: any, @Query() query: TeachingQueryDto) {
    return this.teachingService.getWorkoutPlans(user, query);
  }

  @Post('workout-plans')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  createWorkoutPlan(@CurrentUser() user: any, @Body() dto: CreateWorkoutPlanDto) {
    return this.teachingService.createWorkoutPlan(user, dto);
  }

  @Patch('workout-plans/:id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  updateWorkoutPlan(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Body() dto: UpdateWorkoutPlanDto) {
    return this.teachingService.updateWorkoutPlan(id, user, dto);
  }

  @Patch('workout-plans/:id/progress')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  updateProgress(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Body() dto: UpdateProgressDto) {
    return this.teachingService.updateWorkoutPlan(id, user, dto);
  }

  @Get('students/:memberId/progress')
  getMemberProgress(@Param('memberId', ParseUUIDPipe) memberId: string, @CurrentUser() user: any) {
    return this.teachingService.getMemberProgress(memberId, user);
  }
}
