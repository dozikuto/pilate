import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InstructorsService } from './instructors.service';
import { CreateInstructorDto, UpdateInstructorDto } from './dto/create-instructor.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

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
