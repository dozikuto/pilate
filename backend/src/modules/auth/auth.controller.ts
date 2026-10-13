import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { Response } from "express";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  VerifyAccountDto,
  ChangePasswordDto,
  AuthResponseDto,
} from "./dto/login.dto";
import { LocalAuthGuard } from "../../common/guards/local-auth.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User } from "../../entities/user.entity";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new account (role=member by default)" })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  @ApiResponse({ status: 409, description: "Email already registered" })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify account (UC1.2)" })
  async verifyAccount(@Body() dto: VerifyAccountDto) {
    return this.authService.verifyAccount(dto.email, dto.code);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Change password (UC1.6)" })
  async changePassword(
    @CurrentUser("id") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @Put("change-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePasswordPut(
    @CurrentUser("id") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @Patch("change-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePasswordPatch(
    @CurrentUser("id") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @Post("login")
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Req() req: any) {
    return this.authService.login(req.user);
  }

  @Post("refresh")
  @UseGuards(AuthGuard("jwt-refresh"))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: "Tokens refreshed",
    type: AuthResponseDto,
  })
  async refresh(@Req() req: any) {
    return this.authService.refresh(req.user);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Logout and invalidate refresh token" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  async logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get current authenticated user info" })
  @ApiResponse({ status: 200, description: "Current user info" })
  async getMe(@CurrentUser() user: User) {
    return this.authService.getMe(user.id);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Redirect to Google OAuth login" })
  googleAuth() {}

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  @ApiOperation({ summary: "Google OAuth callback" })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const tokens = req.user;
    const webAdminUrl = process.env.WEB_ADMIN_URL || "http://localhost:3000";
    res.redirect(
      `${webAdminUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }
}
