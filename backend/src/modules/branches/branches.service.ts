import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../../entities/branch.entity';
import { Room, RoomType, RoomStatus } from '../../entities/room.entity';
import { CreateBranchDto, CreateRoomDto, UpdateRoomDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private branchesRepository: Repository<Branch>,
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) {}

  findAll() {
    return this.branchesRepository.find({
      relations: ['rooms'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string) {
    const branch = await this.branchesRepository.findOne({
      where: { id },
      relations: ['rooms'],
    });
    if (!branch) throw new NotFoundException(`Branch #${id} not found`);
    return branch;
  }

  create(dto: CreateBranchDto) {
    const branch = this.branchesRepository.create(dto);
    return this.branchesRepository.save(branch);
  }

  async update(id: string, dto: Partial<CreateBranchDto>) {
    await this.findOne(id);
    await this.branchesRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.branchesRepository.update(id, { isActive: false });
    return { success: true };
  }

  async addRoom(branchId: string, dto: CreateRoomDto) {
    await this.findOne(branchId);
    const room = this.roomsRepository.create({
      ...dto,
      branchId,
      roomType: dto.roomType || RoomType.GROUP,
      status: dto.status || RoomStatus.AVAILABLE,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return this.roomsRepository.save(room);
  }

  async getRooms(branchId: string) {
    return this.roomsRepository.find({
      where: { branchId },
      order: { name: 'ASC' },
    });
  }

  async findAllRooms(query?: {
    branchId?: string;
    roomType?: RoomType;
    status?: RoomStatus;
    search?: string;
  }) {
    const qb = this.roomsRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.branch', 'branch');

    if (query?.branchId) {
      qb.andWhere('room.branchId = :branchId', { branchId: query.branchId });
    }

    if (query?.roomType) {
      qb.andWhere('room.roomType = :roomType', { roomType: query.roomType });
    }

    if (query?.status) {
      qb.andWhere('room.status = :status', { status: query.status });
    }

    if (query?.search) {
      qb.andWhere('room.name ILIKE :search OR room.description ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('room.capacity', 'ASC').addOrderBy('room.name', 'ASC');
    return qb.getMany();
  }

  async findOneRoom(id: string) {
    const room = await this.roomsRepository.findOne({
      where: { id },
      relations: ['branch'],
    });
    if (!room) throw new NotFoundException(`Room #${id} not found`);
    return room;
  }

  async createRoom(dto: CreateRoomDto) {
    let targetBranchId = dto.branchId;
    if (!targetBranchId) {
      const firstBranch = await this.branchesRepository.findOne({ where: { isActive: true } });
      if (!firstBranch) throw new NotFoundException('Không tìm thấy chi nhánh nào để gán phòng tập');
      targetBranchId = firstBranch.id;
    }

    const room = this.roomsRepository.create({
      branchId: targetBranchId,
      name: dto.name,
      roomType: dto.roomType || RoomType.GROUP,
      capacity: Number(dto.capacity) || 1,
      status: dto.status || RoomStatus.AVAILABLE,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      amenities: dto.amenities || '',
      description: dto.description || '',
    });

    const saved = await this.roomsRepository.save(room);
    return this.findOneRoom(saved.id);
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    const room = await this.findOneRoom(id);

    if (dto.name !== undefined) room.name = dto.name;
    if (dto.branchId !== undefined) room.branchId = dto.branchId;
    if (dto.roomType !== undefined) room.roomType = dto.roomType;
    if (dto.capacity !== undefined) room.capacity = Number(dto.capacity);
    if (dto.status !== undefined) room.status = dto.status;
    if (dto.isActive !== undefined) room.isActive = dto.isActive;
    if (dto.amenities !== undefined) room.amenities = dto.amenities;
    if (dto.description !== undefined) room.description = dto.description;

    await this.roomsRepository.save(room);
    return this.findOneRoom(id);
  }

  async deleteRoom(id: string) {
    const room = await this.findOneRoom(id);
    await this.roomsRepository.remove(room);
    return { success: true, message: 'Đã xóa phòng tập thành công' };
  }

  async toggleRoomActive(id: string) {
    const room = await this.findOneRoom(id);
    room.isActive = !room.isActive;
    await this.roomsRepository.save(room);
    return this.findOneRoom(id);
  }
}
