import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { MembersService } from "./members.service";
import { CreateMemberDto, UpdateMemberDto } from "./dto/create-member.dto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "../../common/enums/user-role.enum";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { MemberPackageSettingsService } from '../packages/member-package-settings.service';
import { PackagePreferencesDto } from '../packages/dto/member-package-settings.dto';

@ApiTags("Members")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService, private readonly packageSettings: MemberPackageSettingsService) {}

  @Patch('me/packages/:id/preferences')
  @Roles(UserRole.MEMBER)
  updatePreferences(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PackagePreferencesDto, @CurrentUser('id') userId: string) {
    return this.packageSettings.update(id, dto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Get all members with pagination and search" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["active", "inactive", "expired"],
  })
  findAll(@Query() pagination: PaginationDto) {
    return this.membersService.findAll(pagination, pagination.status);
  }

  @Get("me")
  @Roles(UserRole.MEMBER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Get current member profile" })
  getProfile(@CurrentUser("id") userId: string) {
    return this.membersService.findByUserId(userId);
  }

  @Put("me")
  @Roles(UserRole.MEMBER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Update current member profile" })
  updateMyProfile(
    @CurrentUser("id") userId: string,
    @Body() body: UpdateMemberDto,
  ) {
    return this.membersService.updateProfileByUserId(userId, body);
  }

  @Patch("me")
  @Roles(UserRole.MEMBER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  updateMyProfilePatch(
    @CurrentUser("id") userId: string,
    @Body() body: UpdateMemberDto,
  ) {
    return this.membersService.updateProfileByUserId(userId, body);
  }

  @Get("me/packages")
  @Roles(UserRole.MEMBER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Get current member packages" })
  getMyPackages(@CurrentUser("id") userId: string) {
    return this.membersService.getMyPackages(userId);
  }

  @Post("me/packages")
  @Roles(UserRole.MEMBER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Purchase/assign package for current member" })
  purchasePackage(@CurrentUser("id") userId: string, @Body() body: any) {
    return this.membersService.purchasePackage(userId, body);
  }

  @Get("me/stats")
  @Roles(UserRole.MEMBER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Get dashboard stats for current member" })
  getMyStats(@CurrentUser("id") userId: string) {
    return this.membersService.getMyStats(userId);
  }

  @Get("me/attendance")
  @Roles(UserRole.MEMBER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Get attendance history for current member" })
  getMyAttendance(
    @CurrentUser("id") userId: string,
    @Query("limit") limit = 5,
  ) {
    return this.membersService.getMyAttendance(userId, Number(limit) || 5);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: "Get member details by ID" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.membersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Create a new member" })
  create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: "Update member profile" })
  update(@Param("id") id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Deactivate member" })
  remove(@Param("id") id: string) {
    return this.membersService.remove(id);
  }

  @Get(":id/qr-code")
  @ApiOperation({ summary: "Get QR Code data and image for member" })
  getQrCode(@Param("id") id: string) {
    return this.membersService.getQrCodeImage(id);
  }
}
