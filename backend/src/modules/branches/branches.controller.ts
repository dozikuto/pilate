import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto, CreateRoomDto } from './dto/create-branch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Branches')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all branches' })
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get branch details' })
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new branch' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update branch' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateBranchDto>) {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate branch' })
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }

  @Post(':id/rooms')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add room to branch' })
  addRoom(@Param('id') branchId: string, @Body() dto: CreateRoomDto) {
    return this.branchesService.addRoom(branchId, dto);
  }

  @Get(':id/rooms')
  @ApiOperation({ summary: 'Get rooms of branch' })
  getRooms(@Param('id') branchId: string) {
    return this.branchesService.getRooms(branchId);
  }
}
