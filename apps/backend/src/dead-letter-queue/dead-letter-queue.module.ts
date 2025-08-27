import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeadLetterQueueController } from './dead-letter-queue.controller';
import { DeadLetterQueueService } from './dead-letter-queue.service';
import { DeadLetterQueueEntity } from '../entities/dead_letter_queue.entity';

@Module({
    imports: [TypeOrmModule.forFeature([DeadLetterQueueEntity])],
    controllers: [DeadLetterQueueController],
    providers: [DeadLetterQueueService],
    exports: [DeadLetterQueueService]
})
export class DeadLetterQueueModule { }
