import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { User } from "../../entities/user.entity";
import { Member } from "../../entities/member.entity";
import { UserRole } from "../../common/enums/user-role.enum";
import { RegisterDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(Member) private membersRepository: Repository<Member>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { email, isActive: true },
    });
    if (!user || !user.passwordHash || !user.isVerified) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    return isMatch ? user : null;
  }

  async register(dto: RegisterDto) {
    if (
      dto.confirmPassword !== undefined &&
      dto.confirmPassword !== dto.password
    ) {
      throw new BadRequestException("Mật khẩu xác nhận không khớp");
    }
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepository.create({
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      passwordHash,
      role: UserRole.MEMBER,
      isActive: true,
    });
    await this.usersRepository.save(user);

    const member = this.membersRepository.create({
      userId: user.id,
      qrCode: `PLT-${uuidv4().substring(0, 8).toUpperCase()}`,
    });
    await this.membersRepository.save(member);

    return this.generateTokens(user);
  }

  async login(user: User) {
    return this.generateTokens(user);
  }

  async refresh(user: User) {
    return this.generateTokens(user);
  }

  async logout(userId: string) {
    await this.usersRepository.update(userId, { refreshTokenHash: null });
    return { message: "Logged out successfully" };
  }

  async verifyAccount(email: string, code: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (!user.verificationCode || user.verificationCode !== code) {
      throw new UnauthorizedException("Invalid verification code");
    }
    user.isVerified = true;
    user.verificationCode = null;
    await this.usersRepository.save(user);
    return { success: true, message: "Tài khoản đã được xác thực thành công" };
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new NotFoundException("User not found");
    }
    const isMatch = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException("Mật khẩu hiện tại không chính xác");
    }
    user.passwordHash = await bcrypt.hash(newPass, 12);
    await this.usersRepository.save(user);
    return { success: true, message: "Đổi mật khẩu thành công" };
  }

  async getMe(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ["member", "instructor"],
    });
    if (!user) throw new NotFoundException("User not found");
    const { passwordHash, refreshTokenHash, ...result } = user;
    return {
      ...result,
      memberCode: user.member?.qrCode || null,
      memberId: user.member?.id || null,
    };
  }

  async findOrCreateGoogleUser(googleUser: {
    email: string;
    fullName: string;
    avatarUrl?: string;
    googleId: string;
  }) {
    let user = await this.usersRepository.findOne({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = this.usersRepository.create({
        email: googleUser.email,
        fullName: googleUser.fullName,
        avatarUrl: googleUser.avatarUrl,
        googleId: googleUser.googleId,
        role: UserRole.MEMBER,
        isActive: true,
      });
      await this.usersRepository.save(user);

      const member = this.membersRepository.create({
        userId: user.id,
        qrCode: `PLT-${uuidv4().substring(0, 8).toUpperCase()}`,
      });
      await this.membersRepository.save(member);
    } else {
      user.googleId = googleUser.googleId;
      if (googleUser.avatarUrl && !user.avatarUrl) {
        user.avatarUrl = googleUser.avatarUrl;
      }
      await this.usersRepository.save(user);
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>("jwt.accessSecret"),
      expiresIn: this.configService.get<string>("jwt.accessExpiry"),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>("jwt.refreshSecret"),
      expiresIn: this.configService.get<string>("jwt.refreshExpiry"),
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(user.id, { refreshTokenHash });

    const member = await this.membersRepository.findOne({
      where: { userId: user.id },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        memberCode:
          member?.qrCode || `PLT-${user.id.substring(0, 8).toUpperCase()}`,
        memberId: member?.id,
      },
    };
  }
}
