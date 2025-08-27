# Created automatically by Cursor AI(2024 - 12 - 19)

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicShareEntity } from '../entities/public_share.entity';
import { ResumeService } from '../resume/resume.service';
import { CoverLetterService } from '../cover-letter/cover-letter.service';
import { JobService } from '../job/job.service';
import { ExportService } from '../export/export.service';
import { StorageService } from '../storage/storage.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export interface CreateShareLinkDto {
    shareType: 'resume' | 'cover_letter' | 'job_description';
    resourceId: string;
    customSlug?: string;
    expiresAt?: Date;
    requirePassword?: boolean;
    password?: string;
    watermarkSettings?: {
        enabled: boolean;
        text?: string;
        position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
        opacity?: number;
        fontSize?: number;
        color?: string;
        rotation?: number;
    };
    accessSettings?: {
        allowDownload?: boolean;
        allowPrint?: boolean;
        allowCopy?: boolean;
        showAnalytics?: boolean;
        requireEmail?: boolean;
        maxViews?: number;
    };
}

export interface ShareLinkResponse {
    id: string;
    shareToken: string;
    shareUrl: string;
    expiresAt?: Date;
    isActive: boolean;
    analytics?: {
        totalViews: number;
        uniqueViews: number;
        downloads: number;
        prints: number;
    };
}

@Injectable()
export class PublicShareService {
    constructor(
        @InjectRepository(PublicShareEntity)
        private readonly publicShareRepo: Repository<PublicShareEntity>,
        private readonly resumeService: ResumeService,
        private readonly coverLetterService: CoverLetterService,
        private readonly jobService: JobService,
        private readonly exportService: ExportService,
        private readonly storageService: StorageService
    ) { }

    async createShareLink(
        orgId: string,
        userId: string,
        createDto: CreateShareLinkDto
    ): Promise<ShareLinkResponse> {
        // Validate resource exists and user has access
        await this.validateResourceAccess(orgId, userId, createDto.shareType, createDto.resourceId);

        // Generate unique share token
        const shareToken = this.generateShareToken();

        // Hash password if provided
        let hashedPassword: string | undefined;
        if (createDto.requirePassword && createDto.password) {
            hashedPassword = await bcrypt.hash(createDto.password, 10);
        }

        // Create share link
        const shareLink = this.publicShareRepo.create({
            orgId,
            createdBy: userId,
            shareType: createDto.shareType,
            resourceId: createDto.resourceId,
            shareToken,
            customSlug: createDto.customSlug,
            expiresAt: createDto.expiresAt,
            isActive: true,
            requirePassword: createDto.requirePassword ?? false,
            password: hashedPassword,
            watermarkSettings: {
                enabled: createDto.watermarkSettings?.enabled ?? true,
                text: createDto.watermarkSettings?.text ?? 'Shared via Resume Builder',
                position: createDto.watermarkSettings?.position ?? 'bottom-right',
                opacity: createDto.watermarkSettings?.opacity ?? 0.3,
                fontSize: createDto.watermarkSettings?.fontSize ?? 16,
                color: createDto.watermarkSettings?.color ?? '#666666',
                rotation: createDto.watermarkSettings?.rotation ?? -45
            },
            accessSettings: {
                allowDownload: createDto.accessSettings?.allowDownload ?? true,
                allowPrint: createDto.accessSettings?.allowPrint ?? true,
                allowCopy: createDto.accessSettings?.allowCopy ?? false,
                showAnalytics: createDto.accessSettings?.showAnalytics ?? true,
                requireEmail: createDto.accessSettings?.requireEmail ?? false,
                maxViews: createDto.accessSettings?.maxViews
            },
            analytics: {
                totalViews: 0,
                uniqueViews: 0,
                downloads: 0,
                prints: 0,
                viewerEmails: []
            }
        });

        const savedShare = await this.publicShareRepo.save(shareLink);

        return {
            id: savedShare.id,
            shareToken: savedShare.shareToken,
            shareUrl: this.generateShareUrl(savedShare.shareToken, savedShare.customSlug),
            expiresAt: savedShare.expiresAt,
            isActive: savedShare.isActive,
            analytics: savedShare.analytics
        };
    }

    async getShareLink(shareToken: string, password?: string): Promise<PublicShareEntity> {
        const shareLink = await this.publicShareRepo.findOne({ where: { shareToken } });

        if (!shareLink) {
            throw new NotFoundException('Share link not found');
        }

        if (!shareLink.isActive) {
            throw new ForbiddenException('Share link is inactive');
        }

        if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
            throw new ForbiddenException('Share link has expired');
        }

        if (shareLink.requirePassword) {
            if (!password) {
                throw new ForbiddenException('Password required to access this share link');
            }

            const isValidPassword = await bcrypt.compare(password, shareLink.password!);
            if (!isValidPassword) {
                throw new ForbiddenException('Invalid password');
            }
        }

        // Check max views limit
        if (shareLink.accessSettings.maxViews &&
            shareLink.analytics &&
            shareLink.analytics.totalViews >= shareLink.accessSettings.maxViews) {
            throw new ForbiddenException('Maximum views limit reached');
        }

