import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
  ) {}

  async findAll(pagination: PaginationDto) {
    const where: any = {};
    if (pagination.search) {
      where['fullName'] = Like(`%${pagination.search}%`);
    }

    const [items, total] = await this.usersRepository.findAndCount({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      order: { [pagination.sort || 'createdAt']: pagination.order || 'DESC' },
      select: ['id', 'email', 'fullName', 'phone', 'role', 'isActive', 'avatarUrl', 'branchId', 'createdAt'],
    });

    return paginate(items, total, pagination);
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['member', 'instructor', 'branch'],
      select: ['id', 'email', 'fullName', 'phone', 'role', 'isActive', 'avatarUrl', 'branchId', 'createdAt', 'updatedAt'],
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepository.create({ ...dto, passwordHash });
    delete (user as any).password;
    await this.usersRepository.save(user);
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);

    if (dto.password) {
      (user as any).passwordHash = await bcrypt.hash(dto.password, 12);
      delete dto.password;
    }

    Object.assign(user, dto);
    await this.usersRepository.save(user);
    const { passwordHash, refreshTokenHash, ...result } = user;
    return result;
  }

  async remove(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    user.isActive = false;
    await this.usersRepository.save(user);
    return { message: 'User deactivated successfully' };
  }
}
