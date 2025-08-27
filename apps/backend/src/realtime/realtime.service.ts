import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebSocketConnectionEntity } from '../entities/websocket_connection.entity';

@Injectable()
export class RealtimeService {
    constructor(
        @InjectRepository(WebSocketConnectionEntity)
        private readonly repo: Repository<WebSocketConnectionEntity>,
    ) { }

    async createConnection(data: Partial<WebSocketConnectionEntity>) {
        const connection = this.repo.create(data);
        return this.repo.save(connection);
    }

    async updateConnection(id: string, data: Partial<WebSocketConnectionEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async getByConnectionId(connectionId: string) {
        return this.repo.findOne({ where: { connectionId } });
    }

    async disconnectConnection(connectionId: string) {
        const connection = await this.getByConnectionId(connectionId);
        if (connection) {
            await this.repo.update(connection.id, {
                status: 'disconnected',
                disconnectedAt: new Date()
            });
        }
    }

    async updateActivity(connectionId: string, metadata: any) {
        const connection = await this.getByConnectionId(connectionId);
        if (connection) {
            await this.repo.update(connection.id, {
                metadata: {
                    ...connection.metadata,
                    ...metadata,
                    lastActivity: new Date()
                }
            });
        }
    }

    async getActiveConnections(orgId: string, userId?: string) {
        const query = this.repo.createQueryBuilder('connection')
            .where('connection.orgId = :orgId', { orgId })
            .andWhere('connection.status = :status', { status: 'connected' });

        if (userId) {
            query.andWhere('connection.userId = :userId', { userId });
        }

        return query.getMany();
    }

    async getPresence(orgId: string, projectId?: string) {
        const connections = await this.getActiveConnections(orgId);

        const presence = connections.reduce((acc, connection) => {
            const metadata = connection.metadata || {};
            const currentProject = metadata.currentProject;

            if (!projectId || currentProject === projectId) {
                if (!acc[connection.userId]) {
                    acc[connection.userId] = {
                        userId: connection.userId,
                        status: connection.status,
                        currentPage: metadata.currentPage,
                        currentProject: metadata.currentProject,
                        currentVariant: metadata.currentVariant,
                        lastActivity: metadata.lastActivity,
                        connectionCount: 0
                    };
                }
                acc[connection.userId].connectionCount++;
            }

            return acc;
        }, {} as Record<string, any>);

        return Object.values(presence);
    }

    // Mock methods for realtime features - these would integrate with actual WebSocket implementation
    async sendBulletSuggestions(userId: string, variantId: string, suggestions: any[]) {
        // TODO: Send bullet suggestions via WebSocket
        console.log(`Sending bullet suggestions to user ${userId} for variant ${variantId}:`, suggestions);
        return { success: true, suggestionsCount: suggestions.length };
    }

    async sendATSScoreUpdate(userId: string, variantId: string, score: number, details: any) {
        // TODO: Send ATS score updates via WebSocket
        console.log(`Sending ATS score update to user ${userId} for variant ${variantId}: ${score}%`);
        return { success: true, score, details };
    }

    async sendPresenceUpdate(orgId: string, userId: string, status: string, metadata: any) {
        // TODO: Broadcast presence updates to all users in the org
        console.log(`Broadcasting presence update for user ${userId} in org ${orgId}: ${status}`);
        return { success: true, userId, status, metadata };
    }

    async sendCollaborationUpdate(projectId: string, variantId: string, update: any) {
        // TODO: Send collaboration updates (comments, locks, etc.) to all users working on the variant
        console.log(`Sending collaboration update for variant ${variantId} in project ${projectId}:`, update);
        return { success: true, projectId, variantId, update };
    }

    async subscribeToVariant(userId: string, variantId: string) {
        // TODO: Subscribe user to realtime updates for a specific variant
        console.log(`User ${userId} subscribed to variant ${variantId}`);
        return { success: true, variantId };
    }

    async unsubscribeFromVariant(userId: string, variantId: string) {
        // TODO: Unsubscribe user from realtime updates for a specific variant
        console.log(`User ${userId} unsubscribed from variant ${variantId}`);
        return { success: true, variantId };
    }

    async broadcastToProject(projectId: string, event: string, data: any) {
        // TODO: Broadcast event to all users working on a project
        console.log(`Broadcasting ${event} to project ${projectId}:`, data);
        return { success: true, projectId, event, data };
    }

    async sendToUser(userId: string, event: string, data: any) {
        // TODO: Send event to specific user
        console.log(`Sending ${event} to user ${userId}:`, data);
        return { success: true, userId, event, data };
    }

    async sendToOrg(orgId: string, event: string, data: any) {
        // TODO: Send event to all users in an organization
        console.log(`Sending ${event} to org ${orgId}:`, data);
        return { success: true, orgId, event, data };
    }

    async getConnectionStats(orgId: string) {
        const stats = await this.repo
            .createQueryBuilder('connection')
            .select([
                'connection.status',
                'COUNT(*) as count'
            ])
            .where('connection.orgId = :orgId', { orgId })
            .groupBy('connection.status')
            .getRawMany();

        const totalConnections = await this.repo.count({
            where: { orgId }
        });

        const activeConnections = await this.repo.count({
            where: { orgId, status: 'connected' }
        });

        const statusCounts = stats.reduce((acc, stat) => {
            acc[stat.connection_status] = parseInt(stat.count);
            return acc;
        }, {} as Record<string, number>);

        return {
            total: totalConnections,
            active: activeConnections,
            byStatus: statusCounts
        };
    }
}
