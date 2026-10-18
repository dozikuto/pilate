import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InstructorsService } from './instructors.service';
import { CreateInstructorDto, UpdateInstructorDto } from './dto/create-instructor.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Instructors')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('instructors')
export class InstructorsController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all instructors' })
  findAll(@Query() pagination: PaginationDto) {
    return this.instructorsService.findAll(pagination);
  }

  @Get('options')
  @ApiOperation({ summary: 'Danh sách HLV cho lịch học và đánh giá' })
  listOptions() {
    return this.instructorsService.listInstructors();
  }

  @Get(':userId/week')
  @ApiOperation({ summary: 'Xem lịch lớp theo HLV trong 7 ngày' })
  getWeek(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('weekStart') weekStart?: string,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.instructorsService.getInstructorWeek(userId, weekStart, currentUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get instructor details' })
  findOne(@Param('id') id: string) {
    return this.instructorsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new instructor' })
  create(@Body() dto: CreateInstructorDto) {
    return this.instructorsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update instructor' })
  update(@Param('id') id: string, @Body() dto: UpdateInstructorDto) {
    return this.instructorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate instructor' })
  remove(@Param('id') id: string) {
    return this.instructorsService.remove(id);
  }
}
