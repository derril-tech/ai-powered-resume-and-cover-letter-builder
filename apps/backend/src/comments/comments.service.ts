import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity } from '../entities/comment.entity';

@Injectable()
export class CommentsService {
    constructor(
        @InjectRepository(CommentEntity)
        private readonly repo: Repository<CommentEntity>,
    ) { }

    async create(data: Partial<CommentEntity>) {
        const comment = this.repo.create(data);
        return this.repo.save(comment);
    }

    async update(id: string, data: Partial<CommentEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async delete(id: string) {
        return this.repo.delete(id);
    }

    async listByVariant(variantId: string, orgId: string, filters?: {
        type?: string;
        isResolved?: boolean;
        parentId?: string | null;
    }) {
        const query = this.repo.createQueryBuilder('comment')
            .where('comment.variantId = :variantId', { variantId })
            .andWhere('comment.orgId = :orgId', { orgId });

        if (filters?.type) {
            query.andWhere('comment.type = :type', { type: filters.type });
        }

        if (filters?.isResolved !== undefined) {
            query.andWhere('comment.isResolved = :isResolved', { isResolved: filters.isResolved });
        }

        if (filters?.parentId !== undefined) {
            query.andWhere('comment.parentId = :parentId', { parentId: filters.parentId });
        }

        return query.orderBy('comment.createdAt', 'ASC').getMany();
    }

    async getThread(commentId: string) {
        const comment = await this.get(commentId);
        if (!comment) {
            throw new BadRequestException('Comment not found');
        }

        // Get all comments in the thread (parent and all replies)
        const threadComments = await this.repo
            .createQueryBuilder('comment')
            .where('comment.orgId = :orgId', { orgId: comment.orgId })
            .andWhere('comment.variantId = :variantId', { variantId: comment.variantId })
            .andWhere(
                '(comment.id = :commentId OR comment.parentId = :commentId OR comment.id = :parentId)',
                {
                    commentId,
                    parentId: comment.parentId || commentId
                }
            )
            .orderBy('comment.createdAt', 'ASC')
            .getMany();

        return threadComments;
    }

    async addReply(parentId: string, data: Partial<CommentEntity>) {
        const parent = await this.get(parentId);
        if (!parent) {
            throw new BadRequestException('Parent comment not found');
        }

        const reply = this.repo.create({
            ...data,
            parentId,
            variantId: parent.variantId,
            orgId: parent.orgId
        });

        return this.repo.save(reply);
    }

    async resolveComment(id: string, resolvedBy: string) {
        const comment = await this.get(id);
        if (!comment) {
            throw new BadRequestException('Comment not found');
        }

        await this.repo.update(id, {
            isResolved: true,
            resolvedAt: new Date(),
            resolvedBy
        });

        return this.get(id);
    }

    async unresolveComment(id: string) {
        const comment = await this.get(id);
        if (!comment) {
            throw new BadRequestException('Comment not found');
        }

        await this.repo.update(id, {
            isResolved: false,
            resolvedAt: null,
            resolvedBy: null
        });

        return this.get(id);
    }

    async getCommentsByAnchor(variantId: string, orgId: string, anchor: {
        section: string;
        field?: string;
    }) {
        return this.repo
            .createQueryBuilder('comment')
            .where('comment.variantId = :variantId', { variantId })
            .andWhere('comment.orgId = :orgId', { orgId })
            .andWhere('comment.anchor->>\'section\' = :section', { section: anchor.section })
            .andWhere(anchor.field ? 'comment.anchor->>\'field\' = :field' : '1=1', { field: anchor.field })
            .orderBy('comment.createdAt', 'ASC')
            .getMany();
    }

    async getCommentsBySection(variantId: string, orgId: string, section: string) {
        return this.repo
            .createQueryBuilder('comment')
            .where('comment.variantId = :variantId', { variantId })
            .andWhere('comment.orgId = :orgId', { orgId })
            .andWhere('comment.anchor->>\'section\' = :section', { section })
            .orderBy('comment.createdAt', 'ASC')
            .getMany();
    }

    async getUnresolvedComments(variantId: string, orgId: string) {
        return this.repo
            .createQueryBuilder('comment')
            .where('comment.variantId = :variantId', { variantId })
            .andWhere('comment.orgId = :orgId', { orgId })
            .andWhere('comment.isResolved = :isResolved', { isResolved: false })
            .orderBy('comment.createdAt', 'ASC')
            .getMany();
    }

    async getCommentsByUser(userId: string, orgId: string) {
        return this.repo
            .createQueryBuilder('comment')
            .where('comment.userId = :userId', { userId })
            .andWhere('comment.orgId = :orgId', { orgId })
            .orderBy('comment.createdAt', 'DESC')
            .getMany();
    }

    async getCommentsByAssignee(assigneeId: string, orgId: string) {
        return this.repo
            .createQueryBuilder('comment')
            .where('comment.orgId = :orgId', { orgId })
            .andWhere('comment.metadata->>\'assignee\' = :assigneeId', { assigneeId })
            .orderBy('comment.createdAt', 'DESC')
            .getMany();
    }

    async searchComments(variantId: string, orgId: string, query: string) {
        return this.repo
            .createQueryBuilder('comment')
            .where('comment.variantId = :variantId', { variantId })
            .andWhere('comment.orgId = :orgId', { orgId })
            .andWhere(
                '(comment.title ILIKE :query OR comment.body ILIKE :query)',
                { query: `%${query}%` }
            )
            .orderBy('comment.createdAt', 'DESC')
            .getMany();
    }

    async getCommentStats(variantId: string, orgId: string) {
        const stats = await this.repo
            .createQueryBuilder('comment')
            .select([
                'comment.type',
                'comment.isResolved',
                'COUNT(*) as count'
            ])
            .where('comment.variantId = :variantId', { variantId })
            .andWhere('comment.orgId = :orgId', { orgId })
            .groupBy('comment.type, comment.isResolved')
            .getRawMany();

        const totalComments = await this.repo.count({
            where: { variantId, orgId }
        });

        const resolvedComments = await this.repo.count({
            where: { variantId, orgId, isResolved: true }
        });

        const typeCounts = stats.reduce((acc, stat) => {
            const key = `${stat.comment_type}_${stat.comment_isResolved}`;
            acc[key] = parseInt(stat.count);
            return acc;
        }, {} as Record<string, number>);

        return {
            total: totalComments,
            resolved: resolvedComments,
            unresolved: totalComments - resolvedComments,
            byType: typeCounts
        };
    }

    async deleteThread(commentId: string) {
        const comment = await this.get(commentId);
        if (!comment) {
            throw new BadRequestException('Comment not found');
        }

        // Delete all comments in the thread
        await this.repo
            .createQueryBuilder()
            .delete()
            .where('orgId = :orgId', { orgId: comment.orgId })
            .andWhere('variantId = :variantId', { variantId: comment.variantId })
            .andWhere(
                '(id = :commentId OR parentId = :commentId OR id = :parentId)',
                {
                    commentId,
                    parentId: comment.parentId || commentId
                }
            )
            .execute();

        return { success: true, deletedCount: 1 };
    }
}
