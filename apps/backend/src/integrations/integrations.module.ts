import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationEntity } from '../entities/integration.entity';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
    imports: [TypeOrmModule.forFeature([IntegrationEntity])],
    controllers: [IntegrationsController],
    providers: [IntegrationsService],
    exports: [IntegrationsService],
})
export class IntegrationsModule { }
