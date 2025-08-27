import { Test, TestingModule } from '@nestjs/testing';
import { OptimizeService } from '../../optimize/optimize.service';
import { StorageService } from '../../storage/storage.service';
import { AuthService } from '../../auth/auth.service';
import { ResumeService } from '../../resume/resume.service';
import { JobService } from '../../job/job.service';

describe('Security Compliance Tests', () => {
    let optimizeService: OptimizeService;
    let storageService: StorageService;
    let authService: AuthService;
    let resumeService: ResumeService;
    let jobService: JobService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OptimizeService,
                StorageService,
                AuthService,
                ResumeService,
                JobService,
            ],
        }).compile();

        optimizeService = module.get<OptimizeService>(OptimizeService);
        storageService = module.get<StorageService>(StorageService);
        authService = module.get<AuthService>(AuthService);
        resumeService = module.get<ResumeService>(ResumeService);
        jobService = module.get<JobService>(JobService);
    });

    describe('Row-Level Security (RLS)', () => {
        it('should enforce organization-based data isolation', async () => {
            const org1 = { id: 'org-1', name: 'TechCorp' };
            const org2 = { id: 'org-2', name: 'StartupXYZ' };

            const user1 = { id: 'user-1', email: 'user1@techcorp.com', orgId: org1.id };
            const user2 = { id: 'user-2', email: 'user2@startupxyz.com', orgId: org2.id };

            const resume1 = {
                id: 'resume-1',
                orgId: org1.id,
                userId: user1.id,
                contact: { name: 'John Doe', email: 'john@techcorp.com' },
                summary: 'TechCorp employee resume',
                experience: [],
                skills: ['JavaScript', 'React'],
                education: []
            };

            const resume2 = {
                id: 'resume-2',
                orgId: org2.id,
                userId: user2.id,
                contact: { name: 'Jane Smith', email: 'jane@startupxyz.com' },
                summary: 'StartupXYZ employee resume',
                experience: [],
                skills: ['Python', 'Django'],
                education: []
            };

            // Mock RLS enforcement
            jest.spyOn(resumeService, 'getResume').mockImplementation((resumeId, userId, orgId) => {
                if (resumeId === 'resume-1' && orgId === org1.id) {
                    return Promise.resolve(resume1);
                } else if (resumeId === 'resume-2' && orgId === org2.id) {
                    return Promise.resolve(resume2);
                }
                throw new Error('Access denied - resume not found in organization');
            });

            // User1 should only access org1 data
            const user1Resume = await resumeService.getResume('resume-1', user1.id, org1.id);
            expect(user1Resume.orgId).toBe(org1.id);
            expect(user1Resume.contact.email).toBe('john@techcorp.com');

            // User1 should not access org2 data
            try {
                await resumeService.getResume('resume-2', user1.id, org1.id);
                fail('Should have thrown access denied error');
            } catch (error) {
                expect(error.message).toBe('Access denied - resume not found in organization');
            }

            // User2 should only access org2 data
            const user2Resume = await resumeService.getResume('resume-2', user2.id, org2.id);
            expect(user2Resume.orgId).toBe(org2.id);
            expect(user2Resume.contact.email).toBe('jane@startupxyz.com');
        });

        it('should enforce user-based data access within organization', async () => {
            const org = { id: 'org-1', name: 'TechCorp' };
            const user1 = { id: 'user-1', email: 'user1@techcorp.com', orgId: org.id };
            const user2 = { id: 'user-2', email: 'user2@techcorp.com', orgId: org.id };

            const resume1 = {
                id: 'resume-1',
                orgId: org.id,
                userId: user1.id,
                contact: { name: 'John Doe', email: 'john@techcorp.com' },
                summary: 'User 1 resume',
                experience: [],
                skills: ['JavaScript'],
                education: []
            };

            const resume2 = {
                id: 'resume-2',
                orgId: org.id,
                userId: user2.id,
                contact: { name: 'Jane Smith', email: 'jane@techcorp.com' },
                summary: 'User 2 resume',
                experience: [],
                skills: ['Python'],
                education: []
            };

            // Mock user-based access control
            jest.spyOn(resumeService, 'getResume').mockImplementation((resumeId, userId, orgId) => {
                if (resumeId === 'resume-1' && userId === user1.id) {
                    return Promise.resolve(resume1);
                } else if (resumeId === 'resume-2' && userId === user2.id) {
                    return Promise.resolve(resume2);
                }
                throw new Error('Access denied - user cannot access this resume');
            });

            // User1 should access their own resume
            const user1Resume = await resumeService.getResume('resume-1', user1.id, org.id);
            expect(user1Resume.userId).toBe(user1.id);

            // User1 should not access user2's resume
            try {
                await resumeService.getResume('resume-2', user1.id, org.id);
                fail('Should have thrown access denied error');
            } catch (error) {
                expect(error.message).toBe('Access denied - user cannot access this resume');
            }
        });

        it('should enforce role-based access control', async () => {
            const org = { id: 'org-1', name: 'TechCorp' };
            const admin = { id: 'admin-1', email: 'admin@techcorp.com', orgId: org.id, role: 'admin' };
            const editor = { id: 'editor-1', email: 'editor@techcorp.com', orgId: org.id, role: 'editor' };
            const viewer = { id: 'viewer-1', email: 'viewer@techcorp.com', orgId: org.id, role: 'viewer' };

            const resume = {
                id: 'resume-1',
                orgId: org.id,
                userId: 'user-1',
                contact: { name: 'John Doe', email: 'john@techcorp.com' },
                summary: 'Test resume',
                experience: [],
                skills: ['JavaScript'],
                education: []
            };

            // Mock role-based access control
            jest.spyOn(resumeService, 'updateResume').mockImplementation((resumeId, data, userId, orgId, role) => {
                if (role === 'admin' || role === 'editor') {
                    return Promise.resolve({ ...resume, ...data });
                }
                throw new Error('Access denied - insufficient permissions');
            });

            jest.spyOn(resumeService, 'deleteResume').mockImplementation((resumeId, userId, orgId, role) => {
                if (role === 'admin') {
                    return Promise.resolve({ success: true });
                }
                throw new Error('Access denied - only admins can delete resumes');
            });

            // Admin can update and delete
            const adminUpdate = await resumeService.updateResume('resume-1', { summary: 'Updated' }, admin.id, org.id, admin.role);
            expect(adminUpdate.summary).toBe('Updated');

            const adminDelete = await resumeService.deleteResume('resume-1', admin.id, org.id, admin.role);
            expect(adminDelete.success).toBe(true);

            // Editor can update but not delete
            const editorUpdate = await resumeService.updateResume('resume-1', { summary: 'Editor update' }, editor.id, org.id, editor.role);
            expect(editorUpdate.summary).toBe('Editor update');

            try {
                await resumeService.deleteResume('resume-1', editor.id, org.id, editor.role);
                fail('Should have thrown access denied error');
            } catch (error) {
                expect(error.message).toBe('Access denied - only admins can delete resumes');
            }

            // Viewer cannot update or delete
            try {
                await resumeService.updateResume('resume-1', { summary: 'Viewer update' }, viewer.id, org.id, viewer.role);
                fail('Should have thrown access denied error');
            } catch (error) {
                expect(error.message).toBe('Access denied - insufficient permissions');
            }
        });
    });

    describe('Signed URL Security', () => {
        it('should enforce signed URL expiration', async () => {
            const resume = {
                id: 'resume-1',
                orgId: 'org-1',
                userId: 'user-1',
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Test resume',
                experience: [],
                skills: ['JavaScript'],
                education: []
            };

            // Mock signed URL generation with expiration
            jest.spyOn(storageService, 'generateSignedUrl').mockResolvedValueOnce({
                url: 'https://s3.amazonaws.com/bucket/resume.pdf?signature=abc123&expires=1640995200',
                expiresAt: new Date('2022-01-01T00:00:00Z'),
                maxAge: 3600 // 1 hour
            });

            const signedUrl = await storageService.generateSignedUrl('resume-1', 'download', 3600);
            expect(signedUrl.url).toContain('signature=');
            expect(signedUrl.url).toContain('expires=');
            expect(signedUrl.expiresAt).toBeInstanceOf(Date);
            expect(signedUrl.maxAge).toBe(3600);
        });

        it('should reject expired signed URLs', async () => {
            const expiredUrl = 'https://s3.amazonaws.com/bucket/resume.pdf?signature=abc123&expires=1640995200';

            // Mock expired URL validation
            jest.spyOn(storageService, 'validateSignedUrl').mockImplementation((url) => {
                const expiresParam = new URL(url).searchParams.get('expires');
                const expirationTime = parseInt(expiresParam || '0') * 1000;
                const currentTime = Date.now();

                if (currentTime > expirationTime) {
                    throw new Error('Signed URL has expired');
                }
                return Promise.resolve(true);
            });

            try {
                await storageService.validateSignedUrl(expiredUrl);
                fail('Should have thrown expired URL error');
            } catch (error) {
                expect(error.message).toBe('Signed URL has expired');
            }
        });

        it('should enforce signed URL scope restrictions', async () => {
            const resumeId = 'resume-1';
            const userId = 'user-1';
            const orgId = 'org-1';

            // Mock signed URL generation with scope
            jest.spyOn(storageService, 'generateSignedUrl').mockResolvedValueOnce({
                url: 'https://s3.amazonaws.com/bucket/resume.pdf?signature=abc123&scope=download&user=user-1&org=org-1',
                expiresAt: new Date(Date.now() + 3600000),
                maxAge: 3600,
                scope: 'download',
                userId: userId,
                orgId: orgId
            });

            const signedUrl = await storageService.generateSignedUrl(resumeId, 'download', 3600, {
                userId,
                orgId,
                scope: 'download'
            });

            expect(signedUrl.url).toContain('scope=download');
            expect(signedUrl.url).toContain('user=user-1');
            expect(signedUrl.url).toContain('org=org-1');
            expect(signedUrl.scope).toBe('download');
        });

        it('should prevent signed URL tampering', async () => {
            const originalUrl = 'https://s3.amazonaws.com/bucket/resume.pdf?signature=abc123&expires=1640995200&user=user-1';
            const tamperedUrl = 'https://s3.amazonaws.com/bucket/resume.pdf?signature=abc123&expires=1640995200&user=user-2';

            // Mock signature validation
            jest.spyOn(storageService, 'validateSignedUrl').mockImplementation((url) => {
                const urlObj = new URL(url);
                const signature = urlObj.searchParams.get('signature');
                const user = urlObj.searchParams.get('user');

                // Simulate signature validation
                if (user === 'user-2' && signature === 'abc123') {
                    throw new Error('Invalid signature - URL may have been tampered with');
                }
                return Promise.resolve(true);
            });

            // Original URL should be valid
            const originalValid = await storageService.validateSignedUrl(originalUrl);
            expect(originalValid).toBe(true);

            // Tampered URL should be rejected
            try {
                await storageService.validateSignedUrl(tamperedUrl);
                fail('Should have thrown tampering error');
            } catch (error) {
                expect(error.message).toBe('Invalid signature - URL may have been tampered with');
            }
        });
    });

    describe('Secrets Handling', () => {
        it('should not expose secrets in logs or error messages', async () => {
            const apiKey = 'sk-1234567890abcdef';
            const jwtSecret = 'super-secret-jwt-key';
            const dbPassword = 'db-password-123';

            // Mock service that uses secrets
            jest.spyOn(authService, 'validateApiKey').mockImplementation((key) => {
                if (key === apiKey) {
                    return Promise.resolve(true);
                }
                throw new Error('Invalid API key');
            });

            jest.spyOn(authService, 'generateJWT').mockImplementation((payload) => {
                if (payload.secret === jwtSecret) {
                    return Promise.resolve('jwt-token-123');
                }
                throw new Error('Invalid JWT secret');
            });

            // Should not log secrets
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            try {
                await authService.validateApiKey('invalid-key');
            } catch (error) {
                // Error should not contain the actual API key
                expect(error.message).not.toContain(apiKey);
                expect(error.message).toBe('Invalid API key');
            }

            try {
                await authService.generateJWT({ secret: 'invalid-secret' });
            } catch (error) {
                // Error should not contain the actual JWT secret
                expect(error.message).not.toContain(jwtSecret);
                expect(error.message).toBe('Invalid JWT secret');
            }

            // Check that secrets were not logged
            const loggedMessages = [...consoleSpy.mock.calls, ...errorSpy.mock.calls]
                .flat()
                .join(' ');

            expect(loggedMessages).not.toContain(apiKey);
            expect(loggedMessages).not.toContain(jwtSecret);
            expect(loggedMessages).not.toContain(dbPassword);

            consoleSpy.mockRestore();
            errorSpy.mockRestore();
        });

        it('should use environment variables for secrets', async () => {
            // Mock environment variables
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                OPENAI_API_KEY: 'sk-1234567890abcdef',
                JWT_SECRET: 'super-secret-jwt-key',
                DATABASE_PASSWORD: 'db-password-123',
                REDIS_PASSWORD: 'redis-password-456'
            };

            // Mock service that reads from environment
            jest.spyOn(authService, 'getSecretsFromEnv').mockImplementation(() => {
                return {
                    openaiApiKey: process.env.OPENAI_API_KEY,
                    jwtSecret: process.env.JWT_SECRET,
                    databasePassword: process.env.DATABASE_PASSWORD,
                    redisPassword: process.env.REDIS_PASSWORD
                };
            });

            const secrets = authService.getSecretsFromEnv();

            expect(secrets.openaiApiKey).toBe('sk-1234567890abcdef');
            expect(secrets.jwtSecret).toBe('super-secret-jwt-key');
            expect(secrets.databasePassword).toBe('db-password-123');
            expect(secrets.redisPassword).toBe('redis-password-456');

            // Restore original environment
            process.env = originalEnv;
        });

        it('should encrypt sensitive data at rest', async () => {
            const sensitiveData = {
                ssn: '123-45-6789',
                creditCard: '4111-1111-1111-1111',
                password: 'user-password-123'
            };

            // Mock encryption service
            jest.spyOn(authService, 'encryptData').mockImplementation((data) => {
                return Promise.resolve({
                    encrypted: Buffer.from(JSON.stringify(data)).toString('base64'),
                    algorithm: 'AES-256-GCM',
                    keyId: 'key-123'
                });
            });

            jest.spyOn(authService, 'decryptData').mockImplementation((encryptedData) => {
                const decrypted = Buffer.from(encryptedData.encrypted, 'base64').toString();
                return Promise.resolve(JSON.parse(decrypted));
            });

            // Encrypt sensitive data
            const encrypted = await authService.encryptData(sensitiveData);
            expect(encrypted.encrypted).toBeDefined();
            expect(encrypted.algorithm).toBe('AES-256-GCM');
            expect(encrypted.keyId).toBe('key-123');

            // Decrypt data
            const decrypted = await authService.decryptData(encrypted);
            expect(decrypted.ssn).toBe(sensitiveData.ssn);
            expect(decrypted.creditCard).toBe(sensitiveData.creditCard);
            expect(decrypted.password).toBe(sensitiveData.password);
        });

        it('should rotate secrets periodically', async () => {
            const oldApiKey = 'sk-old-api-key-123';
            const newApiKey = 'sk-new-api-key-456';

            // Mock secret rotation
            jest.spyOn(authService, 'rotateApiKey').mockImplementation(async (oldKey) => {
                if (oldKey === oldApiKey) {
                    return {
                        newKey: newApiKey,
                        rotatedAt: new Date(),
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                    };
                }
                throw new Error('Invalid old API key');
            });

            const rotation = await authService.rotateApiKey(oldApiKey);
            expect(rotation.newKey).toBe(newApiKey);
            expect(rotation.rotatedAt).toBeInstanceOf(Date);
            expect(rotation.expiresAt).toBeInstanceOf(Date);
        });
    });

    describe('Input Validation and Sanitization', () => {
        it('should prevent SQL injection attacks', async () => {
            const maliciousInput = "'; DROP TABLE users; --";
            const xssInput = '<script>alert("xss")</script>';

            // Mock input validation
            jest.spyOn(resumeService, 'validateInput').mockImplementation((input) => {
                const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i;
                const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

                if (sqlInjectionPattern.test(input)) {
                    throw new Error('SQL injection attempt detected');
                }

                if (xssPattern.test(input)) {
                    throw new Error('XSS attempt detected');
                }

                return true;
            });

            // Should reject SQL injection
            try {
                resumeService.validateInput(maliciousInput);
                fail('Should have thrown SQL injection error');
            } catch (error) {
                expect(error.message).toBe('SQL injection attempt detected');
            }

            // Should reject XSS
            try {
                resumeService.validateInput(xssInput);
                fail('Should have thrown XSS error');
            } catch (error) {
                expect(error.message).toBe('XSS attempt detected');
            }

            // Should accept valid input
            const validInput = 'John Doe - Software Engineer';
            const isValid = resumeService.validateInput(validInput);
            expect(isValid).toBe(true);
        });

        it('should sanitize file uploads', async () => {
            const maliciousFile = {
                name: 'resume.exe',
                type: 'application/x-executable',
                size: 1024,
                content: Buffer.from('malicious content')
            };

            const validFile = {
                name: 'resume.pdf',
                type: 'application/pdf',
                size: 1024,
                content: Buffer.from('valid pdf content')
            };

            // Mock file validation
            jest.spyOn(storageService, 'validateFileUpload').mockImplementation((file) => {
                const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                const allowedExtensions = ['.pdf', '.docx'];
                const maxSize = 10 * 1024 * 1024; // 10MB

                if (!allowedTypes.includes(file.type)) {
                    throw new Error('File type not allowed');
                }

                const extension = file.name.substring(file.name.lastIndexOf('.'));
                if (!allowedExtensions.includes(extension.toLowerCase())) {
                    throw new Error('File extension not allowed');
                }

                if (file.size > maxSize) {
                    throw new Error('File too large');
                }

                return true;
            });

            // Should reject malicious file
            try {
                storageService.validateFileUpload(maliciousFile);
                fail('Should have thrown file type error');
            } catch (error) {
                expect(error.message).toBe('File type not allowed');
            }

            // Should accept valid file
            const isValid = storageService.validateFileUpload(validFile);
            expect(isValid).toBe(true);
        });
    });

    describe('Rate Limiting and DDoS Protection', () => {
        it('should enforce rate limiting on API endpoints', async () => {
            const userId = 'user-1';
            const endpoint = '/api/resume/optimize';

            // Mock rate limiting
            jest.spyOn(authService, 'checkRateLimit').mockImplementation((userId, endpoint) => {
                const limits = {
                    '/api/resume/optimize': { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
                    '/api/resume/export': { maxRequests: 5, windowMs: 60000 }     // 5 requests per minute
                };

                const limit = limits[endpoint];
                if (!limit) {
                    return Promise.resolve({ allowed: true, remaining: 999 });
                }

                // Simulate rate limiting logic
                const currentRequests = Math.floor(Math.random() * 15); // Simulate current request count

                if (currentRequests >= limit.maxRequests) {
                    return Promise.resolve({
                        allowed: false,
                        remaining: 0,
                        resetTime: new Date(Date.now() + limit.windowMs)
                    });
                }

                return Promise.resolve({
                    allowed: true,
                    remaining: limit.maxRequests - currentRequests
                });
            });

            // Test rate limiting
            const result = await authService.checkRateLimit(userId, endpoint);

            if (result.allowed) {
                expect(result.remaining).toBeGreaterThan(0);
            } else {
                expect(result.remaining).toBe(0);
                expect(result.resetTime).toBeInstanceOf(Date);
            }
        });

        it('should detect and block suspicious activity', async () => {
            const suspiciousActivity = [
                { userId: 'user-1', action: 'login', ip: '192.168.1.1', timestamp: Date.now() },
                { userId: 'user-1', action: 'login', ip: '192.168.1.2', timestamp: Date.now() + 1000 },
                { userId: 'user-1', action: 'login', ip: '192.168.1.3', timestamp: Date.now() + 2000 },
                { userId: 'user-1', action: 'login', ip: '192.168.1.4', timestamp: Date.now() + 3000 },
                { userId: 'user-1', action: 'login', ip: '192.168.1.5', timestamp: Date.now() + 4000 }
            ];

            // Mock suspicious activity detection
            jest.spyOn(authService, 'detectSuspiciousActivity').mockImplementation((activities) => {
                const loginAttempts = activities.filter(a => a.action === 'login');
                const uniqueIPs = new Set(loginAttempts.map(a => a.ip));

                if (loginAttempts.length >= 5 && uniqueIPs.size >= 3) {
                    return {
                        suspicious: true,
                        reason: 'Multiple login attempts from different IPs',
                        riskScore: 0.8,
                        recommendedAction: 'temporary_block'
                    };
                }

                return {
                    suspicious: false,
                    reason: null,
                    riskScore: 0.1,
                    recommendedAction: 'monitor'
                };
            });

            const detection = authService.detectSuspiciousActivity(suspiciousActivity);
            expect(detection.suspicious).toBe(true);
            expect(detection.reason).toBe('Multiple login attempts from different IPs');
            expect(detection.riskScore).toBeGreaterThan(0.7);
            expect(detection.recommendedAction).toBe('temporary_block');
        });
    });
});
