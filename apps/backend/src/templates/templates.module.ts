import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateEntity } from '../entities/template.entity';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
    imports: [TypeOrmModule.forFeature([TemplateEntity])],
    controllers: [TemplatesController],
    providers: [TemplatesService],
    exports: [TemplatesService],
})
export class TemplatesModule { }
