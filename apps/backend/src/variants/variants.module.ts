import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';
import { VariantEntity } from '../entities/variant.entity';

@Module({
    imports: [TypeOrmModule.forFeature([VariantEntity])],
    controllers: [VariantsController],
    providers: [VariantsService],
    exports: [VariantsService],
})
export class VariantsModule { }


