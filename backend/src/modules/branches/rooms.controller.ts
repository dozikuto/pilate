import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/create-branch.dto';
import { RoomType, RoomStatus } from '../../entities/room.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: 'Xem danh sách toàn bộ phòng tập & sức chứa' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'roomType', enum: RoomType, required: false })
  @ApiQuery({ name: 'status', enum: RoomStatus, required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('roomType') roomType?: RoomType,
    @Query('status') status?: RoomStatus,
    @Query('search') search?: string,
  ) {
    return this.branchesService.findAllRooms({ branchId, roomType, status, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết phòng tập' })
  findOne(@Param('id') id: string) {
    return this.branchesService.findOneRoom(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Tạo phòng tập mới (Cài đặt số lượng 1vs1, 1vs2, 1vs3, 1vs4 hoặc nhóm)' })
  create(@Body() dto: CreateRoomDto) {
    return this.branchesService.createRoom(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Cập nhật cấu hình phòng tập & sức chứa số người tập' })
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.branchesService.updateRoom(id, dto);
  }

  @Patch(':id/toggle')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Bật/tắt trạng thái hoạt động của phòng tập' })
  toggleActive(@Param('id') id: string) {
    return this.branchesService.toggleRoomActive(id);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Xóa phòng tập' })
  remove(@Param('id') id: string) {
    return this.branchesService.deleteRoom(id);
  }
}
