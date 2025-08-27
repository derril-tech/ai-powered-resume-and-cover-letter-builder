# Created automatically by Cursor AI(2024 - 12 - 19)

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicShareEntity } from '../entities/public_share.entity';
import { PublicShareService } from './public-share.service';
import { PublicShareController } from './public-share.controller';
import { ResumeModule } from '../resume/resume.module';
import { CoverLetterModule } from '../cover-letter/cover-letter.module';
import { JobModule } from '../job/job.module';
import { ExportModule } from '../export/export.module';
import { StorageModule } from '../storage/storage.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([PublicShareEntity]),
        ResumeModule,
        CoverLetterModule,
        JobModule,
        ExportModule,
        StorageModule
    ],
    providers: [PublicShareService],
    controllers: [PublicShareController],
    exports: [PublicShareService]
})
export class PublicShareModule { }
