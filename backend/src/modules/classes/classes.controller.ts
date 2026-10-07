import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto, CreateScheduleDto } from './dto/create-class.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Classes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('classes')
  @ApiOperation({ summary: 'Get all classes' })
  findAllClasses(@Query() pagination: PaginationDto) {
    return this.classesService.findAllClasses(pagination);
  }

  @Get('classes/:id')
  @ApiOperation({ summary: 'Get class details' })
  findOneClass(@Param('id') id: string) {
    return this.classesService.findOneClass(id);
  }

  @Post('classes')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new class' })
  createClass(@Body() dto: CreateClassDto) {
    return this.classesService.createClass(dto);
  }

  @Patch('classes/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update class' })
  updateClass(@Param('id') id: string, @Body() dto: Partial<CreateClassDto>) {
    return this.classesService.updateClass(id, dto);
  }

  @Delete('classes/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate class' })
  removeClass(@Param('id') id: string) {
    return this.classesService.removeClass(id);
  }

  @Get('schedules/upcoming')
  @ApiOperation({ summary: 'Get upcoming schedules for mobile dashboard' })
  findUpcomingSchedules(
    @Query('limit') limit = 3,
    @CurrentUser('id') userId?: string,
  ) {
    return this.classesService.findUpcoming(Number(limit) || 3, userId);
  }

  @Get('schedules')
  @ApiOperation({ summary: 'Get schedules with date range filtering' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'instructorId', required: false })
  findSchedules(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('instructorId') instructorId?: string,
    @Query('date') date?: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.classesService.findSchedules(startDate, endDate, instructorId, date, userId);
  }

  @Get('schedules/:id')
  @ApiOperation({ summary: 'Get schedule details' })
  findOneSchedule(@Param('id') id: string) {
    return this.classesService.findOneSchedule(id);
  }

  @Post('schedules')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Create new class schedule' })
  createSchedule(@Body() dto: CreateScheduleDto) {
    return this.classesService.createSchedule(dto);
  }

  @Patch('schedules/:id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update schedule' })
  updateSchedule(@Param('id') id: string, @Body() dto: Partial<CreateScheduleDto>) {
    return this.classesService.updateSchedule(id, dto);
  }

  @Delete('schedules/:id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Cancel schedule' })
  cancelSchedule(@Param('id') id: string) {
    return this.classesService.cancelSchedule(id);
  }

  @Get('schedules/:id/spots')
  @ApiOperation({ summary: 'Get spot booking layout and availability' })
  getScheduleSpots(@Param('id') id: string) {
    return this.classesService.getScheduleSpots(id);
  }

  @Post('schedules/:id/book')
  @Roles(UserRole.MEMBER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Book a class schedule directly' })
  bookSchedule(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.classesService.bookSchedule(id, userId);
  }

  @Delete('schedules/:id/book')
  @Roles(UserRole.MEMBER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Cancel booking for a class schedule' })
  cancelBooking(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.classesService.cancelBookingForSchedule(id, userId);
  }
}
