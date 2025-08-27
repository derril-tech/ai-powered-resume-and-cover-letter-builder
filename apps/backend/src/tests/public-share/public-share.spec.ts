# Created automatically by Cursor AI(2024 - 12 - 19)

import { Test, TestingModule } from '@nestjs/testing';
import { PublicShareService } from '../../public-share/public-share.service';
import { ResumeService } from '../../resume/resume.service';
import { CoverLetterService } from '../../cover-letter/cover-letter.service';
import { JobService } from '../../job/job.service';
import { ExportService } from '../../export/export.service';
import { StorageService } from '../../storage/storage.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicShareEntity } from '../../entities/public_share.entity';

describe('Public Share Service', () => {
    let service: PublicShareService;
    let resumeService: ResumeService;
    let coverLetterService: CoverLetterService;
    let jobService: JobService;
    let exportService: ExportService;
    let storageService: StorageService;
    let publicShareRepo: any;

    const mockOrgId = 'test-org-id';
    const mockUserId = 'test-user-id';
    const mockResourceId = 'test-resource-id';

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PublicShareService,
                {
                    provide: getRepositoryToken(PublicShareEntity),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                        find: jest.fn(),
                    },
                },
                {
                    provide: ResumeService,
                    useValue: {
                        getResume: jest.fn(),
                    },
                },
                {
                    provide: CoverLetterService,
                    useValue: {
                        getCoverLetter: jest.fn(),
                    },
                },
                {
                    provide: JobService,
                    useValue: {
                        getJob: jest.fn(),
                    },
                },
                {
                    provide: ExportService,
                    useValue: {
                        exportResume: jest.fn(),
                        exportCoverLetter: jest.fn(),
                        exportJobDescription: jest.fn(),
                    },
                },
                {
                    provide: StorageService,
                    useValue: {
                        getSignedUrl: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<PublicShareService>(PublicShareService);
        resumeService = module.get<ResumeService>(ResumeService);
        coverLetterService = module.get<CoverLetterService>(CoverLetterService);
        jobService = module.get<JobService>(JobService);
        exportService = module.get<ExportService>(ExportService);
        storageService = module.get<StorageService>(StorageService);
        publicShareRepo = module.get(getRepositoryToken(PublicShareEntity));
    });

    describe('Create Share Link', () => {
        it('should create a share link for resume', async () => {
            const createDto = {
                shareType: 'resume' as const,
                resourceId: mockResourceId,
                customSlug: 'my-resume',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                requirePassword: true,
                password: 'secret123',
                watermarkSettings: {
                    enabled: true,
                    text: 'Shared via Resume Builder',
                    position: 'bottom-right' as const,
                    opacity: 0.3,
                    fontSize: 16,
                    color: '#666666',
                    rotation: -45
                },
                accessSettings: {
                    allowDownload: true,
                    allowPrint: true,
                    allowCopy: false,
                    showAnalytics: true,
                    requireEmail: false,
                    maxViews: 100
                }
            };

            const mockResume = { id: mockResourceId, title: 'My Resume' };
            (resumeService.getResume as jest.Mock).mockResolvedValue(mockResume);

            const mockShareLink = {
                id: 'share-id',
                shareToken: 'abc123def456',
                customSlug: 'my-resume',
                expiresAt: createDto.expiresAt,
                isActive: true,
                analytics: {
                    totalViews: 0,
                    uniqueViews: 0,
                    downloads: 0,
                    prints: 0
                }
            };

            publicShareRepo.create.mockReturnValue(mockShareLink);
            publicShareRepo.save.mockResolvedValue(mockShareLink);

            const result = await service.createShareLink(mockOrgId, mockUserId, createDto);

            expect(result.shareToken).toBe('abc123def456');
            expect(result.shareUrl).toContain('/share/my-resume');
            expect(result.expiresAt).toEqual(createDto.expiresAt);
            expect(result.isActive).toBe(true);
        });

        it('should create a share link for cover letter', async () => {
            const createDto = {
                shareType: 'cover_letter' as const,
                resourceId: mockResourceId,
                watermarkSettings: {
                    enabled: false
                }
            };

            const mockCoverLetter = { id: mockResourceId, title: 'My Cover Letter' };
            (coverLetterService.getCoverLetter as jest.Mock).mockResolvedValue(mockCoverLetter);

            const mockShareLink = {
                id: 'share-id',
                shareToken: 'xyz789abc123',
                isActive: true,
                analytics: { totalViews: 0, uniqueViews: 0, downloads: 0, prints: 0 }
            };

            publicShareRepo.create.mockReturnValue(mockShareLink);
            publicShareRepo.save.mockResolvedValue(mockShareLink);

            const result = await service.createShareLink(mockOrgId, mockUserId, createDto);

            expect(result.shareToken).toBe('xyz789abc123');
            expect(result.isActive).toBe(true);
        });
    });

    describe('Access Control', () => {
        it('should allow access to valid share link', async () => {
            const mockShareLink = {
                id: 'share-id',
                shareToken: 'valid-token',
                isActive: true,
                requirePassword: false,
                shareType: 'resume',
                resourceId: mockResourceId,
                accessSettings: { maxViews: 100 },
                analytics: { totalViews: 50 }
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);

            const mockResume = { id: mockResourceId, title: 'My Resume' };
            (resumeService.getResume as jest.Mock).mockResolvedValue(mockResume);

            const result = await service.getSharedResource('valid-token');

            expect(result.resource).toEqual(mockResume);
            expect(result.shareSettings.watermark).toBeDefined();
            expect(result.shareSettings.access).toBeDefined();
        });

        it('should reject expired share link', async () => {
            const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
            const mockShareLink = {
                shareToken: 'expired-token',
                isActive: true,
                expiresAt: expiredDate
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);

            await expect(service.getSharedResource('expired-token')).rejects.toThrow('Share link has expired');
        });

        it('should reject inactive share link', async () => {
            const mockShareLink = {
                shareToken: 'inactive-token',
                isActive: false
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);

            await expect(service.getSharedResource('inactive-token')).rejects.toThrow('Share link is inactive');
        });

        it('should require password for protected share link', async () => {
            const mockShareLink = {
                shareToken: 'protected-token',
                isActive: true,
                requirePassword: true,
                password: '$2b$10$hashedpassword'
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);

            await expect(service.getSharedResource('protected-token')).rejects.toThrow('Password required');
        });

        it('should validate correct password', async () => {
            const mockShareLink = {
                shareToken: 'protected-token',
                isActive: true,
                requirePassword: true,
                password: '$2b$10$hashedpassword',
                shareType: 'resume',
                resourceId: mockResourceId,
                accessSettings: {},
                analytics: { totalViews: 0 }
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);

            const mockResume = { id: mockResourceId, title: 'My Resume' };
            (resumeService.getResume as jest.Mock).mockResolvedValue(mockResume);

            // Mock bcrypt.compare to return true for correct password
            jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

            const result = await service.getSharedResource('protected-token', 'correct-password');

            expect(result.resource).toEqual(mockResume);
        });

        it('should reject incorrect password', async () => {
            const mockShareLink = {
                shareToken: 'protected-token',
                isActive: true,
                requirePassword: true,
                password: '$2b$10$hashedpassword'
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);

            // Mock bcrypt.compare to return false for incorrect password
            jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);

            await expect(service.getSharedResource('protected-token', 'wrong-password')).rejects.toThrow('Invalid password');
        });

        it('should enforce max views limit', async () => {
            const mockShareLink = {
                shareToken: 'limited-token',
                isActive: true,
                requirePassword: false,
                accessSettings: { maxViews: 10 },
                analytics: { totalViews: 10 }
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);

            await expect(service.getSharedResource('limited-token')).rejects.toThrow('Maximum views limit reached');
        });
    });

    describe('Export with Watermarks', () => {
        it('should export resume with watermark', async () => {
            const mockShareLink = {
                shareToken: 'export-token',
                isActive: true,
                requirePassword: false,
                shareType: 'resume',
                resourceId: mockResourceId,
                accessSettings: { allowDownload: true },
                watermarkSettings: {
                    enabled: true,
                    text: 'Shared via Resume Builder',
                    position: 'bottom-right',
                    opacity: 0.3,
                    fontSize: 16,
                    color: '#666666',
                    rotation: -45
                }
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);

            const mockExportResult = {
                downloadUrl: 'https://storage.example.com/resume.pdf',
                filename: 'resume-123.pdf'
            };

            (exportService.exportResume as jest.Mock).mockResolvedValue(mockExportResult);

            const result = await service.exportSharedResource('export-token', 'pdf');

            expect(result.downloadUrl).toBe('https://storage.example.com/resume.pdf');
            expect(result.filename).toBe('resume-123.pdf');
            expect(exportService.exportResume).toHaveBeenCalledWith(
                mockResourceId,
                'pdf',
                mockShareLink.watermarkSettings
            );
        });

        it('should reject export when downloads disabled', async () => {
            const mockShareLink = {
                shareToken: 'no-download-token',
                isActive: true,
                requirePassword: false,
                accessSettings: { allowDownload: false }
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);

            await expect(service.exportSharedResource('no-download-token', 'pdf')).rejects.toThrow('Downloads are not allowed');
        });
    });

    describe('Analytics Tracking', () => {
        it('should track view events', async () => {
            const mockShareLink = {
                id: 'share-id',
                shareToken: 'track-token',
                isActive: true,
                requirePassword: false,
                shareType: 'resume',
                resourceId: mockResourceId,
                accessSettings: {},
                analytics: {
                    totalViews: 5,
                    uniqueViews: 3,
                    downloads: 1,
                    prints: 0,
                    viewerEmails: ['user1@example.com', 'user2@example.com']
                }
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);
            publicShareRepo.save.mockResolvedValue(mockShareLink);

            const mockResume = { id: mockResourceId, title: 'My Resume' };
            (resumeService.getResume as jest.Mock).mockResolvedValue(mockResume);

            await service.getSharedResource('track-token', undefined, 'user3@example.com');

            expect(publicShareRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                analytics: expect.objectContaining({
                    totalViews: 6,
                    uniqueViews: 4
                })
            }));
        });

        it('should track download events', async () => {
            const mockShareLink = {
                id: 'share-id',
                shareToken: 'download-token',
                isActive: true,
                requirePassword: false,
                shareType: 'resume',
                resourceId: mockResourceId,
                accessSettings: { allowDownload: true },
                analytics: { totalViews: 10, uniqueViews: 5, downloads: 2, prints: 1 }
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);
            publicShareRepo.save.mockResolvedValue(mockShareLink);

            (exportService.exportResume as jest.Mock).mockResolvedValue({
                downloadUrl: 'https://example.com/file.pdf',
                filename: 'resume.pdf'
            });

            await service.exportSharedResource('download-token', 'pdf');

            expect(publicShareRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                analytics: expect.objectContaining({
                    downloads: 3
                })
            }));
        });
    });

    describe('Share Link Management', () => {
        it('should get user share links', async () => {
            const mockShareLinks = [
                {
                    id: 'share-1',
                    shareToken: 'token-1',
                    customSlug: 'resume-1',
                    isActive: true,
                    analytics: { totalViews: 10, uniqueViews: 5, downloads: 2, prints: 1 }
                },
                {
                    id: 'share-2',
                    shareToken: 'token-2',
                    isActive: false,
                    analytics: { totalViews: 5, uniqueViews: 3, downloads: 1, prints: 0 }
                }
            ];

            publicShareRepo.find.mockResolvedValue(mockShareLinks);

            const result = await service.getUserShareLinks(mockOrgId, mockUserId);

            expect(result).toHaveLength(2);
            expect(result[0].shareUrl).toContain('/share/resume-1');
            expect(result[0].isActive).toBe(true);
            expect(result[1].isActive).toBe(false);
        });

        it('should deactivate share link', async () => {
            const mockShareLink = {
                id: 'share-id',
                orgId: mockOrgId,
                createdBy: mockUserId,
                isActive: true
            };

            publicShareRepo.findOne.mockResolvedValue(mockShareLink);
            publicShareRepo.save.mockResolvedValue({ ...mockShareLink, isActive: false });

            await service.deactivateShareLink(mockOrgId, mockUserId, 'share-id');

            expect(publicShareRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                isActive: false
            }));
        });
    });
});
