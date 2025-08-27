import { Test, TestingModule } from '@nestjs/testing';
import { OptimizeService } from '../../optimize/optimize.service';
import { ExportService } from '../../export/export.service';
import { ResumeParserService } from '../../resume-parser/resume-parser.service';
import { JDParserService } from '../../jd-parser/jd-parser.service';

describe('Batch Optimization Load Tests', () => {
    let optimizeService: OptimizeService;
    let exportService: ExportService;
    let resumeParserService: ResumeParserService;
    let jdParserService: JDParserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OptimizeService,
                ExportService,
                ResumeParserService,
                JDParserService,
            ],
        }).compile();

        optimizeService = module.get<OptimizeService>(OptimizeService);
        exportService = module.get<ExportService>(ExportService);
        resumeParserService = module.get<ResumeParserService>(ResumeParserService);
        jdParserService = module.get<JDParserService>(JDParserService);
    });

    describe('Batch Resume Optimization', () => {
        it('should handle 100 concurrent resume optimizations', async () => {
            const startTime = Date.now();
            const batchSize = 100;
            const concurrentLimit = 10; // Process 10 at a time to avoid overwhelming

            // Generate test resumes
            const resumes = Array(batchSize).fill(null).map((_, i) => ({
                contact: { name: `User ${i}`, email: `user${i}@email.com` },
                summary: `Experienced software engineer with ${3 + (i % 5)} years of experience`,
                experience: [
                    {
                        title: 'Software Engineer',
                        company: `Company ${i}`,
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: [
                            'Developed web applications using JavaScript and React',
                            'Collaborated with cross-functional teams',
                            'Implemented new features and bug fixes'
                        ]
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js', 'HTML', 'CSS'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            }));

            const jd = {
                title: 'Senior Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
                preferredSkills: ['AWS', 'Docker', 'Kubernetes']
            };

            const options = {
                targetLength: '1_page',
                style: 'modern',
                enforceATS: true
            };

            // Process in batches
            const results = [];
            for (let i = 0; i < batchSize; i += concurrentLimit) {
                const batch = resumes.slice(i, i + concurrentLimit);
                const batchPromises = batch.map(resume =>
                    optimizeService.optimizeResume(resume, jd, options)
                );

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const avgTimePerResume = totalTime / batchSize;

            // Performance assertions
            expect(results).toHaveLength(batchSize);
            expect(avgTimePerResume).toBeLessThan(5000); // Should average less than 5 seconds per resume
            expect(totalTime).toBeLessThan(300000); // Should complete within 5 minutes

            // Quality assertions
            for (const result of results) {
                expect(result.atsScore).toBeGreaterThan(0.6);
                expect(result.keywordMatch).toBeGreaterThan(0.5);
                expect(result.optimizedResume).toBeDefined();
                expect(result.optimizedResume.contact.name).toBeDefined();
                expect(result.optimizedResume.skills.length).toBeGreaterThan(0);
            }

            console.log(`Processed ${batchSize} resumes in ${totalTime}ms (${avgTimePerResume}ms average)`);
        }, 300000); // 5 minute timeout

        it('should handle mixed optimization scenarios efficiently', async () => {
            const startTime = Date.now();
            const scenarios = [
                { targetLength: '1_page', style: 'modern', count: 30 },
                { targetLength: '2_pages', style: 'classic', count: 30 },
                { targetLength: '1_page', style: 'ats_safe', count: 20 },
                { targetLength: '2_pages', style: 'minimalist', count: 20 }
            ];

            const baseResume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced software engineer with 5 years of experience',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: [
                            'Developed web applications using JavaScript and React',
                            'Led development of microservices architecture',
                            'Mentored junior developers and conducted code reviews',
                            'Optimized application performance by 40%',
                            'Implemented CI/CD pipelines reducing deployment time by 60%'
                        ]
                    },
                    {
                        title: 'Junior Developer',
                        company: 'StartupXYZ',
                        startDate: '2018-06',
                        endDate: '2019-12',
                        bullets: [
                            'Built RESTful APIs using Node.js and Express',
                            'Developed frontend components using React',
                            'Collaborated with design team on UI/UX improvements'
                        ]
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'HTML', 'CSS', 'Git', 'Docker'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University of Technology',
                        startYear: 2014,
                        endYear: 2018,
                        gpa: 3.8
                    }
                ]
            };

            const jd = {
                title: 'Senior Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
                preferredSkills: ['AWS', 'Docker', 'Kubernetes', 'GraphQL'],
                experience: '5+ years'
            };

            const allPromises = [];
            let totalResumes = 0;

            for (const scenario of scenarios) {
                for (let i = 0; i < scenario.count; i++) {
                    const resume = {
                        ...baseResume,
                        contact: {
                            name: `User ${totalResumes}`,
                            email: `user${totalResumes}@email.com`
                        }
                    };

                    const options = {
                        targetLength: scenario.targetLength,
                        style: scenario.style,
                        enforceATS: true
                    };

                    allPromises.push(optimizeService.optimizeResume(resume, jd, options));
                    totalResumes++;
                }
            }

            const results = await Promise.all(allPromises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const avgTimePerResume = totalTime / totalResumes;

            // Performance assertions
            expect(results).toHaveLength(totalResumes);
            expect(avgTimePerResume).toBeLessThan(4000); // Should average less than 4 seconds per resume
            expect(totalTime).toBeLessThan(240000); // Should complete within 4 minutes

            // Quality assertions by scenario
            let scenarioIndex = 0;
            let resumeIndex = 0;
            for (const scenario of scenarios) {
                for (let i = 0; i < scenario.count; i++) {
                    const result = results[resumeIndex];
                    expect(result.atsScore).toBeGreaterThan(0.6);
                    expect(result.keywordMatch).toBeGreaterThan(0.5);
                    expect(result.optimizedResume).toBeDefined();
                    resumeIndex++;
                }
                scenarioIndex++;
            }

            console.log(`Processed ${totalResumes} resumes across ${scenarios.length} scenarios in ${totalTime}ms (${avgTimePerResume}ms average)`);
        }, 300000); // 5 minute timeout

        it('should handle memory usage efficiently during batch processing', async () => {
            const initialMemory = process.memoryUsage();
            const batchSize = 50;

            // Generate large resumes to test memory usage
            const resumes = Array(batchSize).fill(null).map((_, i) => ({
                contact: { name: `User ${i}`, email: `user${i}@email.com` },
                summary: 'A'.repeat(1000), // Large summary
                experience: Array(10).fill(null).map((_, j) => ({
                    title: `Job ${j}`,
                    company: `Company ${j}`,
                    startDate: '2020-01',
                    endDate: '2023-01',
                    bullets: Array(8).fill('Long bullet point '.repeat(100))
                })),
                skills: Array(50).fill('Skill'),
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            }));

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js'],
                preferredSkills: ['TypeScript', 'AWS']
            };

            const options = {
                targetLength: '2_pages',
                style: 'modern',
                enforceATS: true
            };

            // Process in smaller batches to manage memory
            const results = [];
            const batchSize2 = 10;

            for (let i = 0; i < batchSize; i += batchSize2) {
                const batch = resumes.slice(i, i + batchSize2);
                const batchPromises = batch.map(resume =>
                    optimizeService.optimizeResume(resume, jd, options)
                );

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);

                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

            // Memory usage assertions
            expect(results).toHaveLength(batchSize);
            expect(memoryIncreaseMB).toBeLessThan(500); // Should not increase memory by more than 500MB
            expect(finalMemory.heapUsed / 1024 / 1024).toBeLessThan(1000); // Should stay under 1GB

            // Quality assertions
            for (const result of results) {
                expect(result.atsScore).toBeGreaterThan(0.5);
                expect(result.optimizedResume).toBeDefined();
            }

            console.log(`Memory usage: ${memoryIncreaseMB.toFixed(2)}MB increase for ${batchSize} large resumes`);
        }, 300000); // 5 minute timeout
    });

    describe('Batch Export Processing', () => {
        it('should handle 50 concurrent document exports', async () => {
            const startTime = Date.now();
            const batchSize = 50;

            // Generate test resumes for export
            const resumes = Array(batchSize).fill(null).map((_, i) => ({
                contact: { name: `User ${i}`, email: `user${i}@email.com` },
                summary: `Experienced software engineer with ${3 + (i % 5)} years of experience`,
                experience: [
                    {
                        title: 'Software Engineer',
                        company: `Company ${i}`,
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: [
                            'Developed web applications using JavaScript and React',
                            'Collaborated with cross-functional teams',
                            'Implemented new features and bug fixes'
                        ]
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js', 'HTML', 'CSS'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            }));

            const exportOptions = {
                format: 'pdf',
                template: 'modern',
                includeCoverLetter: false,
                watermark: false,
                quality: 'high'
            };

            // Process exports in batches
            const results = [];
            const concurrentLimit = 10;

            for (let i = 0; i < batchSize; i += concurrentLimit) {
                const batch = resumes.slice(i, i + concurrentLimit);
                const batchPromises = batch.map(resume =>
                    exportService.exportResume(resume, exportOptions)
                );

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const avgTimePerExport = totalTime / batchSize;

            // Performance assertions
            expect(results).toHaveLength(batchSize);
            expect(avgTimePerExport).toBeLessThan(3000); // Should average less than 3 seconds per export
            expect(totalTime).toBeLessThan(180000); // Should complete within 3 minutes

            // Quality assertions
            for (const result of results) {
                expect(result.fileUrl).toBeDefined();
                expect(result.format).toBe('pdf');
                expect(result.fileSize).toBeGreaterThan(0);
                expect(result.fileSize).toBeLessThan(10 * 1024 * 1024); // Should be less than 10MB
            }

            console.log(`Exported ${batchSize} documents in ${totalTime}ms (${avgTimePerExport}ms average)`);
        }, 300000); // 5 minute timeout

        it('should handle mixed export formats efficiently', async () => {
            const startTime = Date.now();
            const exportConfigs = [
                { format: 'pdf', template: 'modern', count: 20 },
                { format: 'docx', template: 'classic', count: 20 },
                { format: 'pdf', template: 'ats_safe', count: 15 },
                { format: 'markdown', template: 'minimalist', count: 15 }
            ];

            const baseResume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced software engineer with 5 years of experience',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: [
                            'Developed web applications using JavaScript and React',
                            'Led development of microservices architecture',
                            'Mentored junior developers and conducted code reviews'
                        ]
                    }
                ],
                skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'HTML', 'CSS'],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const allPromises = [];
            let totalExports = 0;

            for (const config of exportConfigs) {
                for (let i = 0; i < config.count; i++) {
                    const resume = {
                        ...baseResume,
                        contact: {
                            name: `User ${totalExports}`,
                            email: `user${totalExports}@email.com`
                        }
                    };

                    const exportOptions = {
                        format: config.format,
                        template: config.template,
                        includeCoverLetter: false,
                        watermark: false,
                        quality: 'high'
                    };

                    allPromises.push(exportService.exportResume(resume, exportOptions));
                    totalExports++;
                }
            }

            const results = await Promise.all(allPromises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const avgTimePerExport = totalTime / totalExports;

            // Performance assertions
            expect(results).toHaveLength(totalExports);
            expect(avgTimePerExport).toBeLessThan(2500); // Should average less than 2.5 seconds per export
            expect(totalTime).toBeLessThan(180000); // Should complete within 3 minutes

            // Quality assertions by format
            let exportIndex = 0;
            for (const config of exportConfigs) {
                for (let i = 0; i < config.count; i++) {
                    const result = results[exportIndex];
                    expect(result.fileUrl).toBeDefined();
                    expect(result.format).toBe(config.format);
                    expect(result.fileSize).toBeGreaterThan(0);
                    exportIndex++;
                }
            }

            console.log(`Exported ${totalExports} documents across ${exportConfigs.length} formats in ${totalTime}ms (${avgTimePerExport}ms average)`);
        }, 300000); // 5 minute timeout

        it('should handle cover letter generation and export in batch', async () => {
            const startTime = Date.now();
            const batchSize = 30;

            const resumes = Array(batchSize).fill(null).map((_, i) => ({
                contact: { name: `User ${i}`, email: `user${i}@email.com` },
                summary: `Experienced software engineer with ${3 + (i % 5)} years of experience`,
                experience: [
                    {
                        title: 'Software Engineer',
                        company: `Company ${i}`,
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: [
                            'Developed web applications using JavaScript and React',
                            'Collaborated with cross-functional teams'
                        ]
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
            }));

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            const coverLetterOptions = {
                tone: 'professional',
                length: 'medium',
                focusPoints: ['experience_match', 'achievements']
            };

            const exportOptions = {
                format: 'pdf',
                template: 'modern',
                includeCoverLetter: true,
                watermark: false,
                quality: 'high'
            };

            // Generate cover letters and export in batches
            const results = [];
            const concurrentLimit = 10;

            for (let i = 0; i < batchSize; i += concurrentLimit) {
                const batch = resumes.slice(i, i + concurrentLimit);
                const batchPromises = batch.map(async (resume) => {
                    // Generate cover letter first
                    const coverLetter = await exportService.generateCoverLetter(resume, jd, coverLetterOptions);

                    // Then export with cover letter
                    return exportService.exportResume(resume, {
                        ...exportOptions,
                        coverLetter
                    });
                });

                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const avgTimePerExport = totalTime / batchSize;

            // Performance assertions
            expect(results).toHaveLength(batchSize);
            expect(avgTimePerExport).toBeLessThan(5000); // Should average less than 5 seconds per export with cover letter
            expect(totalTime).toBeLessThan(300000); // Should complete within 5 minutes

            // Quality assertions
            for (const result of results) {
                expect(result.fileUrl).toBeDefined();
                expect(result.format).toBe('pdf');
                expect(result.fileSize).toBeGreaterThan(0);
                expect(result.coverLetterIncluded).toBe(true);
            }

            console.log(`Generated and exported ${batchSize} documents with cover letters in ${totalTime}ms (${avgTimePerExport}ms average)`);
        }, 300000); // 5 minute timeout
    });

    describe('System Resource Monitoring', () => {
        it('should monitor CPU and memory usage during batch processing', async () => {
            const initialMemory = process.memoryUsage();
            const initialCpu = process.cpuUsage();

            const batchSize = 25;
            const resumes = Array(batchSize).fill(null).map((_, i) => ({
                contact: { name: `User ${i}`, email: `user${i}@email.com` },
                summary: 'Experienced software engineer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: `Company ${i}`,
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
            }));

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            const options = {
                targetLength: '1_page',
                style: 'modern',
                enforceATS: true
            };

            const startTime = Date.now();
            const results = await Promise.all(
                resumes.map(resume => optimizeService.optimizeResume(resume, jd, options))
            );
            const endTime = Date.now();

            const finalMemory = process.memoryUsage();
            const finalCpu = process.cpuUsage();

            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const cpuUsage = finalCpu.user - initialCpu.user;

            // Resource usage assertions
            expect(results).toHaveLength(batchSize);
            expect(memoryIncrease / 1024 / 1024).toBeLessThan(200); // Should not increase memory by more than 200MB
            expect(cpuUsage / 1000000).toBeLessThan(30000); // Should not use more than 30 seconds of CPU time
            expect(endTime - startTime).toBeLessThan(120000); // Should complete within 2 minutes

            console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
            console.log(`CPU usage: ${(cpuUsage / 1000000).toFixed(2)}ms`);
            console.log(`Total time: ${endTime - startTime}ms`);
        }, 180000); // 3 minute timeout
    });
});
