import { Test, TestingModule } from '@nestjs/testing';
import { ResumeParserService } from '../../resume-parser/resume-parser.service';
import { JDParserService } from '../../jd-parser/jd-parser.service';
import { TaxonomyService } from '../../taxonomy/taxonomy.service';

describe('Parsing Unit Tests', () => {
    let resumeParserService: ResumeParserService;
    let jdParserService: JDParserService;
    let taxonomyService: TaxonomyService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResumeParserService,
                JDParserService,
                TaxonomyService,
            ],
        }).compile();

        resumeParserService = module.get<ResumeParserService>(ResumeParserService);
        jdParserService = module.get<JDParserService>(JDParserService);
        taxonomyService = module.get<TaxonomyService>(TaxonomyService);
    });

    describe('Resume Parser', () => {
        it('should parse contact information correctly', async () => {
            const resumeText = `
        John Doe
        john.doe@email.com
        (555) 123-4567
        linkedin.com/in/johndoe
        New York, NY
      `;

            const result = await resumeParserService.parseContact(resumeText);

            expect(result).toEqual({
                name: 'John Doe',
                email: 'john.doe@email.com',
                phone: '(555) 123-4567',
                linkedin: 'linkedin.com/in/johndoe',
                location: 'New York, NY'
            });
        });

        it('should extract skills from resume text', async () => {
            const resumeText = `
        Skills: JavaScript, React, Node.js, Python, AWS, Docker
        Technologies: TypeScript, MongoDB, PostgreSQL, Redis
      `;

            const skills = await resumeParserService.extractSkills(resumeText);

            expect(skills).toContain('JavaScript');
            expect(skills).toContain('React');
            expect(skills).toContain('Node.js');
            expect(skills).toContain('Python');
            expect(skills).toContain('AWS');
            expect(skills).toContain('Docker');
            expect(skills).toContain('TypeScript');
            expect(skills).toContain('MongoDB');
            expect(skills).toContain('PostgreSQL');
            expect(skills).toContain('Redis');
        });

        it('should parse work experience with dates', async () => {
            const experienceText = `
        Senior Software Engineer
        Tech Company Inc.
        January 2020 - Present
        • Led development of microservices architecture
        • Mentored junior developers
        • Improved system performance by 40%
      `;

            const experience = await resumeParserService.parseExperience(experienceText);

            expect(experience).toEqual({
                title: 'Senior Software Engineer',
                company: 'Tech Company Inc.',
                startDate: '2020-01',
                endDate: null,
                isCurrent: true,
                bullets: [
                    'Led development of microservices architecture',
                    'Mentored junior developers',
                    'Improved system performance by 40%'
                ]
            });
        });

        it('should parse education information', async () => {
            const educationText = `
        Bachelor of Science in Computer Science
        University of Technology
        2016 - 2020
        GPA: 3.8/4.0
      `;

            const education = await resumeParserService.parseEducation(educationText);

            expect(education).toEqual({
                degree: 'Bachelor of Science in Computer Science',
                institution: 'University of Technology',
                startYear: 2016,
                endYear: 2020,
                gpa: 3.8,
                gpaScale: 4.0
            });
        });

        it('should calculate confidence score for parsed data', async () => {
            const resumeData = {
                contact: { name: 'John Doe', email: 'john@email.com' },
                skills: ['JavaScript', 'React', 'Node.js'],
                experience: [
                    {
                        title: 'Software Engineer',
                        company: 'Tech Corp',
                        startDate: '2020-01',
                        endDate: null,
                        isCurrent: true,
                        bullets: ['Developed web applications']
                    }
                ],
                education: [
                    {
                        degree: 'BS Computer Science',
                        institution: 'University',
                        startYear: 2016,
                        endYear: 2020
                    }
                ]
            };

            const confidence = await resumeParserService.calculateConfidence(resumeData);

            expect(confidence).toBeGreaterThan(0.7);
            expect(confidence).toBeLessThanOrEqual(1.0);
        });
    });

    describe('JD Parser', () => {
        it('should extract required skills from job description', async () => {
            const jdText = `
        We are looking for a Senior Software Engineer with:
        • 5+ years of experience with JavaScript, React, and Node.js
        • Experience with AWS, Docker, and Kubernetes
        • Knowledge of PostgreSQL and Redis
        • Familiarity with TypeScript and Python
      `;

            const skills = await jdParserService.extractRequiredSkills(jdText);

            expect(skills).toContain('JavaScript');
            expect(skills).toContain('React');
            expect(skills).toContain('Node.js');
            expect(skills).toContain('AWS');
            expect(skills).toContain('Docker');
            expect(skills).toContain('Kubernetes');
            expect(skills).toContain('PostgreSQL');
            expect(skills).toContain('Redis');
            expect(skills).toContain('TypeScript');
            expect(skills).toContain('Python');
        });

        it('should identify preferred skills', async () => {
            const jdText = `
        Nice to have:
        • Experience with GraphQL
        • Knowledge of machine learning
        • Familiarity with Elasticsearch
        • Understanding of microservices
      `;

            const preferredSkills = await jdParserService.extractPreferredSkills(jdText);

            expect(preferredSkills).toContain('GraphQL');
            expect(preferredSkills).toContain('Machine Learning');
            expect(preferredSkills).toContain('Elasticsearch');
            expect(preferredSkills).toContain('Microservices');
        });

        it('should extract experience requirements', async () => {
            const jdText = `
        Requirements:
        • 5+ years of software development experience
        • 3+ years of experience with cloud platforms
        • 2+ years of experience with containerization
      `;

            const experience = await jdParserService.extractExperienceRequirements(jdText);

            expect(experience).toEqual({
                totalYears: 5,
                cloudExperience: 3,
                containerizationExperience: 2
            });
        });

        it('should identify job level and seniority', async () => {
            const jdText = `
        Senior Software Engineer
        We are seeking a senior-level developer with leadership experience
      `;

            const level = await jdParserService.identifyJobLevel(jdText);

            expect(level).toBe('senior');
        });

        it('should extract company information', async () => {
            const jdText = `
        About TechCorp:
        We are a leading technology company based in San Francisco
        Founded in 2010, we have 500+ employees
        Industry: Software Development
      `;

            const company = await jdParserService.extractCompanyInfo(jdText);

            expect(company).toEqual({
                name: 'TechCorp',
                location: 'San Francisco',
                founded: 2010,
                size: '500+',
                industry: 'Software Development'
            });
        });
    });

    describe('Taxonomy Service', () => {
        it('should normalize skill names', async () => {
            const skillVariations = [
                'JavaScript',
                'JS',
                'javascript',
                'Javascript',
                'ECMAScript'
            ];

            for (const skill of skillVariations) {
                const normalized = await taxonomyService.normalizeSkill(skill);
                expect(normalized).toBe('JavaScript');
            }
        });

        it('should find skill aliases', async () => {
            const aliases = await taxonomyService.findSkillAliases('JavaScript');

            expect(aliases).toContain('JS');
            expect(aliases).toContain('ECMAScript');
            expect(aliases).toContain('javascript');
        });

        it('should calculate skill similarity', async () => {
            const similarity1 = await taxonomyService.calculateSkillSimilarity('JavaScript', 'TypeScript');
            const similarity2 = await taxonomyService.calculateSkillSimilarity('JavaScript', 'Python');

            expect(similarity1).toBeGreaterThan(similarity2);
            expect(similarity1).toBeGreaterThan(0.5);
        });

        it('should group similar skills', async () => {
            const skills = [
                'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular',
                'Python', 'Django', 'Flask', 'FastAPI',
                'Java', 'Spring Boot', 'Hibernate'
            ];

            const groups = await taxonomyService.groupSimilarSkills(skills);

            expect(groups).toHaveLength(3); // JS/TS, Python, Java groups
            expect(groups[0]).toContain('JavaScript');
            expect(groups[0]).toContain('TypeScript');
            expect(groups[0]).toContain('React');
        });

        it('should suggest related skills', async () => {
            const suggestions = await taxonomyService.suggestRelatedSkills('React');

            expect(suggestions).toContain('TypeScript');
            expect(suggestions).toContain('Redux');
            expect(suggestions).toContain('Next.js');
            expect(suggestions).toContain('JavaScript');
        });

        it('should validate skill hierarchy', async () => {
            const hierarchy = await taxonomyService.getSkillHierarchy('React');

            expect(hierarchy.parent).toBe('Frontend Development');
            expect(hierarchy.children).toContain('Redux');
            expect(hierarchy.children).toContain('React Router');
        });
    });

    describe('Integration Tests', () => {
        it('should parse resume and match against job requirements', async () => {
            const resumeText = `
        John Doe
        john.doe@email.com
        
        Skills: JavaScript, React, Node.js, Python, AWS
        
        Experience:
        Senior Software Engineer
        Tech Company
        2020 - Present
        • Developed React applications
        • Used Node.js for backend
        • Deployed to AWS
      `;

            const jdText = `
        Senior Software Engineer
        Requirements:
        • JavaScript, React, Node.js
        • AWS experience
        • 3+ years of experience
      `;

            const resumeData = await resumeParserService.parseResume(resumeText);
            const jdData = await jdParserService.parseJobDescription(jdText);
            const match = await taxonomyService.calculateMatch(resumeData.skills, jdData.requiredSkills);

            expect(match.score).toBeGreaterThan(0.8);
            expect(match.matchedSkills).toContain('JavaScript');
            expect(match.matchedSkills).toContain('React');
            expect(match.matchedSkills).toContain('Node.js');
            expect(match.matchedSkills).toContain('AWS');
        });

        it('should handle missing skills gracefully', async () => {
            const resumeSkills = ['JavaScript', 'React'];
            const jdSkills = ['JavaScript', 'React', 'Python', 'Docker'];

            const match = await taxonomyService.calculateMatch(resumeSkills, jdSkills);

            expect(match.score).toBeLessThan(1.0);
            expect(match.missingSkills).toContain('Python');
            expect(match.missingSkills).toContain('Docker');
        });
    });
});
