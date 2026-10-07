import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Instructor } from '../../entities/instructor.entity';
import { User } from '../../entities/user.entity';
import { InstructorsService } from './instructors.service';
import { InstructorsController } from './instructors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Instructor, User])],
  controllers: [InstructorsController],
  providers: [InstructorsService],
  exports: [InstructorsService],
})
export class InstructorsModule {}
