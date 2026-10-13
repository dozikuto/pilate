import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../../entities/branch.entity';
import { Room } from '../../entities/room.entity';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { RoomsController } from './rooms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, Room])],
  controllers: [BranchesController, RoomsController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
