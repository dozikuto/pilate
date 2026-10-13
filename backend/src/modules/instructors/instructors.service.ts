import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Instructor } from '../../entities/instructor.entity';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateInstructorDto, UpdateInstructorDto } from './dto/create-instructor.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class InstructorsService {
  constructor(
    @InjectRepository(Instructor)
    private instructorsRepository: Repository<Instructor>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(pagination: PaginationDto) {
    const qb = this.instructorsRepository
      .createQueryBuilder('instructor')
      .leftJoinAndSelect('instructor.user', 'user');

    if (pagination.search) {
      qb.where(
        'user.fullName ILIKE :search OR user.email ILIKE :search',
        { search: `%${pagination.search}%` },
      );
    }

    qb.skip(pagination.skip)
      .take(pagination.limit)
      .orderBy('instructor.createdAt', pagination.order || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, pagination);
  }

  async findOne(id: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new NotFoundException(`Instructor #${id} not found`);
    }
    const instructor = await this.instructorsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!instructor) throw new NotFoundException(`Instructor #${id} not found`);
    return instructor;
  }

  async create(dto: CreateInstructorDto) {
    const existing = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const defaultPassword = 'Coach@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const user = this.usersRepository.create({
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      passwordHash,
      role: UserRole.INSTRUCTOR,
      branchId: dto.branchId,
    });
    const savedUser = await this.usersRepository.save(user);

    const instructor = this.instructorsRepository.create({
      userId: savedUser.id,
      bio: dto.bio,
      certifications: dto.certifications,
      specializations: dto.specializations,
      hourlyRate: dto.hourlyRate,
      commissionRate: dto.commissionRate,
    });
    const savedInstructor = await this.instructorsRepository.save(instructor);
    return this.findOne(savedInstructor.id);
  }

  async update(id: string, dto: UpdateInstructorDto) {
    const instructor = await this.findOne(id);

    if (dto.fullName || dto.phone) {
      await this.usersRepository.update(instructor.userId, {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.phone && { phone: dto.phone }),
      });
    }

    await this.instructorsRepository.update(id, {
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.certifications !== undefined && { certifications: dto.certifications }),
      ...(dto.specializations !== undefined && { specializations: dto.specializations }),
      ...(dto.hourlyRate !== undefined && { hourlyRate: dto.hourlyRate }),
      ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
    });

    return this.findOne(id);
  }

  async remove(id: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return { success: true };
    }
    const instructor = await this.findOne(id);
    await this.usersRepository.update(instructor.userId, { isActive: false });
    return { success: true };
  }
}
