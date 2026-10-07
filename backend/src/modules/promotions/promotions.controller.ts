import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, ApplyPromotionDto } from './dto/promotion.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'Xem danh sách chương trình khuyến mãi (R5.2)' })
  findAll(@Query() pagination: PaginationDto) {
    return this.promotionsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết khuyến mãi' })
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Tạo chương trình khuyến mãi mới (R5.2)' })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Kiểm tra và áp dụng mã khuyến mãi (R5.3)' })
  apply(@Body() dto: ApplyPromotionDto) {
    return this.promotionsService.applyPromotion(dto);
  }

  @Patch(':id/toggle')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Bật/tắt kích hoạt mã khuyến mãi' })
  toggleActive(@Param('id') id: string) {
    return this.promotionsService.toggleActive(id);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Xóa mã khuyến mãi' })
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }
}
