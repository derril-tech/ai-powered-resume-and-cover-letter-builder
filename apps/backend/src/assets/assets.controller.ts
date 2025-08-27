import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { AssetsService } from './assets.service';

class PresignUploadDto {
    filename!: string;
    contentType!: string;
}

@Controller('assets')
export class AssetsController {
    constructor(private readonly assets: AssetsService) { }

    @Post('presign-upload')
    async presignUpload(@Body() dto: PresignUploadDto) {
        return this.assets.presignUpload(dto);
    }

    @Get(':id')
    async getAsset(@Param('id') id: string) {
        return this.assets.getAsset(id);
    }

    @Get()
    async listAssets() {
        return this.assets.listAssets();
    }

    @Delete(':id')
    async deleteAsset(@Param('id') id: string) {
        return this.assets.deleteAsset(id);
    }
}


