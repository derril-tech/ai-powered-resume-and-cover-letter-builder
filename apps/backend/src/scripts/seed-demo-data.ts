import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OrganizationService } from '../organizations/organizations.service';
import { UserService } from '../users/users.service';
import { ResumeService } from '../resume/resume.service';
import { JobService } from '../job/job.service';
import { VariantService } from '../variants/variants.service';
import { OptimizeService } from '../optimize/optimize.service';
import { CoverLetterService } from '../cover-letter/cover-letter.service';
import { ExportService } from '../export/export.service';

async function seedDemoData() {
    console.log('🌱 Starting demo data seeding...');

    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const orgService = app.get(OrganizationService);
        const userService = app.get(UserService);
        const resumeService = app.get(ResumeService);
        const jobService = app.get(JobService);
        const variantService = app.get(VariantService);
        const optimizeService = app.get(OptimizeService);
        const coverLetterService = app.get(CoverLetterService);
        const exportService = app.get(ExportService);

        // Create demo organization
        console.log('📋 Creating demo organization...');
        const demoOrg = await orgService.create({
            name: 'TechCorp Demo',
            slug: 'techcorp-demo',
            plan: 'premium',
            settings: {
                maxUsers: 50,
                maxResumes: 1000,
                maxExports: 5000,
                features: ['ats_optimization', 'cover_letters', 'collaboration', 'analytics']
            }
        });
        console.log(`✅ Created organization: ${demoOrg.name} (${demoOrg.id})`);

        // Create demo users
        console.log('👥 Creating demo users...');
        const adminUser = await userService.create({
            email: 'admin@techcorp-demo.com',
            password: 'demo-admin-2024!',
            firstName: 'Demo',
            lastName: 'Admin',
            role: 'admin'
        });

        const editorUser = await userService.create({
            email: 'editor@techcorp-demo.com',
            password: 'demo-editor-2024!',
            firstName: 'Demo',
            lastName: 'Editor',
            role: 'editor'
        });

        const viewerUser = await userService.create({
            email: 'viewer@techcorp-demo.com',
            password: 'demo-viewer-2024!',
            firstName: 'Demo',
            lastName: 'Viewer',
            role: 'viewer'
        });

        // Add users to organization
        await orgService.addMember(demoOrg.id, adminUser.id, 'owner');
        await orgService.addMember(demoOrg.id, editorUser.id, 'editor');
        await orgService.addMember(demoOrg.id, viewerUser.id, 'viewer');

        console.log(`✅ Created users: Admin (${adminUser.id}), Editor (${editorUser.id}), Viewer (${viewerUser.id})`);

        // Create sample resume
        console.log('📄 Creating sample resume...');
        const sampleResume = await resumeService.create({
            orgId: demoOrg.id,
            userId: adminUser.id,
            name: 'John Doe - Senior Software Engineer',
            contact: {
                name: 'John Doe',
                email: 'john.doe@techcorp-demo.com',
                phone: '(555) 123-4567',
                linkedin: 'linkedin.com/in/johndoe',
                location: 'San Francisco, CA'
            },
            summary: 'Experienced Senior Software Engineer with 8+ years developing scalable web applications and leading engineering teams. Proven track record of delivering high-impact projects and mentoring junior developers.',
            experience: [
                {
                    title: 'Senior Software Engineer',
                    company: 'TechCorp Inc.',
                    location: 'San Francisco, CA',
                    startDate: '2021-03',
                    endDate: null,
                    isCurrent: true,
                    bullets: [
                        'Led development of microservices architecture serving 2M+ users, improving system reliability by 99.9%',
                        'Mentored 8 junior developers and established best practices, resulting in 40% faster feature delivery',
                        'Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
                        'Optimized database queries improving API response time by 60%',
                        'Collaborated with product team to define technical requirements and architecture decisions'
                    ]
                },
                {
                    title: 'Software Engineer',
                    company: 'StartupXYZ',
                    location: 'San Francisco, CA',
                    startDate: '2019-01',
                    endDate: '2021-02',
                    isCurrent: false,
                    bullets: [
                        'Developed React-based frontend applications with TypeScript and Redux',
                        'Built RESTful APIs using Node.js, Express, and PostgreSQL',
                        'Deployed applications to AWS using Docker containers and Kubernetes',
                        'Collaborated with cross-functional teams using Agile methodology',
                        'Improved application performance by 50% through code optimization'
                    ]
                },
                {
                    title: 'Junior Developer',
                    company: 'WebSolutions',
                    location: 'San Francisco, CA',
                    startDate: '2017-06',
                    endDate: '2018-12',
                    isCurrent: false,
                    bullets: [
                        'Developed responsive web applications using JavaScript, HTML, and CSS',
                        'Worked with jQuery and Bootstrap for frontend development',
                        'Assisted in database design and maintenance using MySQL',
                        'Participated in code reviews and team meetings'
                    ]
                }
            ],
            education: [
                {
                    degree: 'Bachelor of Science in Computer Science',
                    institution: 'University of California, Berkeley',
                    location: 'Berkeley, CA',
                    startYear: 2013,
                    endYear: 2017,
                    gpa: 3.8,
                    gpaScale: 4.0,
                    relevantCoursework: ['Data Structures', 'Algorithms', 'Database Systems', 'Software Engineering']
                }
            ],
            skills: [
                'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java',
                'PostgreSQL', 'MongoDB', 'Redis', 'AWS', 'Docker', 'Kubernetes',
                'Git', 'CI/CD', 'REST APIs', 'GraphQL', 'Microservices',
                'Agile', 'Scrum', 'System Design', 'Performance Optimization'
            ],
            certifications: [
                {
                    name: 'AWS Certified Solutions Architect',
                    issuer: 'Amazon Web Services',
                    date: '2022-06',
                    expiryDate: '2025-06'
                },
                {
                    name: 'Certified Kubernetes Administrator',
                    issuer: 'Cloud Native Computing Foundation',
                    date: '2021-09',
                    expiryDate: '2024-09'
                }
            ],
            projects: [
                {
                    name: 'E-commerce Platform',
                    description: 'Built a scalable e-commerce platform using React, Node.js, and PostgreSQL',
                    technologies: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'AWS'],
                    url: 'github.com/johndoe/ecommerce-platform',
                    highlights: ['Served 10K+ concurrent users', 'Implemented payment processing', 'Built admin dashboard']
                },
                {
                    name: 'Task Management App',
                    description: 'Developed a collaborative task management application with real-time updates',
                    technologies: ['React', 'Socket.io', 'MongoDB', 'Express'],
                    url: 'github.com/johndoe/task-manager',
                    highlights: ['Real-time collaboration', 'File uploads', 'Mobile responsive']
                }
            ],
            languages: [
                { language: 'English', proficiency: 'Native' },
                { language: 'Spanish', proficiency: 'Conversational' }
            ]
        });
        console.log(`✅ Created sample resume: ${sampleResume.name} (${sampleResume.id})`);

        // Create sample job description
        console.log('💼 Creating sample job description...');
        const sampleJob = await jobService.create({
            orgId: demoOrg.id,
            userId: adminUser.id,
            title: 'Senior Full Stack Engineer',
            company: 'InnovationTech',
            location: 'San Francisco, CA',
            type: 'full-time',
            remote: 'hybrid',
            salary: {
                min: 150000,
                max: 200000,
                currency: 'USD'
            },
            description: `
InnovationTech is seeking a Senior Full Stack Engineer to join our growing team. You will be responsible for developing and maintaining our web applications, working with modern technologies, and mentoring junior developers.

**About the Role:**
- Design and develop scalable web applications
- Work with cross-functional teams to define technical requirements
- Mentor junior developers and conduct code reviews
- Optimize application performance and user experience
- Participate in architectural decisions and system design

**Requirements:**
- 5+ years of software development experience
- Strong proficiency in JavaScript, React, and Node.js
- Experience with TypeScript and modern frontend frameworks
- Knowledge of cloud platforms (AWS, Azure, or GCP)
- Experience with containerization (Docker, Kubernetes)
- Familiarity with databases (PostgreSQL, MongoDB)
- Understanding of microservices architecture
- Experience with CI/CD pipelines
- Strong problem-solving and communication skills

**Nice to have:**
- Experience with Python and machine learning
- Knowledge of Redis and caching strategies
- Understanding of GraphQL
- Experience with monitoring and observability tools
- Contributions to open source projects

**Benefits:**
- Competitive salary and equity
- Health, dental, and vision insurance
- 401(k) matching
- Flexible work arrangements
- Professional development budget
- Unlimited PTO
      `,
            requirements: {
                requiredSkills: [
                    'JavaScript', 'React', 'Node.js', 'TypeScript', 'AWS', 'Docker',
                    'PostgreSQL', 'MongoDB', 'Microservices', 'CI/CD'
                ],
                preferredSkills: [
                    'Python', 'Redis', 'GraphQL', 'Kubernetes', 'Machine Learning'
                ],
                experience: '5+ years',
                education: 'Bachelor\'s degree in Computer Science or related field'
            },
            benefits: [
                'Competitive salary and equity',
                'Health, dental, and vision insurance',
                '401(k) matching',
                'Flexible work arrangements',
                'Professional development budget',
                'Unlimited PTO'
            ]
        });
        console.log(`✅ Created sample job: ${sampleJob.title} at ${sampleJob.company} (${sampleJob.id})`);

        // Create optimized variant
        console.log('🚀 Creating optimized variant...');
        const optimizationResult = await optimizeService.optimizeResume(
            sampleResume,
            sampleJob,
            {
                targetLength: '2_pages',
                style: 'modern',
                focusAreas: ['leadership', 'technical_skills', 'achievements'],
                keywordDensity: 0.8,
                enforceATS: true
            }
        );

        const optimizedVariant = await variantService.create({
            orgId: demoOrg.id,
            userId: adminUser.id,
            resumeId: sampleResume.id,
            jobId: sampleJob.id,
            name: 'Optimized for InnovationTech',
            data: optimizationResult.optimizedResume,
            metadata: {
                atsScore: optimizationResult.atsScore,
                keywordMatch: optimizationResult.keywordMatch,
                readabilityScore: optimizationResult.readabilityScore,
                improvements: optimizationResult.improvements,
                optimizationSettings: {
                    targetLength: '2_pages',
                    style: 'modern',
                    focusAreas: ['leadership', 'technical_skills', 'achievements']
                }
            },
            status: 'approved'
        });
        console.log(`✅ Created optimized variant: ${optimizedVariant.name} (${optimizedVariant.id})`);

        // Generate cover letter
        console.log('📝 Generating cover letter...');
        const coverLetter = await coverLetterService.generateCoverLetter(
            optimizationResult.optimizedResume,
            sampleJob,
            {
                tone: 'professional',
                length: 'medium',
                focusPoints: ['experience_match', 'achievements', 'cultural_fit'],
                customIntro: null,
                customClosing: null
            }
        );

        const coverLetterVariant = await variantService.create({
            orgId: demoOrg.id,
            userId: adminUser.id,
            resumeId: sampleResume.id,
            jobId: sampleJob.id,
            name: 'Cover Letter for InnovationTech',
            type: 'cover_letter',
            data: coverLetter,
            metadata: {
                tone: coverLetter.tone,
                wordCount: coverLetter.wordCount,
                focusPoints: coverLetter.focusPoints,
                qualityScore: coverLetter.qualityScore
            },
            status: 'approved'
        });
        console.log(`✅ Created cover letter: ${coverLetterVariant.name} (${coverLetterVariant.id})`);

        // Export optimized resume
        console.log('📤 Exporting optimized resume...');
        const exportResult = await exportService.exportResume(
            optimizationResult.optimizedResume,
            {
                format: 'pdf',
                template: 'modern',
                includeCoverLetter: false,
                watermark: false,
                quality: 'high'
            }
        );
        console.log(`✅ Exported resume: ${exportResult.fileUrl}`);

        // Export cover letter
        console.log('📤 Exporting cover letter...');
        const coverLetterExport = await exportService.exportCoverLetter(
            coverLetter,
            {
                format: 'pdf',
                template: 'modern',
                watermark: false,
                quality: 'high'
            }
        );
        console.log(`✅ Exported cover letter: ${coverLetterExport.fileUrl}`);

        // Create additional demo data
        console.log('📊 Creating additional demo data...');

        // Create a few more resumes for demonstration
        const additionalResumes = [
            {
                name: 'Jane Smith - Product Manager',
                contact: {
                    name: 'Jane Smith',
                    email: 'jane.smith@techcorp-demo.com',
                    phone: '(555) 987-6543',
                    linkedin: 'linkedin.com/in/janesmith',
                    location: 'New York, NY'
                },
                summary: 'Product Manager with 6+ years of experience launching successful products and leading cross-functional teams.',
                experience: [
                    {
                        title: 'Senior Product Manager',
                        company: 'ProductCorp',
                        location: 'New York, NY',
                        startDate: '2020-01',
                        endDate: null,
                        isCurrent: true,
                        bullets: [
                            'Led product strategy for B2B SaaS platform with $10M ARR',
                            'Managed team of 8 engineers and 3 designers',
                            'Increased user engagement by 45% through feature optimization',
                            'Launched 3 major product features with 95% user satisfaction'
                        ]
                    }
                ],
                skills: ['Product Strategy', 'User Research', 'Agile', 'SQL', 'Analytics', 'A/B Testing'],
                education: [
                    {
                        degree: 'MBA in Business Administration',
                        institution: 'Stanford University',
                        location: 'Stanford, CA',
                        startYear: 2018,
                        endYear: 2020
                    }
                ]
            },
            {
                name: 'Mike Johnson - Data Scientist',
                contact: {
                    name: 'Mike Johnson',
                    email: 'mike.johnson@techcorp-demo.com',
                    phone: '(555) 456-7890',
                    linkedin: 'linkedin.com/in/mikejohnson',
                    location: 'Seattle, WA'
                },
                summary: 'Data Scientist with expertise in machine learning, statistical analysis, and big data processing.',
                experience: [
                    {
                        title: 'Senior Data Scientist',
                        company: 'DataTech',
                        location: 'Seattle, WA',
                        startDate: '2019-03',
                        endDate: null,
                        isCurrent: true,
                        bullets: [
                            'Developed ML models improving prediction accuracy by 30%',
                            'Processed and analyzed 100TB+ of data using Spark and Hadoop',
                            'Built real-time recommendation system serving 1M+ users',
                            'Mentored 4 junior data scientists and established best practices'
                        ]
                    }
                ],
                skills: ['Python', 'R', 'SQL', 'Machine Learning', 'Deep Learning', 'Spark', 'Hadoop'],
                education: [
                    {
                        degree: 'Master of Science in Statistics',
                        institution: 'University of Washington',
                        location: 'Seattle, WA',
                        startYear: 2017,
                        endYear: 2019
                    }
                ]
            }
        ];

        for (const resumeData of additionalResumes) {
            const resume = await resumeService.create({
                orgId: demoOrg.id,
                userId: editorUser.id,
                ...resumeData
            });
            console.log(`✅ Created additional resume: ${resume.name} (${resume.id})`);
        }

        // Create additional job descriptions
        const additionalJobs = [
            {
                title: 'Product Manager',
                company: 'GrowthStartup',
                location: 'New York, NY',
                description: 'Seeking a Product Manager to drive product strategy and execution...',
                requirements: {
                    requiredSkills: ['Product Strategy', 'User Research', 'Analytics', 'Agile'],
                    preferredSkills: ['SQL', 'A/B Testing', 'Growth Hacking'],
                    experience: '3+ years'
                }
            },
            {
                title: 'Data Scientist',
                company: 'AI Company',
                location: 'Seattle, WA',
                description: 'Looking for a Data Scientist to build ML models and analyze data...',
                requirements: {
                    requiredSkills: ['Python', 'Machine Learning', 'SQL', 'Statistics'],
                    preferredSkills: ['Deep Learning', 'Spark', 'AWS'],
                    experience: '4+ years'
                }
            }
        ];

        for (const jobData of additionalJobs) {
            const job = await jobService.create({
                orgId: demoOrg.id,
                userId: adminUser.id,
                ...jobData
            });
            console.log(`✅ Created additional job: ${job.title} at ${job.company} (${job.id})`);
        }

        console.log('\n🎉 Demo data seeding completed successfully!');
        console.log('\n📋 Demo Organization Details:');
        console.log(`   Name: ${demoOrg.name}`);
        console.log(`   ID: ${demoOrg.id}`);
        console.log(`   Plan: ${demoOrg.plan}`);

        console.log('\n👥 Demo Users:');
        console.log(`   Admin: admin@techcorp-demo.com / demo-admin-2024!`);
        console.log(`   Editor: editor@techcorp-demo.com / demo-editor-2024!`);
        console.log(`   Viewer: viewer@techcorp-demo.com / demo-viewer-2024!`);

        console.log('\n📄 Sample Data:');
        console.log(`   Resume: ${sampleResume.name} (${sampleResume.id})`);
        console.log(`   Job: ${sampleJob.title} at ${sampleJob.company} (${sampleJob.id})`);
        console.log(`   Optimized Variant: ${optimizedVariant.name} (${optimizedVariant.id})`);
        console.log(`   Cover Letter: ${coverLetterVariant.name} (${coverLetterVariant.id})`);

        console.log('\n📊 Statistics:');
        console.log(`   ATS Score: ${(optimizationResult.atsScore * 100).toFixed(1)}%`);
        console.log(`   Keyword Match: ${(optimizationResult.keywordMatch * 100).toFixed(1)}%`);
        console.log(`   Readability Score: ${(optimizationResult.readabilityScore * 100).toFixed(1)}%`);

        console.log('\n🔗 Export URLs:');
        console.log(`   Resume PDF: ${exportResult.fileUrl}`);
        console.log(`   Cover Letter PDF: ${coverLetterExport.fileUrl}`);

    } catch (error) {
        console.error('❌ Error seeding demo data:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
    seedDemoData()
        .then(() => {
            console.log('✅ Demo data seeding completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Demo data seeding failed:', error);
            process.exit(1);
        });
}

export { seedDemoData };
