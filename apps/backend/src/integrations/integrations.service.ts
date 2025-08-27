import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationEntity } from '../entities/integration.entity';

@Injectable()
export class IntegrationsService {
    constructor(
        @InjectRepository(IntegrationEntity)
        private readonly repo: Repository<IntegrationEntity>,
    ) { }

    async create(data: Partial<IntegrationEntity>) {
        const integration = this.repo.create(data);
        return this.repo.save(integration);
    }

    async list(orgId: string, userId: string) {
        return this.repo.find({
            where: { orgId, userId, isActive: true },
            order: { createdAt: 'DESC' }
        });
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async update(id: string, data: Partial<IntegrationEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async delete(id: string) {
        return this.repo.update(id, { isActive: false });
    }

    async syncLinkedIn(integrationId: string) {
        const integration = await this.get(integrationId);
        if (!integration || integration.type !== 'linkedin') {
            throw new BadRequestException('Invalid LinkedIn integration');
        }

        try {
            // TODO: Call LinkedIn API to fetch profile data
            const mockProfileData = {
                name: 'John Doe',
                headline: 'Senior Software Engineer',
                summary: 'Experienced developer with 5+ years...',
                experience: [
                    {
                        title: 'Senior Software Engineer',
                        company: 'Tech Corp',
                        duration: '2020 - Present',
                        description: 'Led development of web applications...'
                    }
                ],
                education: [
                    {
                        degree: 'Bachelor of Science',
                        school: 'University of Technology',
                        year: '2019'
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js', 'Python']
            };

            await this.repo.update(integrationId, {
                metadata: {
                    profileData: mockProfileData,
                    syncStatus: 'completed',
                    lastSyncAt: new Date().toISOString()
                }
            });

            return mockProfileData;
        } catch (error) {
            await this.repo.update(integrationId, {
                metadata: {
                    syncStatus: 'failed',
                    errorMessage: error.message
                }
            });
            throw error;
        }
    }

    async importJsonResume(integrationId: string, jsonData: any) {
        const integration = await this.get(integrationId);
        if (!integration || integration.type !== 'json_resume') {
            throw new BadRequestException('Invalid JSON Resume integration');
        }

        try {
            // TODO: Parse and validate JSON Resume format
            const parsedData = this.parseJsonResume(jsonData);

            await this.repo.update(integrationId, {
                metadata: {
                    profileData: parsedData,
                    syncStatus: 'completed',
                    lastSyncAt: new Date().toISOString()
                }
            });

            return parsedData;
        } catch (error) {
            await this.repo.update(integrationId, {
                metadata: {
                    syncStatus: 'failed',
                    errorMessage: error.message
                }
            });
            throw error;
        }
    }

    async syncGoogleDrive(integrationId: string) {
        const integration = await this.get(integrationId);
        if (!integration || integration.type !== 'google_drive') {
            throw new BadRequestException('Invalid Google Drive integration');
        }

        try {
            // TODO: Call Google Drive API to fetch files
            const mockFileList = [
                {
                    id: 'file1',
                    name: 'resume.pdf',
                    mimeType: 'application/pdf',
                    modifiedTime: '2024-01-15T10:00:00Z'
                },
                {
                    id: 'file2',
                    name: 'cover-letter.docx',
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    modifiedTime: '2024-01-15T11:00:00Z'
                }
            ];

            await this.repo.update(integrationId, {
                metadata: {
                    fileInfo: mockFileList,
                    syncStatus: 'completed',
                    lastSyncAt: new Date().toISOString()
                }
            });

            return mockFileList;
        } catch (error) {
            await this.repo.update(integrationId, {
                metadata: {
                    syncStatus: 'failed',
                    errorMessage: error.message
                }
            });
            throw error;
        }
    }

    async syncDropbox(integrationId: string) {
        const integration = await this.get(integrationId);
        if (!integration || integration.type !== 'dropbox') {
            throw new BadRequestException('Invalid Dropbox integration');
        }

        try {
            // TODO: Call Dropbox API to fetch files
            const mockFileList = [
                {
                    id: 'file1',
                    name: 'resume.pdf',
                    path: '/Documents/resume.pdf',
                    modifiedTime: '2024-01-15T10:00:00Z'
                }
            ];

            await this.repo.update(integrationId, {
                metadata: {
                    fileInfo: mockFileList,
                    syncStatus: 'completed',
                    lastSyncAt: new Date().toISOString()
                }
            });

            return mockFileList;
        } catch (error) {
            await this.repo.update(integrationId, {
                metadata: {
                    syncStatus: 'failed',
                    errorMessage: error.message
                }
            });
            throw error;
        }
    }

    private parseJsonResume(jsonData: any) {
        // Basic JSON Resume format validation and parsing
        const requiredFields = ['basics', 'work', 'education'];
        for (const field of requiredFields) {
            if (!jsonData[field]) {
                throw new BadRequestException(`Missing required field: ${field}`);
            }
        }

        return {
            contact: {
                name: jsonData.basics.name,
                email: jsonData.basics.email,
                phone: jsonData.basics.phone,
                location: jsonData.basics.location,
                profiles: jsonData.basics.profiles
            },
            summary: jsonData.basics.summary,
            experience: jsonData.work.map((work: any) => ({
                title: work.position,
                company: work.name,
                location: work.location,
                startDate: work.startDate,
                endDate: work.endDate,
                description: work.summary,
                highlights: work.highlights || []
            })),
            education: jsonData.education.map((edu: any) => ({
                degree: edu.studyType,
                school: edu.institution,
                location: edu.location,
                startDate: edu.startDate,
                endDate: edu.endDate,
                gpa: edu.score
            })),
            skills: jsonData.skills?.map((skill: any) => ({
                name: skill.name,
                level: skill.level,
                keywords: skill.keywords || []
            })) || [],
            projects: jsonData.projects?.map((project: any) => ({
                name: project.name,
                description: project.description,
                highlights: project.highlights || [],
                keywords: project.keywords || [],
                startDate: project.startDate,
                endDate: project.endDate,
                url: project.url
            })) || []
        };
    }

    async getAuthUrl(type: string, redirectUri: string) {
        // TODO: Generate OAuth URLs for different providers
        const authUrls = {
            linkedin: `https://www.linkedin.com/oauth/v2/authorization?client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${redirectUri}&scope=r_liteprofile%20r_emailaddress&response_type=code`,
            google_drive: `https://accounts.google.com/oauth/authorize?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&scope=https://www.googleapis.com/auth/drive.readonly&response_type=code`,
            dropbox: `https://www.dropbox.com/oauth2/authorize?client_id=${process.env.DROPBOX_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code`
        };

        return authUrls[type as keyof typeof authUrls] || null;
    }

    async handleOAuthCallback(type: string, code: string, redirectUri: string) {
        // TODO: Handle OAuth callback and exchange code for tokens
        const mockTokens = {
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expires_in: 3600
        };

        return mockTokens;
    }
}
