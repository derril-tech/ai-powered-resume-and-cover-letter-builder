import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SemanticSearchEntity } from '../entities/semantic_search.entity';

@Injectable()
export class SemanticSearchService {
    constructor(
        @InjectRepository(SemanticSearchEntity)
        private readonly repo: Repository<SemanticSearchEntity>,
    ) { }

    async create(data: Partial<SemanticSearchEntity>) {
        const searchDoc = this.repo.create(data);
        return this.repo.save(searchDoc);
    }

    async update(id: string, data: Partial<SemanticSearchEntity>) {
        await this.repo.update(id, data);
        return this.get(id);
    }

    async get(id: string) {
        return this.repo.findOne({ where: { id } });
    }

    async delete(id: string) {
        return this.repo.delete(id);
    }

    async searchResumes(orgId: string, query: string, filters?: {
        skills?: string[];
        experience?: string[];
        location?: string;
        level?: string;
        limit?: number;
    }) {
        // TODO: Generate embedding for query using OpenAI API
        const queryEmbedding = await this.generateEmbedding(query);

        const limit = filters?.limit || 10;

        // Use pgvector for similarity search
        const results = await this.repo
            .createQueryBuilder('search')
            .where('search.orgId = :orgId', { orgId })
            .andWhere('search.type = :type', { type: 'resume' })
            .andWhere('search.embedding IS NOT NULL')
            .orderBy('search.embedding <-> :queryEmbedding', 'ASC')
            .setParameter('queryEmbedding', queryEmbedding)
            .limit(limit)
            .getMany();

        // Apply additional filters
        let filteredResults = results;

        if (filters?.skills?.length) {
            filteredResults = filteredResults.filter(result =>
                filters.skills!.some(skill =>
                    result.metadata?.skills?.includes(skill)
                )
            );
        }

        if (filters?.experience?.length) {
            filteredResults = filteredResults.filter(result =>
                filters.experience!.some(exp =>
                    result.metadata?.experience?.includes(exp)
                )
            );
        }

        if (filters?.location) {
            filteredResults = filteredResults.filter(result =>
                result.metadata?.location?.toLowerCase().includes(filters.location!.toLowerCase())
            );
        }

        if (filters?.level) {
            filteredResults = filteredResults.filter(result =>
                result.metadata?.level === filters.level
            );
        }

        return filteredResults;
    }

    async searchJobs(orgId: string, query: string, filters?: {
        skills?: string[];
        location?: string;
        industry?: string;
        remote?: boolean;
        salary?: { min?: number; max?: number };
        limit?: number;
    }) {
        // TODO: Generate embedding for query using OpenAI API
        const queryEmbedding = await this.generateEmbedding(query);

        const limit = filters?.limit || 10;

        // Use pgvector for similarity search
        const results = await this.repo
            .createQueryBuilder('search')
            .where('search.orgId = :orgId', { orgId })
            .andWhere('search.type = :type', { type: 'job' })
            .andWhere('search.embedding IS NOT NULL')
            .orderBy('search.embedding <-> :queryEmbedding', 'ASC')
            .setParameter('queryEmbedding', queryEmbedding)
            .limit(limit)
            .getMany();

        // Apply additional filters
        let filteredResults = results;

        if (filters?.skills?.length) {
            filteredResults = filteredResults.filter(result =>
                filters.skills!.some(skill =>
                    result.metadata?.skills?.includes(skill)
                )
            );
        }

        if (filters?.location) {
            filteredResults = filteredResults.filter(result =>
                result.metadata?.location?.toLowerCase().includes(filters.location!.toLowerCase())
            );
        }

        if (filters?.industry) {
            filteredResults = filteredResults.filter(result =>
                result.metadata?.industry === filters.industry
            );
        }

        if (filters?.remote !== undefined) {
            filteredResults = filteredResults.filter(result =>
                result.metadata?.remote === filters.remote
            );
        }

        if (filters?.salary) {
            filteredResults = filteredResults.filter(result => {
                const salary = result.metadata?.salary;
                if (!salary) return true;

                if (filters.salary!.min && salary < filters.salary!.min) return false;
                if (filters.salary!.max && salary > filters.salary!.max) return false;
                return true;
            });
        }

        return filteredResults;
    }

