"""
Database Connection
Handles database connections and operations for storing parsed job data.
"""

import os
import logging
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager
import json

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database manager for storing parsed job description data"""

    def __init__(self):
        self.connection_string = os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:postgres@localhost:5432/resume_builder"
        )
        self.connection = None
        self._initialized = False

    async def connect(self):
        """Initialize database connection"""
        if self._initialized:
            return

        try:
            # Try to connect using psycopg2 if available
            try:
                import psycopg2
                import psycopg2.extras

                self.connection = psycopg2.connect(self.connection_string)
                self.connection.autocommit = True
                logger.info("Connected to PostgreSQL database")

            except ImportError:
                logger.warning("psycopg2 not available, using mock database connection")
                self.connection = None

            self._initialized = True

        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    async def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
        self._initialized = False

    async def store_parsed_job(self, job_id: str, parsed_data: Dict[str, Any]):
        """Store parsed job description data"""
        if not self.connection:
            logger.warning("No database connection, skipping data storage")
            return

        try:
            # Convert data to JSON for storage
            skills_json = json.dumps(parsed_data.get("skills", []))
            keywords_json = json.dumps(parsed_data.get("keywords", []))
            confidence_scores_json = json.dumps(parsed_data.get("confidence_scores", {}))

            with self.connection.cursor() as cursor:
                # Check if job exists, if not, this is just for logging
                cursor.execute("""
                    UPDATE jobs
                    SET
                        parsed_data = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    json.dumps({
                        "skills": parsed_data.get("skills", []),
                        "keywords": parsed_data.get("keywords", []),
                        "experience_level": parsed_data.get("experience_level"),
                        "education_level": parsed_data.get("education_level"),
                        "salary_range": parsed_data.get("salary_range"),
                        "location": parsed_data.get("location"),
                        "job_type": parsed_data.get("job_type"),
                        "benefits": parsed_data.get("benefits", []),
                        "responsibilities": parsed_data.get("responsibilities", []),
                        "qualifications": parsed_data.get("qualifications", []),
                        "technologies": parsed_data.get("technologies", []),
                        "soft_skills": parsed_data.get("soft_skills", []),
                        "industry_keywords": parsed_data.get("industry_keywords", []),
                        "confidence_scores": parsed_data.get("confidence_scores", {}),
                    }),
                    job_id
                ))

                if cursor.rowcount == 0:
                    logger.warning(f"Job {job_id} not found in database")
                else:
                    logger.info(f"Stored parsed data for job {job_id}")

        except Exception as e:
            logger.error(f"Failed to store parsed job data: {e}")
            # Don't raise exception as this shouldn't break the parsing flow

    async def get_parsed_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve parsed job data"""
        if not self.connection:
            return None

        try:
            with self.connection.cursor(cursor_factory=None) as cursor:
                cursor.execute("""
                    SELECT parsed_data
                    FROM jobs
                    WHERE id = %s
                """, (job_id,))

                result = cursor.fetchone()
                if result and result[0]:
                    return result[0]
                return None

        except Exception as e:
            logger.error(f"Failed to retrieve parsed job data: {e}")
            return None

    async def store_skill_taxonomy(self, skills: List[str]):
        """Store or update skill taxonomy"""
        if not self.connection or not skills:
            return

        try:
            with self.connection.cursor() as cursor:
                for skill in skills:
                    # Insert or update skill in taxonomy
                    cursor.execute("""
                        INSERT INTO skills_taxonomy (name, category, created_at, updated_at)
                        VALUES (%s, 'extracted', NOW(), NOW())
                        ON CONFLICT (name)
                        DO UPDATE SET
                            updated_at = NOW()
                    """, (skill,))

                logger.info(f"Stored {len(skills)} skills in taxonomy")

        except Exception as e:
            logger.error(f"Failed to store skill taxonomy: {e}")

    async def get_skill_taxonomy(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get skill taxonomy"""
        if not self.connection:
            return []

        try:
            with self.connection.cursor(cursor_factory=None) as cursor:
                cursor.execute("""
                    SELECT name, category, aliases, created_at
                    FROM skills_taxonomy
                    ORDER BY updated_at DESC
                    LIMIT %s
                """, (limit,))

                skills = []
                for row in cursor.fetchall():
                    skills.append({
                        "name": row[0],
                        "category": row[1],
                        "aliases": row[2] or [],
                        "created_at": row[3].isoformat() if row[3] else None,
                    })

                return skills

        except Exception as e:
            logger.error(f"Failed to get skill taxonomy: {e}")
            return []

    async def get_job_parsing_stats(self) -> Dict[str, Any]:
        """Get job parsing statistics"""
        if not self.connection:
            return {}

        try:
            with self.connection.cursor(cursor_factory=None) as cursor:
                # Get total jobs
                cursor.execute("SELECT COUNT(*) FROM jobs")
                total_jobs = cursor.fetchone()[0]

                # Get jobs with parsed data
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM jobs
                    WHERE parsed_data IS NOT NULL
                """)
                parsed_jobs = cursor.fetchone()[0]

                # Get average confidence scores
                cursor.execute("""
                    SELECT
                        AVG((parsed_data->>'confidence_scores'->>'overall')::float) as avg_confidence,
                        COUNT(*) as jobs_with_confidence
                    FROM jobs
                    WHERE parsed_data IS NOT NULL
                    AND parsed_data->>'confidence_scores' IS NOT NULL
                """)

                confidence_result = cursor.fetchone()
                avg_confidence = confidence_result[0] if confidence_result[0] else 0
                jobs_with_confidence = confidence_result[1] if confidence_result[1] else 0

                # Get skill extraction stats
                cursor.execute("""
                    SELECT
                        SUM(json_array_length(parsed_data->'skills')) as total_skills_extracted,
                        AVG(json_array_length(parsed_data->'skills')) as avg_skills_per_job
                    FROM jobs
                    WHERE parsed_data IS NOT NULL
                    AND json_array_length(parsed_data->'skills') > 0
                """)

                skills_result = cursor.fetchone()
                total_skills = skills_result[0] if skills_result[0] else 0
                avg_skills = skills_result[1] if skills_result[1] else 0

                return {
                    "total_jobs": total_jobs,
                    "parsed_jobs": parsed_jobs,
                    "parsing_coverage": (parsed_jobs / total_jobs * 100) if total_jobs > 0 else 0,
                    "average_confidence": float(avg_confidence) if avg_confidence else 0,
                    "jobs_with_confidence": jobs_with_confidence,
                    "total_skills_extracted": total_skills,
                    "average_skills_per_job": float(avg_skills) if avg_skills else 0,
                }

        except Exception as e:
            logger.error(f"Failed to get job parsing stats: {e}")
            return {}

    async def cleanup_old_parsed_data(self, days_old: int = 90):
        """Clean up old parsed data to save space"""
        if not self.connection:
            return

        try:
            with self.connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE jobs
                    SET parsed_data = NULL
                    WHERE updated_at < NOW() - INTERVAL '%s days'
                    AND parsed_data IS NOT NULL
                """, (days_old,))

                cleaned_count = cursor.rowcount
                logger.info(f"Cleaned up parsed data for {cleaned_count} old jobs")

        except Exception as e:
            logger.error(f"Failed to cleanup old parsed data: {e}")

    async def search_similar_jobs(self, skills: List[str], limit: int = 10) -> List[Dict[str, Any]]:
        """Find jobs with similar skills using vector similarity"""
        if not self.connection or not skills:
            return []

        try:
            # This would use pgvector for similarity search
            # For now, use basic text matching
            skills_str = ' '.join(skills)

            with self.connection.cursor(cursor_factory=None) as cursor:
                cursor.execute("""
                    SELECT
                        id,
                        title,
                        company,
                        parsed_data,
                        ts_rank_cd(to_tsvector('english', COALESCE(description, '')), plainto_tsquery('english', %s)) as relevance
                    FROM jobs
                    WHERE parsed_data IS NOT NULL
                    AND (
                        to_tsvector('english', COALESCE(description, ''))
                        @@ plainto_tsquery('english', %s)
                        OR
                        EXISTS (
                            SELECT 1
                            FROM json_array_elements_text(parsed_data->'skills') as skill
                            WHERE skill ILIKE ANY(%s)
                        )
                    )
                    ORDER BY relevance DESC
                    LIMIT %s
                """, (
                    skills_str,
                    skills_str,
                    [f'%{skill}%' for skill in skills],
                    limit
                ))

                similar_jobs = []
                for row in cursor.fetchall():
                    similar_jobs.append({
                        "id": row[0],
                        "title": row[1],
                        "company": row[2],
                        "parsed_data": row[3],
                        "relevance": float(row[4]) if row[4] else 0,
                    })

                return similar_jobs

        except Exception as e:
            logger.error(f"Failed to search similar jobs: {e}")
            return []
