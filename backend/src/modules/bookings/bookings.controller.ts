import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { BookingsService } from "./bookings.service";
import {
  CreateBookingDto,
  CancelBookingDto,
  UpdateBookingStatusDto,
} from "./dto/create-booking.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { BookingQueryDto } from "./dto/create-booking.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/enums/user-role.enum";

@ApiTags("Bookings")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: "Get all bookings with filters" })
  @ApiQuery({ name: "scheduleId", required: false })
  @ApiQuery({ name: "memberId", required: false })
  findAll(
    @Query() pagination: BookingQueryDto,
    @Query("scheduleId") scheduleId?: string,
    @Query("memberId") memberId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.bookingsService.findAll(pagination, scheduleId, memberId, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get booking details" })
  findOne(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.bookingsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: "Create a new booking" })
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: any) {
    return this.bookingsService.create(dto, user);
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel a booking" })
  cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: any,
  ) {
    return this.bookingsService.cancel(id, dto, user);
  }

  @Patch(":id/status")
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Update booking status (Admin/Staff)" })
  updateStatus(@Param("id") id: string, @Body() dto: UpdateBookingStatusDto) {
    return this.bookingsService.updateStatus(id, dto);
  }
}
