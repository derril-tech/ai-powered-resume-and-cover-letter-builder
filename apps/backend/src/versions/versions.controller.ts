import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { VersionsService } from './versions.service';

class SnapshotDto {
    snapshot!: Record<string, any>;
    label?: string;
}

@Controller('versions')
export class VersionsController {
    constructor(private readonly versions: VersionsService) { }

    @Post(':variantId')
    async snapshot(@Param('variantId') variantId: string, @Body() dto: SnapshotDto) {
        return this.versions.snapshot(variantId, dto.snapshot, dto.label);
    }

    @Get(':variantId')
    async list(@Param('variantId') variantId: string) {
        return this.versions.list(variantId);
    }

    @Get('get/:id')
    async get(@Param('id') id: string) {
        return this.versions.get(id);
    }
}


