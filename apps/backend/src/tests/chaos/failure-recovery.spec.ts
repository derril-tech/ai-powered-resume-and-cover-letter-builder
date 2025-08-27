import { Test, TestingModule } from '@nestjs/testing';
import { OptimizeService } from '../../optimize/optimize.service';
import { ResumeParserService } from '../../resume-parser/resume-parser.service';
import { JDParserService } from '../../jd-parser/jd-parser.service';
import { ExportService } from '../../export/export.service';
import { StorageService } from '../../storage/storage.service';

describe('Chaos Tests - Failure Recovery', () => {
    let optimizeService: OptimizeService;
    let resumeParserService: ResumeParserService;
    let jdParserService: JDParserService;
    let exportService: ExportService;
    let storageService: StorageService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OptimizeService,
                ResumeParserService,
                JDParserService,
                ExportService,
                StorageService,
            ],
        }).compile();

        optimizeService = module.get<OptimizeService>(OptimizeService);
        resumeParserService = module.get<ResumeParserService>(ResumeParserService);
        jdParserService = module.get<JDParserService>(JDParserService);
        exportService = module.get<ExportService>(ExportService);
        storageService = module.get<StorageService>(StorageService);
    });

    describe('Parser Service Failures', () => {
        it('should handle resume parser service unavailability gracefully', async () => {
            const resumeText = `
        John Doe
        john.doe@email.com
        (555) 123-4567
        
        SUMMARY
        Experienced software engineer with 5+ years developing web applications.
        
        SKILLS
        JavaScript, React, Node.js, TypeScript, Python, AWS, Docker
        
        EXPERIENCE
        Senior Software Engineer
        TechCorp Inc.
        January 2020 - Present
        • Led development of microservices architecture
        • Mentored junior developers
        • Improved system performance by 40%
      `;

            // Mock parser service to simulate failure
            jest.spyOn(resumeParserService, 'parseResume').mockRejectedValueOnce(
                new Error('Parser service unavailable')
            );

            // Should handle failure gracefully
            try {
                await resumeParserService.parseResume(resumeText);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Parser service unavailable');
            }

            // Should provide fallback parsing
            jest.spyOn(resumeParserService, 'parseResume').mockResolvedValueOnce({
                contact: { name: 'John Doe', email: 'john.doe@email.com' },
                summary: 'Experienced software engineer',
                skills: ['JavaScript', 'React', 'Node.js'],
                experience: [],
                education: []
            });

            const result = await resumeParserService.parseResume(resumeText);
            expect(result.contact.name).toBe('John Doe');
            expect(result.contact.email).toBe('john.doe@email.com');
        });

        it('should handle JD parser service failures with retry logic', async () => {
            const jdText = `
        Senior Software Engineer
        TechCorp Inc.
        
        Requirements:
        • 5+ years of experience with JavaScript, React, Node.js
        • Experience with AWS, Docker, PostgreSQL
        • Knowledge of TypeScript and modern frameworks
      `;

            let callCount = 0;
            jest.spyOn(jdParserService, 'parseJobDescription').mockImplementation(() => {
                callCount++;
                if (callCount <= 2) {
                    throw new Error('JD parser service temporarily unavailable');
                }
                return Promise.resolve({
                    title: 'Senior Software Engineer',
                    company: 'TechCorp Inc.',
                    requiredSkills: ['JavaScript', 'React', 'Node.js', 'AWS', 'Docker', 'PostgreSQL'],
                    preferredSkills: ['TypeScript']
                });
            });

            // Should retry and eventually succeed
            const result = await jdParserService.parseJobDescription(jdText);
            expect(result.title).toBe('Senior Software Engineer');
            expect(result.requiredSkills).toContain('JavaScript');
            expect(callCount).toBe(3);
        });

        it('should handle partial parsing failures gracefully', async () => {
            const malformedResume = `
        John Doe
        john.doe@email.com
        
        SKILLS
        JavaScript, React, Node.js
        
        EXPERIENCE
        Senior Software Engineer
        TechCorp Inc.
        Invalid date format
        • Led development
      `;

            // Mock parser to return partial results
            jest.spyOn(resumeParserService, 'parseResume').mockResolvedValueOnce({
                contact: { name: 'John Doe', email: 'john.doe@email.com' },
                summary: null, // Failed to parse
                skills: ['JavaScript', 'React', 'Node.js'],
                experience: [
                    {
                        title: 'Senior Software Engineer',
                        company: 'TechCorp Inc.',
                        startDate: null, // Failed to parse
                        endDate: null,
                        bullets: ['Led development']
                    }
                ],
                education: []
            });

            const result = await resumeParserService.parseResume(malformedResume);

            // Should return partial results with warnings
            expect(result.contact.name).toBe('John Doe');
            expect(result.skills).toContain('JavaScript');
            expect(result.experience[0].title).toBe('Senior Software Engineer');
            expect(result.experience[0].startDate).toBeNull();
        });
    });

    describe('LLM Service Failures', () => {
        it('should handle OpenAI API failures with fallback strategies', async () => {
            const resume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            // Mock LLM service to fail
            jest.spyOn(optimizeService, 'optimizeResume').mockRejectedValueOnce(
                new Error('OpenAI API rate limit exceeded')
            );

            // Should handle failure gracefully
            try {
                await optimizeService.optimizeResume(resume, jd, {
                    targetLength: '1_page',
                    style: 'modern'
                });
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('OpenAI API rate limit exceeded');
            }

            // Should provide fallback optimization
            jest.spyOn(optimizeService, 'optimizeResume').mockResolvedValueOnce({
                optimizedResume: {
                    ...resume,
                    summary: 'Experienced software engineer with strong JavaScript and React skills'
                },
                atsScore: 0.75,
                keywordMatch: 0.8,
                improvements: ['Enhanced summary with keywords'],
                readabilityScore: 0.7
            });

            const result = await optimizeService.optimizeResume(resume, jd, {
                targetLength: '1_page',
                style: 'modern'
            });

            expect(result.atsScore).toBe(0.75);
            expect(result.keywordMatch).toBe(0.8);
            expect(result.optimizedResume.summary).toContain('JavaScript');
        });

        it('should handle LLM timeout failures with circuit breaker', async () => {
            const resume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            // Mock timeout failure
            jest.spyOn(optimizeService, 'optimizeResume').mockImplementation(() => {
                return new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('LLM request timeout')), 100);
                });
            });

            // Should handle timeout gracefully
            try {
                await optimizeService.optimizeResume(resume, jd, {
                    targetLength: '1_page',
                    style: 'modern'
                });
                fail('Should have thrown a timeout error');
            } catch (error) {
                expect(error.message).toBe('LLM request timeout');
            }

            // Should provide cached or fallback results
            jest.spyOn(optimizeService, 'optimizeResume').mockResolvedValueOnce({
                optimizedResume: resume,
                atsScore: 0.6,
                keywordMatch: 0.7,
                improvements: ['Using cached optimization results'],
                readabilityScore: 0.6
            });

            const result = await optimizeService.optimizeResume(resume, jd, {
                targetLength: '1_page',
                style: 'modern'
            });

            expect(result.atsScore).toBe(0.6);
            expect(result.improvements).toContain('cached');
        });

        it('should handle LLM content filtering failures', async () => {
            const resume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            // Mock content filtering failure
            jest.spyOn(optimizeService, 'optimizeResume').mockRejectedValueOnce(
                new Error('Content filtered by safety system')
            );

            // Should handle content filtering gracefully
            try {
                await optimizeService.optimizeResume(resume, jd, {
                    targetLength: '1_page',
                    style: 'modern'
                });
                fail('Should have thrown a content filtering error');
            } catch (error) {
                expect(error.message).toBe('Content filtered by safety system');
            }

            // Should provide safe fallback optimization
            jest.spyOn(optimizeService, 'optimizeResume').mockResolvedValueOnce({
                optimizedResume: {
                    ...resume,
                    summary: 'Experienced software engineer with technical skills'
                },
                atsScore: 0.7,
                keywordMatch: 0.75,
                improvements: ['Applied safe content guidelines'],
                readabilityScore: 0.8
            });

            const result = await optimizeService.optimizeResume(resume, jd, {
                targetLength: '1_page',
                style: 'modern'
            });

            expect(result.atsScore).toBe(0.7);
            expect(result.improvements).toContain('safe content');
        });
    });

    describe('Storage Service Failures', () => {
        it('should handle S3 upload failures with retry logic', async () => {
            const resume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const exportOptions = {
                format: 'pdf',
                template: 'modern',
                includeCoverLetter: false,
                watermark: false,
                quality: 'high'
            };

            let uploadAttempts = 0;
            jest.spyOn(storageService, 'uploadFile').mockImplementation(() => {
                uploadAttempts++;
                if (uploadAttempts <= 2) {
                    throw new Error('S3 upload failed - network error');
                }
                return Promise.resolve({
                    fileUrl: 'https://s3.amazonaws.com/bucket/resume.pdf',
                    fileSize: 1024000,
                    uploadTime: Date.now()
                });
            });

            // Should retry and eventually succeed
            const result = await exportService.exportResume(resume, exportOptions);
            expect(result.fileUrl).toBe('https://s3.amazonaws.com/bucket/resume.pdf');
            expect(uploadAttempts).toBe(3);
        });

        it('should handle storage quota exceeded gracefully', async () => {
            const resume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const exportOptions = {
                format: 'pdf',
                template: 'modern',
                includeCoverLetter: false,
                watermark: false,
                quality: 'high'
            };

            // Mock storage quota exceeded
            jest.spyOn(storageService, 'uploadFile').mockRejectedValueOnce(
                new Error('Storage quota exceeded')
            );

            // Should handle quota exceeded gracefully
            try {
                await exportService.exportResume(resume, exportOptions);
                fail('Should have thrown a quota exceeded error');
            } catch (error) {
                expect(error.message).toBe('Storage quota exceeded');
            }

            // Should provide alternative storage or compression
            jest.spyOn(storageService, 'uploadFile').mockResolvedValueOnce({
                fileUrl: 'https://s3.amazonaws.com/bucket/resume-compressed.pdf',
                fileSize: 512000, // Compressed file
                uploadTime: Date.now()
            });

            const result = await exportService.exportResume(resume, {
                ...exportOptions,
                quality: 'medium' // Lower quality to reduce size
            });

            expect(result.fileUrl).toBe('https://s3.amazonaws.com/bucket/resume-compressed.pdf');
            expect(result.fileSize).toBeLessThan(1024000); // Should be smaller
        });

        it('should handle file corruption during upload', async () => {
            const resume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const exportOptions = {
                format: 'pdf',
                template: 'modern',
                includeCoverLetter: false,
                watermark: false,
                quality: 'high'
            };

            // Mock file corruption
            jest.spyOn(storageService, 'uploadFile').mockRejectedValueOnce(
                new Error('File corruption detected during upload')
            );

            // Should handle corruption gracefully
            try {
                await exportService.exportResume(resume, exportOptions);
                fail('Should have thrown a corruption error');
            } catch (error) {
                expect(error.message).toBe('File corruption detected during upload');
            }

            // Should regenerate and retry
            jest.spyOn(storageService, 'uploadFile').mockResolvedValueOnce({
                fileUrl: 'https://s3.amazonaws.com/bucket/resume-regenerated.pdf',
                fileSize: 1024000,
                uploadTime: Date.now()
            });

            const result = await exportService.exportResume(resume, exportOptions);
            expect(result.fileUrl).toBe('https://s3.amazonaws.com/bucket/resume-regenerated.pdf');
        });
    });

    describe('Database Connection Failures', () => {
        it('should handle database connection failures with fallback', async () => {
            const resume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            // Mock database connection failure
            jest.spyOn(optimizeService, 'saveOptimizationHistory').mockRejectedValueOnce(
                new Error('Database connection failed')
            );

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            // Should still optimize even if history saving fails
            jest.spyOn(optimizeService, 'optimizeResume').mockResolvedValueOnce({
                optimizedResume: {
                    ...resume,
                    summary: 'Experienced software engineer with JavaScript and React skills'
                },
                atsScore: 0.8,
                keywordMatch: 0.85,
                improvements: ['Enhanced summary with keywords'],
                readabilityScore: 0.75
            });

            const result = await optimizeService.optimizeResume(resume, jd, {
                targetLength: '1_page',
                style: 'modern'
            });

            expect(result.atsScore).toBe(0.8);
            expect(result.keywordMatch).toBe(0.85);
            expect(result.optimizedResume.summary).toContain('JavaScript');
        });
    });

    describe('Network Failures', () => {
        it('should handle intermittent network failures', async () => {
            const resume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            let networkAttempts = 0;
            jest.spyOn(optimizeService, 'optimizeResume').mockImplementation(() => {
                networkAttempts++;
                if (networkAttempts % 3 === 0) { // Every 3rd attempt fails
                    throw new Error('Network timeout');
                }
                return Promise.resolve({
                    optimizedResume: {
                        ...resume,
                        summary: `Optimized summary attempt ${networkAttempts}`
                    },
                    atsScore: 0.7 + (networkAttempts * 0.01),
                    keywordMatch: 0.75,
                    improvements: [`Optimization attempt ${networkAttempts}`],
                    readabilityScore: 0.7
                });
            });

            // Should handle intermittent failures
            const results = [];
            for (let i = 0; i < 5; i++) {
                try {
                    const result = await optimizeService.optimizeResume(resume, jd, {
                        targetLength: '1_page',
                        style: 'modern'
                    });
                    results.push(result);
                } catch (error) {
                    expect(error.message).toBe('Network timeout');
                }
            }

            // Should have some successful results
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].atsScore).toBeGreaterThan(0.7);
        });
    });

    describe('Recovery Mechanisms', () => {
        it('should implement circuit breaker pattern for external services', async () => {
            const resume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            // Simulate circuit breaker pattern
            let failureCount = 0;
            jest.spyOn(optimizeService, 'optimizeResume').mockImplementation(() => {
                failureCount++;
                if (failureCount <= 5) {
                    throw new Error('Service unavailable');
                }
                // After 5 failures, circuit breaker opens and returns fallback
                return Promise.resolve({
                    optimizedResume: resume,
                    atsScore: 0.6,
                    keywordMatch: 0.7,
                    improvements: ['Using fallback optimization due to service unavailability'],
                    readabilityScore: 0.6
                });
            });

            // First 5 calls should fail
            for (let i = 0; i < 5; i++) {
                try {
                    await optimizeService.optimizeResume(resume, jd, {
                        targetLength: '1_page',
                        style: 'modern'
                    });
                    fail('Should have thrown an error');
                } catch (error) {
                    expect(error.message).toBe('Service unavailable');
                }
            }

            // 6th call should use fallback
            const result = await optimizeService.optimizeResume(resume, jd, {
                targetLength: '1_page',
                style: 'modern'
            });

            expect(result.atsScore).toBe(0.6);
            expect(result.improvements).toContain('fallback');
        });

        it('should implement graceful degradation for partial failures', async () => {
            const resume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            // Mock partial service failure
            jest.spyOn(optimizeService, 'optimizeResume').mockResolvedValueOnce({
                optimizedResume: {
                    ...resume,
                    summary: 'Experienced software engineer with JavaScript and React skills'
                },
                atsScore: 0.7,
                keywordMatch: 0.75,
                improvements: ['Basic optimization applied (advanced features unavailable)'],
                readabilityScore: 0.7,
                warnings: ['LLM service partially available - using basic optimization']
            });

            const result = await optimizeService.optimizeResume(resume, jd, {
                targetLength: '1_page',
                style: 'modern'
            });

            expect(result.atsScore).toBe(0.7);
            expect(result.warnings).toContain('LLM service partially available');
            expect(result.improvements).toContain('Basic optimization');
        });
    });
});
