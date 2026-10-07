import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../../entities/branch.entity';
import { Room } from '../../entities/room.entity';
import { CreateBranchDto, CreateRoomDto } from './dto/create-branch.dto';

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
    const room = this.roomsRepository.create({ ...dto, branchId });
    return this.roomsRepository.save(room);
  }

  async getRooms(branchId: string) {
    return this.roomsRepository.find({
      where: { branchId },
      order: { name: 'ASC' },
    });
  }
}
