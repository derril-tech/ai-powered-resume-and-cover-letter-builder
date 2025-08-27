import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SoftLockEntity } from '../entities/soft_lock.entity';

@Injectable()
export class SoftLocksService {
    constructor(
        @InjectRepository(SoftLockEntity)
        private readonly repo: Repository<SoftLockEntity>,
    ) { }

    async create(data: Partial<SoftLockEntity>) {
        const lock = this.repo.create(data);
        return this.repo.save(lock);
    }

    async update(id: string, data: Partial<SoftLockEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async delete(id: string) {
        return this.repo.delete(id);
    }

    async acquireLock(
        orgId: string,
        userId: string,
        variantId: string,
        lockType: 'edit' | 'review' | 'approval' | 'export',
        durationMinutes: number = 30,
        scope?: {
            sections?: string[];
            fields?: string[];
            readOnly?: boolean;
        },
        reason?: string
    ) {
        // Check if there's already a lock on this variant
        const existingLock = await this.getActiveLock(variantId, orgId);

        if (existingLock) {
            // If the lock is held by the same user, extend it
            if (existingLock.userId === userId) {
                return this.extendLock(existingLock.id, durationMinutes);
            }

            // If it's a different user, check if we can override based on lock type
            if (!this.canOverrideLock(existingLock.lockType, lockType)) {
                throw new ConflictException(`Cannot acquire ${lockType} lock. ${existingLock.lockType} lock is held by another user.`);
            }

            // Force release the existing lock
            await this.forceReleaseLock(existingLock.id, userId, 'Override by higher priority lock');
        }

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

        const lock = this.repo.create({
            orgId,
            userId,
            variantId,
            lockType,
            scope,
            reason,
            acquiredAt: new Date(),
            expiresAt
        });

        return this.repo.save(lock);
    }

    async releaseLock(lockId: string, userId: string) {
        const lock = await this.get(lockId);
        if (!lock) {
            throw new BadRequestException('Lock not found');
        }

        if (lock.userId !== userId) {
            throw new BadRequestException('Cannot release lock held by another user');
        }

        await this.repo.update(lockId, {
            releasedAt: new Date(),
            releasedBy: userId
        });

        return this.get(lockId);
    }

    async forceReleaseLock(lockId: string, releasedBy: string, reason?: string) {
        const lock = await this.get(lockId);
        if (!lock) {
            throw new BadRequestException('Lock not found');
        }

        await this.repo.update(lockId, {
            releasedAt: new Date(),
            releasedBy,
            reason: reason || 'Force released by admin'
        });

        return this.get(lockId);
    }

    async extendLock(lockId: string, additionalMinutes: number = 30) {
        const lock = await this.get(lockId);
        if (!lock) {
            throw new BadRequestException('Lock not found');
        }

        if (lock.releasedAt) {
            throw new BadRequestException('Cannot extend a released lock');
        }

        const newExpiresAt = new Date(lock.expiresAt);
        newExpiresAt.setMinutes(newExpiresAt.getMinutes() + additionalMinutes);

        await this.repo.update(lockId, {
            expiresAt: newExpiresAt
        });

        return this.get(lockId);
    }

    async getActiveLock(variantId: string, orgId: string) {
        return this.repo
            .createQueryBuilder('lock')
            .where('lock.variantId = :variantId', { variantId })
            .andWhere('lock.orgId = :orgId', { orgId })
            .andWhere('lock.releasedAt IS NULL')
            .andWhere('lock.expiresAt > :now', { now: new Date() })
            .orderBy('lock.acquiredAt', 'DESC')
            .getOne();
    }

    async getLocksByVariant(variantId: string, orgId: string) {
        return this.repo
            .createQueryBuilder('lock')
            .where('lock.variantId = :variantId', { variantId })
            .andWhere('lock.orgId = :orgId', { orgId })
            .orderBy('lock.acquiredAt', 'DESC')
            .getMany();
    }

    async getLocksByUser(userId: string, orgId: string) {
        return this.repo
            .createQueryBuilder('lock')
            .where('lock.userId = :userId', { userId })
            .andWhere('lock.orgId = :orgId', { orgId })
            .andWhere('lock.releasedAt IS NULL')
            .andWhere('lock.expiresAt > :now', { now: new Date() })
            .orderBy('lock.acquiredAt', 'DESC')
            .getMany();
    }

    async getExpiredLocks() {
        return this.repo
            .createQueryBuilder('lock')
            .where('lock.releasedAt IS NULL')
            .andWhere('lock.expiresAt <= :now', { now: new Date() })
            .getMany();
    }

    async cleanupExpiredLocks() {
        const result = await this.repo
            .createQueryBuilder()
            .update(SoftLockEntity)
            .set({
                releasedAt: new Date(),
                reason: 'Expired automatically'
            })
            .where('releasedAt IS NULL')
            .andWhere('expiresAt <= :now', { now: new Date() })
            .execute();

        return { success: true, releasedCount: result.affected || 0 };
    }

    async updateActivity(lockId: string, action: string) {
        const lock = await this.get(lockId);
        if (!lock) {
            throw new BadRequestException('Lock not found');
        }

        const metadata = lock.metadata || {};
        const activity = metadata.activity || {};

        activity.lastAction = action;
        activity.lastActionAt = new Date();
        activity.actionCount = (activity.actionCount || 0) + 1;

        metadata.activity = activity;

        await this.repo.update(lockId, { metadata });
        return this.get(lockId);
    }

    async checkLockPermission(
        variantId: string,
        orgId: string,
        userId: string,
        action: string
    ) {
        const activeLock = await this.getActiveLock(variantId, orgId);

        if (!activeLock) {
            return { hasPermission: true, lock: null };
        }

        // If the user holds the lock, they have permission
        if (activeLock.userId === userId) {
            return { hasPermission: true, lock: activeLock };
        }

        // Check if the action is allowed based on lock type and scope
        const isAllowed = this.isActionAllowed(activeLock, action);

        return {
            hasPermission: isAllowed,
            lock: activeLock,
            reason: isAllowed ? null : `Action blocked by ${activeLock.lockType} lock`
        };
    }

    async getLockStats(orgId: string) {
        const stats = await this.repo
            .createQueryBuilder('lock')
            .select([
                'lock.lockType',
                'lock.releasedAt',
                'COUNT(*) as count'
            ])
            .where('lock.orgId = :orgId', { orgId })
            .groupBy('lock.lockType, lock.releasedAt')
            .getRawMany();

        const totalLocks = await this.repo.count({
            where: { orgId }
        });

        const activeLocks = await this.repo.count({
            where: { orgId, releasedAt: null }
        });

        const expiredLocks = await this.repo.count({
            where: { orgId, releasedAt: null }
        });

        const typeCounts = stats.reduce((acc, stat) => {
            const key = `${stat.lock_lockType}_${stat.lock_releasedAt ? 'released' : 'active'}`;
            acc[key] = parseInt(stat.count);
            return acc;
        }, {} as Record<string, number>);

        return {
            total: totalLocks,
            active: activeLocks,
            expired: expiredLocks,
            byType: typeCounts
        };
    }

    private canOverrideLock(existingType: string, newType: string): boolean {
        const priority = {
            'edit': 1,
            'review': 2,
            'approval': 3,
            'export': 4
        };

        return priority[newType as keyof typeof priority] > priority[existingType as keyof typeof priority];
    }

    private isActionAllowed(lock: SoftLockEntity, action: string): boolean {
        // Read-only actions are generally allowed
        if (['view', 'read', 'preview'].includes(action)) {
            return true;
        }

        // If lock has read-only scope, only read actions are allowed
        if (lock.scope?.readOnly) {
            return false;
        }

        // Check if action is within the lock scope
        if (lock.scope?.sections || lock.scope?.fields) {
            // TODO: Implement more granular permission checking based on sections/fields
            return true;
        }

        return false;
    }
}