    async findSimilarResumes(resumeId: string, orgId: string, limit: number = 5) {
        const resume = await this.repo.findOne({
            where: { documentId: resumeId, type: 'resume', orgId }
        });

        if (!resume || !resume.embedding) {
            throw new BadRequestException('Resume not found or no embedding available');
        }

        return this.repo
            .createQueryBuilder('search')
            .where('search.orgId = :orgId', { orgId })
            .andWhere('search.type = :type', { type: 'resume' })
            .andWhere('search.documentId != :resumeId', { resumeId })
            .andWhere('search.embedding IS NOT NULL')
            .orderBy('search.embedding <-> :resumeEmbedding', 'ASC')
            .setParameter('resumeEmbedding', resume.embedding)
            .limit(limit)
            .getMany();
    }

    async findSimilarJobs(jobId: string, orgId: string, limit: number = 5) {
        const job = await this.repo.findOne({
            where: { documentId: jobId, type: 'job', orgId }
        });

        if (!job || !job.embedding) {
            throw new BadRequestException('Job not found or no embedding available');
        }

        return this.repo
            .createQueryBuilder('search')
            .where('search.orgId = :orgId', { orgId })
            .andWhere('search.type = :type', { type: 'job' })
            .andWhere('search.documentId != :jobId', { jobId })
            .andWhere('search.embedding IS NOT NULL')
            .orderBy('search.embedding <-> :jobEmbedding', 'ASC')
            .setParameter('jobEmbedding', job.embedding)
            .limit(limit)
            .getMany();
    }

    async indexResume(resumeId: string, orgId: string, userId: string, content: any) {
        // TODO: Generate embedding for resume content
        const embedding = await this.generateEmbedding(JSON.stringify(content));

        const searchDoc = await this.repo.findOne({
            where: { documentId: resumeId, type: 'resume', orgId }
        });

        if (searchDoc) {
            return this.update(searchDoc.id, {
                title: content.title || 'Resume',
                content: JSON.stringify(content),
                metadata: {
                    skills: content.skills || [],
                    experience: content.experience || [],
                    education: content.education || [],
                    location: content.location,
                    level: content.level
                },
                embedding
            });
        } else {
            return this.create({
                orgId,
                userId,
                type: 'resume',
                documentId: resumeId,
                title: content.title || 'Resume',
                content: JSON.stringify(content),
                metadata: {
                    skills: content.skills || [],
                    experience: content.experience || [],
                    education: content.education || [],
                    location: content.location,
                    level: content.level
                },
                embedding
            });
        }
    }

    async indexJob(jobId: string, orgId: string, userId: string, content: any) {
        // TODO: Generate embedding for job content
        const embedding = await this.generateEmbedding(JSON.stringify(content));

        const searchDoc = await this.repo.findOne({
            where: { documentId: jobId, type: 'job', orgId }
        });

        if (searchDoc) {
            return this.update(searchDoc.id, {
                title: content.title || 'Job Posting',
                content: JSON.stringify(content),
                metadata: {
                    skills: content.skills || [],
                    location: content.location,
                    industry: content.industry,
                    salary: content.salary,
                    remote: content.remote,
                    keywords: content.keywords || []
                },
                embedding
            });
        } else {
            return this.create({
                orgId,
                userId,
                type: 'job',
                documentId: jobId,
                title: content.title || 'Job Posting',
                content: JSON.stringify(content),
                metadata: {
                    skills: content.skills || [],
                    location: content.location,
                    industry: content.industry,
                    salary: content.salary,
                    remote: content.remote,
                    keywords: content.keywords || []
                },
                embedding
            });
        }
    }

    async removeIndex(documentId: string, type: string, orgId: string) {
        const searchDoc = await this.repo.findOne({
            where: { documentId, type, orgId }
        });

        if (searchDoc) {
            return this.delete(searchDoc.id);
        }
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        // TODO: Call OpenAI API to generate embeddings
        // This is a mock implementation
        const mockEmbedding = new Array(1536).fill(0).map(() => Math.random() - 0.5);
        return mockEmbedding;
    }

    async getSearchStats(orgId: string) {
        const stats = await this.repo
            .createQueryBuilder('search')
            .select([
                'search.type',
                'COUNT(*) as count'
            ])
            .where('search.orgId = :orgId', { orgId })
            .groupBy('search.type')
            .getRawMany();

        const totalDocuments = await this.repo.count({
            where: { orgId }
        });

        const indexedDocuments = await this.repo.count({
            where: { orgId, embedding: { not: null } }
        });

        const typeCounts = stats.reduce((acc, stat) => {
            acc[stat.search_type] = parseInt(stat.count);
            return acc;
        }, {} as Record<string, number>);

        return {
            total: totalDocuments,
            indexed: indexedDocuments,
            byType: typeCounts
        };
    }
}
