import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSocketConnectionEntity } from '../entities/websocket_connection.entity';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';

@Module({
    imports: [TypeOrmModule.forFeature([WebSocketConnectionEntity])],
    controllers: [RealtimeController],
    providers: [RealtimeService],
    exports: [RealtimeService],
})
export class RealtimeModule { }
