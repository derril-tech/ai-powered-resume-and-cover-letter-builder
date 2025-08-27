import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { LocksService, AcquireLockDto } from './locks.service';

@Controller('locks')
export class LocksController {
    constructor(private readonly locks: LocksService) { }

    @Post('acquire')
    async acquire(@Body() dto: AcquireLockDto) {
        return this.locks.acquire(dto);
    }

    @Delete(':id/:ownerId')
    async release(@Param('id') id: string, @Param('ownerId') ownerId: string) {
        return this.locks.release(id, ownerId);
    }

    @Get(':targetType/:targetId')
    async list(@Param('targetType') targetType: string, @Param('targetId') targetId: string) {
        return this.locks.list(targetType, targetId);
    }
}


