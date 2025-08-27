import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportRequestEntity } from '../entities/export_request.entity';

@Injectable()
export class ExportRequestsService {
    constructor(
        @InjectRepository(ExportRequestEntity)
        private readonly repo: Repository<ExportRequestEntity>,
    ) { }

    async create(data: Partial<ExportRequestEntity>) {
        const exportRequest = this.repo.create(data);
        return this.repo.save(exportRequest);
    }

    async list(orgId: string, userId: string) {
        return this.repo.find({
            where: { orgId, userId },
            order: { createdAt: 'DESC' }
        });
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async update(id: string, data: Partial<ExportRequestEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async delete(id: string) {
        return this.repo.delete(id);
    }

    async exportToPdf(exportRequestId: string) {
        const exportRequest = await this.get(exportRequestId);
        if (!exportRequest || exportRequest.format !== 'pdf') {
            throw new BadRequestException('Invalid PDF export request');
        }

        try {
            await this.repo.update(exportRequestId, { status: 'processing' });

            // TODO: Call export worker to generate PDF
            const mockResult = {
                fileUrl: 'https://storage.example.com/exports/resume.pdf',
                fileSize: 245760,
                quality: exportRequest.config.quality || 'standard'
            };

            await this.repo.update(exportRequestId, {
                status: 'completed',
                result: mockResult,
                completedAt: new Date()
            });

            return mockResult;
        } catch (error) {
            await this.repo.update(exportRequestId, {
                status: 'failed',
                result: { errorMessage: error.message }
            });
            throw error;
        }
    }

    async exportToDocx(exportRequestId: string) {
        const exportRequest = await this.get(exportRequestId);
        if (!exportRequest || exportRequest.format !== 'docx') {
            throw new BadRequestException('Invalid DOCX export request');
        }

        try {
            await this.repo.update(exportRequestId, { status: 'processing' });

            // TODO: Call export worker to generate DOCX
            const mockResult = {
                fileUrl: 'https://storage.example.com/exports/resume.docx',
                fileSize: 189440,
                quality: exportRequest.config.quality || 'standard'
            };

            await this.repo.update(exportRequestId, {
                status: 'completed',
                result: mockResult,
                completedAt: new Date()
            });

            return mockResult;
        } catch (error) {
            await this.repo.update(exportRequestId, {
                status: 'failed',
                result: { errorMessage: error.message }
            });
            throw error;
        }
    }

    async exportToMarkdown(exportRequestId: string) {
        const exportRequest = await this.get(exportRequestId);
        if (!exportRequest || exportRequest.format !== 'markdown') {
            throw new BadRequestException('Invalid Markdown export request');
        }

        try {
            await this.repo.update(exportRequestId, { status: 'processing' });

            // TODO: Call export worker to generate Markdown
            const mockResult = {
                fileUrl: 'https://storage.example.com/exports/resume.md',
                fileSize: 15360,
                quality: 'standard'
            };

            await this.repo.update(exportRequestId, {
                status: 'completed',
                result: mockResult,
                completedAt: new Date()
            });

            return mockResult;
        } catch (error) {
            await this.repo.update(exportRequestId, {
                status: 'failed',
                result: { errorMessage: error.message }
            });
            throw error;
        }
    }

    async exportToGoogleDocs(exportRequestId: string) {
        const exportRequest = await this.get(exportRequestId);
        if (!exportRequest || exportRequest.format !== 'google_docs') {
            throw new BadRequestException('Invalid Google Docs export request');
        }

        try {
            await this.repo.update(exportRequestId, { status: 'processing' });

            // TODO: Call Google Docs API to create document
            const mockResult = {
                googleDocsUrl: 'https://docs.google.com/document/d/1ABC123/edit',
                fileSize: 0,
                quality: 'standard'
            };

            await this.repo.update(exportRequestId, {
                status: 'completed',
                result: mockResult,
                completedAt: new Date()
            });

            return mockResult;
        } catch (error) {
            await this.repo.update(exportRequestId, {
                status: 'failed',
                result: { errorMessage: error.message }
            });
            throw error;
        }
    }

    async exportToEmail(exportRequestId: string) {
        const exportRequest = await this.get(exportRequestId);
        if (!exportRequest || exportRequest.format !== 'email') {
            throw new BadRequestException('Invalid Email export request');
        }

        if (!exportRequest.config.emailTo) {
            throw new BadRequestException('Email address is required for email export');
        }

        try {
            await this.repo.update(exportRequestId, { status: 'processing' });

            // TODO: Call email service to send resume
            const mockResult = {
                emailSent: true,
                fileSize: 245760,
                quality: 'standard'
            };

            await this.repo.update(exportRequestId, {
                status: 'completed',
                result: mockResult,
                completedAt: new Date()
            });

            return mockResult;
        } catch (error) {
            await this.repo.update(exportRequestId, {
                status: 'failed',
                result: { errorMessage: error.message }
            });
            throw error;
        }
    }

    async getExportStatus(exportRequestId: string) {
        const exportRequest = await this.get(exportRequestId);
        if (!exportRequest) {
            throw new BadRequestException('Export request not found');
        }

        return {
            id: exportRequest.id,
            status: exportRequest.status,
            format: exportRequest.format,
            createdAt: exportRequest.createdAt,
            completedAt: exportRequest.completedAt,
            result: exportRequest.result
        };
    }

    async retryExport(exportRequestId: string) {
        const exportRequest = await this.get(exportRequestId);
        if (!exportRequest) {
            throw new BadRequestException('Export request not found');
        }

        if (exportRequest.status !== 'failed') {
            throw new BadRequestException('Can only retry failed exports');
        }

        // Reset status and retry based on format
        await this.repo.update(exportRequestId, {
            status: 'pending',
            result: null,
            completedAt: null
        });

        switch (exportRequest.format) {
            case 'pdf':
                return this.exportToPdf(exportRequestId);
            case 'docx':
                return this.exportToDocx(exportRequestId);
            case 'markdown':
                return this.exportToMarkdown(exportRequestId);
            case 'google_docs':
                return this.exportToGoogleDocs(exportRequestId);
            case 'email':
                return this.exportToEmail(exportRequestId);
            default:
                throw new BadRequestException('Unsupported export format');
        }
    }
}
