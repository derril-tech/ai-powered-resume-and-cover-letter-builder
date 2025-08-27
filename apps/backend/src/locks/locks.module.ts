import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LockEntity } from '../entities/lock.entity';
import { LocksController } from './locks.controller';
import { LocksService } from './locks.service';

@Module({
    imports: [TypeOrmModule.forFeature([LockEntity])],
    controllers: [LocksController],
    providers: [LocksService],
    exports: [LocksService],
})
export class LocksModule { }


