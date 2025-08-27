import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CommentsService, CreateCommentDto } from './comments.service';

@Controller('comments')
export class CommentsController {
    constructor(private readonly comments: CommentsService) { }

    @Post()
    async create(@Body() dto: CreateCommentDto) {
        return this.comments.create(dto);
    }

    @Get(':id')
    async get(@Param('id') id: string) {
        return this.comments.get(id);
    }

    @Get(':targetType/:targetId')
    async list(@Param('targetType') targetType: string, @Param('targetId') targetId: string) {
        return this.comments.list(targetType, targetId);
    }
}


