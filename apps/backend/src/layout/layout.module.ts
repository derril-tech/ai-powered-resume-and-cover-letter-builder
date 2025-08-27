import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LayoutControlEntity } from '../entities/layout_control.entity';
import { LayoutController } from './layout.controller';
import { LayoutService } from './layout.service';

@Module({
    imports: [TypeOrmModule.forFeature([LayoutControlEntity])],
    controllers: [LayoutController],
    providers: [LayoutService],
    exports: [LayoutService],
})
export class LayoutModule { }
