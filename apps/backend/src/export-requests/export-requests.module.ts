import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportRequestEntity } from '../entities/export_request.entity';
import { ExportRequestsController } from './export-requests.controller';
import { ExportRequestsService } from './export-requests.service';

@Module({
    imports: [TypeOrmModule.forFeature([ExportRequestEntity])],
    controllers: [ExportRequestsController],
    providers: [ExportRequestsService],
    exports: [ExportRequestsService],
})
export class ExportRequestsModule { }
