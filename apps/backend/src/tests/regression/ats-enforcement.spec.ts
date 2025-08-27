import { Test, TestingModule } from '@nestjs/testing';
import { OptimizeService } from '../../optimize/optimize.service';
import { ResumeParserService } from '../../resume-parser/resume-parser.service';
import { JDParserService } from '../../jd-parser/jd-parser.service';

describe('ATS Rule Enforcement Regression Tests', () => {
    let optimizeService: OptimizeService;
    let resumeParserService: ResumeParserService;
    let jdParserService: JDParserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OptimizeService,
                ResumeParserService,
                JDParserService,
            ],
        }).compile();

        optimizeService = module.get<OptimizeService>(OptimizeService);
        resumeParserService = module.get<ResumeParserService>(ResumeParserService);
        jdParserService = module.get<JDParserService>(JDParserService);
    });

    describe('ATS Rule Enforcement', () => {
        it('should enforce maximum resume length limits', async () => {
            const longResume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'A'.repeat(5000), // Very long summary
                experience: Array(20).fill(null).map((_, i) => ({
                    title: `Job ${i}`,
                    company: `Company ${i}`,
                    startDate: '2020-01',
                    endDate: '2023-01',
                    bullets: Array(10).fill('Long bullet point '.repeat(50))
                })),
                skills: Array(100).fill('Skill'),
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
                requiredSkills: ['JavaScript', 'React', 'Node.js'],
                preferredSkills: ['TypeScript', 'AWS']
            };

            const result = await optimizeService.optimizeResume(longResume, jd, {
                targetLength: '2_pages',
                style: 'modern',
                enforceATS: true
            });

            // Should enforce length limits
            expect(result.optimizedResume.summary.length).toBeLessThan(2000);
            expect(result.optimizedResume.experience.length).toBeLessThan(10);
            expect(result.optimizedResume.skills.length).toBeLessThan(30);
            expect(result.atsScore).toBeGreaterThan(0.7);
        });

        it('should prevent use of non-ATS-friendly fonts and formatting', async () => {
            const resumeWithBadFormatting = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer with strong skills',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: [
                            'Developed applications using **bold text** and *italics*',
                            'Used fancy symbols: → ← ↑ ↓',
                            'Included tables and complex formatting'
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
            };

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            const result = await optimizeService.optimizeResume(resumeWithBadFormatting, jd, {
                targetLength: '1_page',
                style: 'ats_safe',
                enforceATS: true
            });

            // Should remove non-ATS-friendly formatting
            const optimizedText = JSON.stringify(result.optimizedResume);
            expect(optimizedText).not.toContain('**');
            expect(optimizedText).not.toContain('*');
            expect(optimizedText).not.toContain('→');
            expect(optimizedText).not.toContain('←');
            expect(optimizedText).not.toContain('↑');
            expect(optimizedText).not.toContain('↓');
        });

        it('should enforce proper section ordering for ATS', async () => {
            const resumeWithBadOrdering = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                skills: ['JavaScript', 'React', 'Node.js'], // Skills before experience
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications']
                    }
                ],
                summary: 'Experienced developer', // Summary after skills
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

            const result = await optimizeService.optimizeResume(resumeWithBadOrdering, jd, {
                targetLength: '1_page',
                style: 'ats_safe',
                enforceATS: true
            });

            // Should reorder sections properly for ATS
            const sections = Object.keys(result.optimizedResume);
            const contactIndex = sections.indexOf('contact');
            const summaryIndex = sections.indexOf('summary');
            const experienceIndex = sections.indexOf('experience');
            const skillsIndex = sections.indexOf('skills');
            const educationIndex = sections.indexOf('education');

            expect(contactIndex).toBeLessThan(summaryIndex);
            expect(summaryIndex).toBeLessThan(experienceIndex);
            expect(experienceIndex).toBeLessThan(skillsIndex);
            expect(skillsIndex).toBeLessThan(educationIndex);
        });

        it('should prevent keyword stuffing and maintain readability', async () => {
            const resumeWithKeywordStuffing = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'JavaScript JavaScript JavaScript React React React Node.js Node.js Node.js developer developer developer',
                experience: [
                    {
                        title: 'JavaScript React Node.js Developer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: [
                            'Used JavaScript JavaScript JavaScript extensively',
                            'Developed React React React applications',
                            'Implemented Node.js Node.js Node.js backend services'
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
            };

            const jd = {
                title: 'Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            const result = await optimizeService.optimizeResume(resumeWithKeywordStuffing, jd, {
                targetLength: '1_page',
                style: 'modern',
                enforceATS: true
            });

            // Should reduce keyword stuffing while maintaining keyword presence
            const optimizedText = JSON.stringify(result.optimizedResume);
            const javascriptCount = (optimizedText.match(/JavaScript/g) || []).length;
            const reactCount = (optimizedText.match(/React/g) || []).length;
            const nodejsCount = (optimizedText.match(/Node\.js/g) || []).length;

            expect(javascriptCount).toBeLessThan(10);
            expect(reactCount).toBeLessThan(8);
            expect(nodejsCount).toBeLessThan(8);
            expect(result.readabilityScore).toBeGreaterThan(0.6);
        });
    });

    describe('Hallucination Prevention', () => {
        it('should not add skills that are not in the original resume', async () => {
            const originalResume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications using JavaScript']
                    }
                ],
                skills: ['JavaScript', 'HTML', 'CSS'],
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
                title: 'Senior Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker']
            };

            const result = await optimizeService.optimizeResume(originalResume, jd, {
                targetLength: '1_page',
                style: 'modern',
                preventHallucination: true
            });

            // Should not add skills that weren't in the original
            const originalSkills = new Set(originalResume.skills);
            const optimizedSkills = result.optimizedResume.skills;

            for (const skill of optimizedSkills) {
                if (!originalSkills.has(skill)) {
                    // Only allow closely related skills or skills mentioned in experience
                    const isRelated = ['React', 'Node.js'].includes(skill) &&
                        originalSkills.has('JavaScript');
                    const isMentioned = JSON.stringify(originalResume.experience)
                        .toLowerCase().includes(skill.toLowerCase());

                    expect(isRelated || isMentioned).toBe(true);
                }
            }
        });

        it('should not fabricate work experience or education', async () => {
            const originalResume = {
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
                skills: ['JavaScript', 'React'],
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
                title: 'Senior Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'],
                experience: '5+ years'
            };

            const result = await optimizeService.optimizeResume(originalResume, jd, {
                targetLength: '2_pages',
                style: 'modern',
                preventHallucination: true
            });

            // Should not add fake experience
            expect(result.optimizedResume.experience.length).toBe(1);
            expect(result.optimizedResume.experience[0].title).toBe('Software Engineer');
            expect(result.optimizedResume.experience[0].company).toBe('TechCorp');

            // Should not add fake education
            expect(result.optimizedResume.education.length).toBe(1);
            expect(result.optimizedResume.education[0].degree).toBe('BS Computer Science');
            expect(result.optimizedResume.education[0].institution).toBe('University');
        });

        it('should not create fake achievements or metrics', async () => {
            const originalResume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications', 'Worked with team']
                    }
                ],
                skills: ['JavaScript', 'React'],
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
                title: 'Senior Software Engineer',
                company: 'TechCorp',
                requiredSkills: ['JavaScript', 'React', 'Node.js']
            };

            const result = await optimizeService.optimizeResume(originalResume, jd, {
                targetLength: '1_page',
                style: 'modern',
                preventHallucination: true
            });

            // Should not add fake metrics or achievements
            const optimizedText = JSON.stringify(result.optimizedResume);

            // Should not contain fabricated metrics
            expect(optimizedText).not.toMatch(/\d+% improvement/);
            expect(optimizedText).not.toMatch(/\$\d+[KMB] in savings/);
            expect(optimizedText).not.toMatch(/\d+ million users/);
            expect(optimizedText).not.toMatch(/increased.*by \d+%/);
            expect(optimizedText).not.toMatch(/reduced.*by \d+%/);
        });

        it('should maintain factual accuracy in contact information', async () => {
            const originalResume = {
                contact: {
                    name: 'John Doe',
                    email: 'john.doe@email.com',
                    phone: '(555) 123-4567',
                    location: 'New York, NY'
                },
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
                skills: ['JavaScript', 'React'],
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
                requiredSkills: ['JavaScript', 'React']
            };

            const result = await optimizeService.optimizeResume(originalResume, jd, {
                targetLength: '1_page',
                style: 'modern',
                preventHallucination: true
            });

            // Should preserve exact contact information
            expect(result.optimizedResume.contact.name).toBe('John Doe');
            expect(result.optimizedResume.contact.email).toBe('john.doe@email.com');
            expect(result.optimizedResume.contact.phone).toBe('(555) 123-4567');
            expect(result.optimizedResume.contact.location).toBe('New York, NY');
        });
    });

    describe('Consistency Checks', () => {
        it('should maintain consistency across multiple optimization runs', async () => {
            const originalResume = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                summary: 'Experienced developer with JavaScript and React skills',
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'TechCorp',
                        startDate: '2020-01',
                        endDate: '2023-01',
                        bullets: ['Developed web applications using JavaScript and React']
                    }
                ],
                skills: ['JavaScript', 'React', 'HTML', 'CSS'],
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

            const options = {
                targetLength: '1_page',
                style: 'modern',
                enforceATS: true,
                preventHallucination: true
            };

            // Run optimization multiple times
            const results = [];
            for (let i = 0; i < 3; i++) {
                const result = await optimizeService.optimizeResume(originalResume, jd, options);
                results.push(result);
            }

            // Results should be consistent
            for (let i = 1; i < results.length; i++) {
                expect(results[i].atsScore).toBeCloseTo(results[0].atsScore, 1);
                expect(results[i].keywordMatch).toBeCloseTo(results[0].keywordMatch, 1);
                expect(results[i].optimizedResume.skills.length).toBe(results[0].optimizedResume.skills.length);
                expect(results[i].optimizedResume.experience.length).toBe(results[0].optimizedResume.experience.length);
            }
        });
    });
});