        return shareLink;
    }

    async getSharedResource(shareToken: string, password?: string, viewerEmail?: string) {
        const shareLink = await this.getShareLink(shareToken, password);

        // Track view
        await this.trackView(shareLink.id, viewerEmail);

        // Get the actual resource
        let resource: any;
        switch (shareLink.shareType) {
            case 'resume':
                resource = await this.resumeService.getResume(shareLink.resourceId);
                break;
            case 'cover_letter':
                resource = await this.coverLetterService.getCoverLetter(shareLink.resourceId);
                break;
            case 'job_description':
                resource = await this.jobService.getJob(shareLink.resourceId);
                break;
            default:
                throw new BadRequestException('Invalid share type');
        }

        return {
            resource,
            shareSettings: {
                watermark: shareLink.watermarkSettings,
                access: shareLink.accessSettings,
                analytics: shareLink.analytics
            }
        };
    }

    async exportSharedResource(
        shareToken: string,
        format: 'pdf' | 'docx' | 'markdown',
        password?: string
    ): Promise<{ downloadUrl: string; filename: string }> {
        const shareLink = await this.getShareLink(shareToken, password);

        if (!shareLink.accessSettings.allowDownload) {
            throw new ForbiddenException('Downloads are not allowed for this share link');
        }

        // Get the resource and export it
        const { resource } = await this.getSharedResource(shareToken, password);

        let exportResult: any;
        switch (shareLink.shareType) {
            case 'resume':
                exportResult = await this.exportService.exportResume(
                    resource.id,
                    format,
                    shareLink.watermarkSettings
                );
                break;
            case 'cover_letter':
                exportResult = await this.exportService.exportCoverLetter(
                    resource.id,
                    format,
                    shareLink.watermarkSettings
                );
                break;
            case 'job_description':
                exportResult = await this.exportService.exportJobDescription(
                    resource.id,
                    format
                );
                break;
        }

        // Track download
        await this.trackDownload(shareLink.id);

        return {
            downloadUrl: exportResult.downloadUrl,
            filename: exportResult.filename
        };
    }

    async updateShareLink(
        orgId: string,
        userId: string,
        shareId: string,
        updates: Partial<PublicShareEntity>
    ): Promise<ShareLinkResponse> {
        const shareLink = await this.publicShareRepo.findOne({
            where: { id: shareId, orgId, createdBy: userId }
        });

        if (!shareLink) {
            throw new NotFoundException('Share link not found or access denied');
        }

        // Update password if provided
        if (updates.password && updates.requirePassword) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }

        Object.assign(shareLink, updates);
        const updatedShare = await this.publicShareRepo.save(shareLink);

        return {
            id: updatedShare.id,
            shareToken: updatedShare.shareToken,
            shareUrl: this.generateShareUrl(updatedShare.shareToken, updatedShare.customSlug),
            expiresAt: updatedShare.expiresAt,
            isActive: updatedShare.isActive,
            analytics: updatedShare.analytics
        };
    }

    async deactivateShareLink(orgId: string, userId: string, shareId: string): Promise<void> {
        const shareLink = await this.publicShareRepo.findOne({
            where: { id: shareId, orgId, createdBy: userId }
        });

        if (!shareLink) {
            throw new NotFoundException('Share link not found or access denied');
        }

        shareLink.isActive = false;
        await this.publicShareRepo.save(shareLink);
    }

    async getShareAnalytics(orgId: string, userId: string, shareId: string) {
        const shareLink = await this.publicShareRepo.findOne({
            where: { id: shareId, orgId, createdBy: userId }
        });

        if (!shareLink) {
            throw new NotFoundException('Share link not found or access denied');
        }

        return shareLink.analytics;
    }

    async getUserShareLinks(orgId: string, userId: string): Promise<ShareLinkResponse[]> {
        const shareLinks = await this.publicShareRepo.find({
            where: { orgId, createdBy: userId },
            order: { createdAt: 'DESC' }
        });

        return shareLinks.map(share => ({
            id: share.id,
            shareToken: share.shareToken,
            shareUrl: this.generateShareUrl(share.shareToken, share.customSlug),
            expiresAt: share.expiresAt,
            isActive: share.isActive,
            analytics: share.analytics
        }));
    }

    private async validateResourceAccess(
        orgId: string,
        userId: string,
        shareType: string,
        resourceId: string
    ): Promise<void> {
        switch (shareType) {
            case 'resume':
                await this.resumeService.getResume(resourceId); // This will throw if not accessible
                break;
            case 'cover_letter':
                await this.coverLetterService.getCoverLetter(resourceId);
                break;
            case 'job_description':
                await this.jobService.getJob(resourceId);
                break;
            default:
                throw new BadRequestException('Invalid share type');
        }
    }

    private generateShareToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private generateShareUrl(shareToken: string, customSlug?: string): string {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const slug = customSlug || shareToken.substring(0, 8);
        return `${baseUrl}/share/${slug}`;
    }

    private async trackView(shareId: string, viewerEmail?: string): Promise<void> {
        const shareLink = await this.publicShareRepo.findOne({ where: { id: shareId } });
        if (!shareLink || !shareLink.analytics) return;

        shareLink.analytics.totalViews += 1;
        shareLink.analytics.lastViewedAt = new Date();

        // Track unique views (simplified - in production you'd use IP + user agent)
        if (viewerEmail && shareLink.analytics.viewerEmails) {
            if (!shareLink.analytics.viewerEmails.includes(viewerEmail)) {
                shareLink.analytics.viewerEmails.push(viewerEmail);
                shareLink.analytics.uniqueViews += 1;
            }
        }

        await this.publicShareRepo.save(shareLink);
    }

    private async trackDownload(shareId: string): Promise<void> {
        const shareLink = await this.publicShareRepo.findOne({ where: { id: shareId } });
        if (!shareLink || !shareLink.analytics) return;

        shareLink.analytics.downloads += 1;
        await this.publicShareRepo.save(shareLink);
    }

    async trackPrint(shareId: string): Promise<void> {
        const shareLink = await this.publicShareRepo.findOne({ where: { id: shareId } });
        if (!shareLink || !shareLink.analytics) return;

        shareLink.analytics.prints += 1;
        await this.publicShareRepo.save(shareLink);
    }
}
