import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoftLocksController } from './soft-locks.controller';
import { SoftLocksService } from './soft-locks.service';
import { SoftLockEntity } from '../entities/soft_lock.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SoftLockEntity])],
    controllers: [SoftLocksController],
    providers: [SoftLocksService],
    exports: [SoftLocksService]
})
export class SoftLocksModule { }
