import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariantVersionEntity } from '../entities/variant_version.entity';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';

@Module({
    imports: [TypeOrmModule.forFeature([VariantVersionEntity])],
    controllers: [VersionsController],
    providers: [VersionsService],
    exports: [VersionsService],
})
export class VersionsModule { }


