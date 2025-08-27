import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeParserService } from '../../resume-parser/resume-parser.service';
import { JDParserService } from '../../jd-parser/jd-parser.service';
import { OptimizeService } from '../../optimize/optimize.service';
import { CoverLetterService } from '../../cover-letter/cover-letter.service';
import { ExportService } from '../../export/export.service';
import { ResumeEntity } from '../../entities/resume.entity';
import { JobEntity } from '../../entities/job.entity';
import { VariantEntity } from '../../entities/variant.entity';

describe('Complete Workflow Integration Tests', () => {
    let app: INestApplication;
    let resumeParserService: ResumeParserService;
    let jdParserService: JDParserService;
    let optimizeService: OptimizeService;
    let coverLetterService: CoverLetterService;
    let exportService: ExportService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    host: 'localhost',
                    port: 5432,
                    username: 'test',
                    password: 'test',
                    database: 'resume_builder_test',
                    entities: [ResumeEntity, JobEntity, VariantEntity],
                    synchronize: true,
                    logging: false,
                }),
                TypeOrmModule.forFeature([ResumeEntity, JobEntity, VariantEntity]),
            ],
            providers: [
                ResumeParserService,
                JDParserService,
                OptimizeService,
                CoverLetterService,
                ExportService,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        resumeParserService = moduleFixture.get<ResumeParserService>(ResumeParserService);
        jdParserService = moduleFixture.get<JDParserService>(JDParserService);
        optimizeService = moduleFixture.get<OptimizeService>(OptimizeService);
        coverLetterService = moduleFixture.get<CoverLetterService>(CoverLetterService);
        exportService = moduleFixture.get<ExportService>(ExportService);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('End-to-End Workflow', () => {
        it('should complete full workflow: parse → optimize → cover letter → export', async () => {
            // Step 1: Parse Resume
            const resumeText = `
        John Doe
        john.doe@email.com
        (555) 123-4567
        linkedin.com/in/johndoe
        New York, NY

        SUMMARY
        Experienced software engineer with 5+ years developing web applications using modern technologies.

        SKILLS
        JavaScript, React, Node.js, TypeScript, Python, AWS, Docker, PostgreSQL, Redis

        EXPERIENCE
        Senior Software Engineer
        TechCorp Inc.
        January 2020 - Present
        • Led development of microservices architecture serving 1M+ users
        • Mentored 5 junior developers and improved team productivity by 30%
        • Implemented CI/CD pipeline reducing deployment time by 60%
        • Optimized database queries improving response time by 40%

        Software Engineer
        StartupXYZ
        June 2018 - December 2019
        • Developed React-based frontend applications
        • Built RESTful APIs using Node.js and Express
        • Deployed applications to AWS using Docker containers
        • Collaborated with cross-functional teams using Agile methodology

        EDUCATION
        Bachelor of Science in Computer Science
        University of Technology
        2014 - 2018
        GPA: 3.8/4.0
      `;

            const parsedResume = await resumeParserService.parseResume(resumeText);

            expect(parsedResume.contact.name).toBe('John Doe');
            expect(parsedResume.contact.email).toBe('john.doe@email.com');
            expect(parsedResume.skills).toContain('JavaScript');
            expect(parsedResume.skills).toContain('React');
            expect(parsedResume.skills).toContain('Node.js');
            expect(parsedResume.experience).toHaveLength(2);

            // Step 2: Parse Job Description
            const jdText = `
        Senior Software Engineer
        TechCorp Inc.
        San Francisco, CA

        About the Role:
        We are looking for a Senior Software Engineer to join our growing team. You will be responsible for developing scalable web applications and mentoring junior developers.

        Requirements:
        • 5+ years of software development experience
        • Strong proficiency in JavaScript, React, and Node.js
        • Experience with TypeScript and modern frontend frameworks
        • Knowledge of cloud platforms (AWS, Azure, or GCP)
        • Experience with containerization (Docker, Kubernetes)
        • Familiarity with databases (PostgreSQL, MongoDB)
        • Understanding of microservices architecture
        • Experience with CI/CD pipelines
        • Strong problem-solving and communication skills

        Nice to have:
        • Experience with Python and machine learning
        • Knowledge of Redis and caching strategies
        • Understanding of GraphQL
        • Experience with monitoring and observability tools

        Responsibilities:
        • Design and develop scalable web applications
        • Mentor junior developers and conduct code reviews
        • Collaborate with cross-functional teams
        • Optimize application performance and user experience
        • Participate in architectural decisions
        • Contribute to technical documentation
      `;

            const parsedJD = await jdParserService.parseJobDescription(jdText);

            expect(parsedJD.title).toBe('Senior Software Engineer');
            expect(parsedJD.company).toBe('TechCorp Inc.');
            expect(parsedJD.requiredSkills).toContain('JavaScript');
            expect(parsedJD.requiredSkills).toContain('React');
            expect(parsedJD.requiredSkills).toContain('Node.js');
            expect(parsedJD.requiredSkills).toContain('TypeScript');
            expect(parsedJD.requiredSkills).toContain('AWS');
            expect(parsedJD.requiredSkills).toContain('Docker');
            expect(parsedJD.requiredSkills).toContain('PostgreSQL');

            // Step 3: Optimize Resume
            const optimizationResult = await optimizeService.optimizeResume(
                parsedResume,
                parsedJD,
                {
                    targetLength: '2_pages',
                    style: 'modern',
                    focusAreas: ['leadership', 'technical_skills', 'achievements'],
                    keywordDensity: 0.8
                }
            );

            expect(optimizationResult.optimizedResume).toBeDefined();
            expect(optimizationResult.atsScore).toBeGreaterThan(0.7);
            expect(optimizationResult.keywordMatch).toBeGreaterThan(0.8);
            expect(optimizationResult.improvements).toHaveLength.greaterThan(0);

            // Verify optimized content has better keyword alignment
            const optimizedSkills = optimizationResult.optimizedResume.skills;
            const jdSkills = parsedJD.requiredSkills;
            const skillMatch = jdSkills.filter(skill =>
                optimizedSkills.some(optSkill =>
                    optSkill.toLowerCase().includes(skill.toLowerCase())
                )
            ).length / jdSkills.length;

            expect(skillMatch).toBeGreaterThan(0.7);

            // Step 4: Generate Cover Letter
            const coverLetter = await coverLetterService.generateCoverLetter(
                optimizationResult.optimizedResume,
                parsedJD,
                {
                    tone: 'professional',
                    length: 'medium',
                    focusPoints: ['experience_match', 'achievements', 'cultural_fit'],
                    customIntro: null,
                    customClosing: null
                }
            );

            expect(coverLetter.content).toBeDefined();
            expect(coverLetter.content.length).toBeGreaterThan(500);
            expect(coverLetter.wordCount).toBeGreaterThan(200);
            expect(coverLetter.tone).toBe('professional');
            expect(coverLetter.focusPoints).toContain('experience_match');
            expect(coverLetter.focusPoints).toContain('achievements');

            // Verify cover letter mentions key skills and experiences
            const coverLetterText = coverLetter.content.toLowerCase();
            expect(coverLetterText).toContain('javascript');
            expect(coverLetterText).toContain('react');
            expect(coverLetterText).toContain('node.js');
            expect(coverLetterText).toContain('microservices');
            expect(coverLetterText).toContain('mentor');

            // Step 5: Export Documents
            const exportOptions = {
                format: 'pdf',
                template: 'modern',
                includeCoverLetter: true,
                watermark: false,
                quality: 'high'
            };

            const resumeExport = await exportService.exportResume(
                optimizationResult.optimizedResume,
                exportOptions
            );

            expect(resumeExport.fileUrl).toBeDefined();
            expect(resumeExport.format).toBe('pdf');
            expect(resumeExport.fileSize).toBeGreaterThan(0);

            const coverLetterExport = await exportService.exportCoverLetter(
                coverLetter,
                {
                    format: 'pdf',
                    template: 'modern',
                    watermark: false,
                    quality: 'high'
                }
            );

            expect(coverLetterExport.fileUrl).toBeDefined();
            expect(coverLetterExport.format).toBe('pdf');
            expect(coverLetterExport.fileSize).toBeGreaterThan(0);

            // Step 6: Generate ATS Report
            const atsReport = await optimizeService.generateATSReport(
                optimizationResult.optimizedResume,
                parsedJD
            );

            expect(atsReport.overallScore).toBeGreaterThan(0.7);
            expect(atsReport.keywordMatch).toBeGreaterThan(0.8);
            expect(atsReport.readabilityScore).toBeGreaterThan(0.6);
            expect(atsReport.lengthScore).toBeGreaterThan(0.7);
            expect(atsReport.formatScore).toBeGreaterThan(0.8);
            expect(atsReport.recommendations).toHaveLength.greaterThan(0);

            // Step 7: Generate Gap Analysis
            const gapAnalysis = await optimizeService.generateGapAnalysis(
                optimizationResult.optimizedResume,
                parsedJD
            );

            expect(gapAnalysis.missingSkills).toBeDefined();
            expect(gapAnalysis.skillGaps).toBeDefined();
            expect(gapAnalysis.experienceGaps).toBeDefined();
            expect(gapAnalysis.recommendations).toHaveLength.greaterThan(0);

            // Verify the complete workflow produces high-quality results
            expect(optimizationResult.atsScore).toBeGreaterThan(0.75);
            expect(coverLetter.qualityScore).toBeGreaterThan(0.8);
            expect(atsReport.overallScore).toBeGreaterThan(0.75);
        }, 30000); // 30 second timeout for integration test

        it('should handle edge cases and errors gracefully', async () => {
            // Test with minimal resume
            const minimalResume = `
        John Doe
        john@email.com
        Skills: JavaScript
      `;

            const minimalJD = `
        Software Engineer
        Requirements: JavaScript, React
      `;

            const parsedResume = await resumeParserService.parseResume(minimalResume);
            const parsedJD = await jdParserService.parseJobDescription(minimalJD);

            // Should still work with minimal data
            expect(parsedResume.contact.name).toBe('John Doe');
            expect(parsedResume.skills).toContain('JavaScript');
            expect(parsedJD.requiredSkills).toContain('JavaScript');

            // Optimization should provide recommendations for improvement
            const optimizationResult = await optimizeService.optimizeResume(
                parsedResume,
                parsedJD,
                { targetLength: '1_page', style: 'simple' }
            );

            expect(optimizationResult.improvements).toHaveLength.greaterThan(0);
            expect(optimizationResult.atsScore).toBeLessThan(0.8); // Lower score for minimal resume
        });

        it('should maintain data consistency throughout the workflow', async () => {
            const resumeText = `
        Jane Smith
        jane.smith@email.com
        Skills: Python, Django, PostgreSQL
        Experience: Software Engineer at TechCorp (2020-2023)
      `;

            const jdText = `
        Python Developer
        Requirements: Python, Django, PostgreSQL, AWS
      `;

            const parsedResume = await resumeParserService.parseResume(resumeText);
            const parsedJD = await jdParserService.parseJobDescription(jdText);
            const optimizationResult = await optimizeService.optimizeResume(
                parsedResume,
                parsedJD,
                { targetLength: '1_page', style: 'modern' }
            );

            // Verify contact information is preserved
            expect(optimizationResult.optimizedResume.contact.name).toBe('Jane Smith');
            expect(optimizationResult.optimizedResume.contact.email).toBe('jane.smith@email.com');

            // Verify core skills are preserved and enhanced
            expect(optimizationResult.optimizedResume.skills).toContain('Python');
            expect(optimizationResult.optimizedResume.skills).toContain('Django');
            expect(optimizationResult.optimizedResume.skills).toContain('PostgreSQL');

            // Verify experience is preserved
            expect(optimizationResult.optimizedResume.experience).toHaveLength(1);
            expect(optimizationResult.optimizedResume.experience[0].title).toBe('Software Engineer');
            expect(optimizationResult.optimizedResume.experience[0].company).toBe('TechCorp');
        });
    });
});
