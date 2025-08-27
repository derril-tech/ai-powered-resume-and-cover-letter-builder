"""
Database Connection
Handles database connectivity for the optimize worker.
"""

import os
import logging
from typing import Optional, Dict, Any
import asyncpg
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages database connections and operations"""

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.connection_string = self._build_connection_string()

    def _build_connection_string(self) -> str:
        """Build PostgreSQL connection string"""
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        database = os.getenv("DB_NAME", "ai_resume_builder")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "password")

        return f"postgresql://{user}:{password}@{host}:{port}/{database}"

    async def connect(self):
        """Establish database connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                self.connection_string,
                min_size=1,
                max_size=10,
                command_timeout=60,
            )
            logger.info("Database connection pool created successfully")

            # Create tables if they don't exist
            await self._create_tables()

        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    async def disconnect(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")

    @asynccontextmanager
    async def get_connection(self):
        """Get a database connection from the pool"""
        if not self.pool:
            raise RuntimeError("Database not connected")

        async with self.pool.acquire() as connection:
            yield connection

    async def _create_tables(self):
        """Create necessary database tables"""
        try:
            async with self.get_connection() as conn:
                # Create optimization tables
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS optimization_results (
                        id SERIAL PRIMARY KEY,
                        resume_id VARCHAR(100) NOT NULL,
                        optimization_type VARCHAR(50) NOT NULL,
                        optimization_score FLOAT NOT NULL,
                        ats_score FLOAT,
                        keyword_score FLOAT,
                        processing_time_ms INTEGER,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        UNIQUE(resume_id, optimization_type, created_at)
                    )
                """)

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS optimization_improvements (
                        id SERIAL PRIMARY KEY,
                        resume_id VARCHAR(100) NOT NULL,
                        optimization_type VARCHAR(50) NOT NULL,
                        improvement_text TEXT NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS star_generations (
                        id SERIAL PRIMARY KEY,
                        resume_id VARCHAR(100) NOT NULL,
                        original_text TEXT,
                        star_bullets JSONB,
                        impact_score FLOAT,
                        keyword_infused BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS keyword_optimizations (
                        id SERIAL PRIMARY KEY,
                        resume_id VARCHAR(100) NOT NULL,
                        keywords_added JSONB,
                        keyword_density FLOAT,
                        naturalness_score FLOAT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS ats_optimizations (
                        id SERIAL PRIMARY KEY,
                        resume_id VARCHAR(100) NOT NULL,
                        ats_score FLOAT,
                        issues_fixed JSONB,
                        recommendations JSONB,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS optimization_suggestions (
                        id SERIAL PRIMARY KEY,
                        resume_id VARCHAR(100) NOT NULL,
                        section_name VARCHAR(100),
                        suggestion_type VARCHAR(50),
                        suggestion_text TEXT,
                        priority INTEGER DEFAULT 5,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)

                logger.info("Database tables created successfully")

        except Exception as e:
            logger.error(f"Failed to create tables: {e}")
            raise

    async def store_optimization_result(
        self,
        resume_id: str,
        result: Dict[str, Any],
        optimization_type: str,
    ):
        """Store optimization result"""
        try:
            async with self.get_connection() as conn:
                await conn.execute("""
                    INSERT INTO optimization_results
                    (resume_id, optimization_type, optimization_score, ats_score, keyword_score, processing_time_ms)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, resume_id, optimization_type, result.get("optimization_score", 0),
                     result.get("ats_score", 0), result.get("keyword_match_score", 0),
                     result.get("processing_stats", {}).get("processing_time_ms", 0))

                # Store improvements
                for improvement in result.get("improvements_made", []):
                    await conn.execute("""
                        INSERT INTO optimization_improvements
                        (resume_id, optimization_type, improvement_text)
                        VALUES ($1, $2, $3)
                    """, resume_id, optimization_type, improvement)

        except Exception as e:
            logger.warning(f"Failed to store optimization result: {e}")

    async def get_optimization_history(self, resume_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get optimization history for a resume"""
        try:
            async with self.get_connection() as conn:
                rows = await conn.fetch("""
                    SELECT * FROM optimization_results
                    WHERE resume_id = $1
                    ORDER BY created_at DESC
                    LIMIT $2
                """, resume_id, limit)

                return [dict(row) for row in rows]

        except Exception as e:
            logger.warning(f"Failed to get optimization history: {e}")
            return []

    async def get_optimization_suggestions(self, resume_id: str) -> List[Dict[str, Any]]:
        """Get optimization suggestions for a resume"""
        try:
            async with self.get_connection() as conn:
                rows = await conn.fetch("""
                    SELECT * FROM optimization_suggestions
                    WHERE resume_id = $1
                    ORDER BY priority DESC, created_at DESC
                """, resume_id)

                return [dict(row) for row in rows]

        except Exception as e:
            logger.warning(f"Failed to get optimization suggestions: {e}")
            return []

    async def store_star_generation(
        self,
        resume_id: str,
        original_text: str,
        star_bullets: List[str],
        impact_score: float,
        keyword_infused: bool,
    ):
        """Store STAR generation result"""
        try:
            async with self.get_connection() as conn:
                await conn.execute("""
                    INSERT INTO star_generations
                    (resume_id, original_text, star_bullets, impact_score, keyword_infused)
                    VALUES ($1, $2, $3, $4, $5)
                """, resume_id, original_text, star_bullets, impact_score, keyword_infused)

        except Exception as e:
            logger.warning(f"Failed to store STAR generation: {e}")

    async def store_keyword_optimization(
        self,
        resume_id: str,
        keywords_added: List[str],
        keyword_density: float,
        naturalness_score: float,
    ):
        """Store keyword optimization result"""
        try:
            async with self.get_connection() as conn:
                await conn.execute("""
                    INSERT INTO keyword_optimizations
                    (resume_id, keywords_added, keyword_density, naturalness_score)
                    VALUES ($1, $2, $3, $4)
                """, resume_id, keywords_added, keyword_density, naturalness_score)

        except Exception as e:
            logger.warning(f"Failed to store keyword optimization: {e}")

    async def store_ats_optimization(
        self,
        resume_id: str,
        ats_score: float,
        issues_fixed: List[str],
        recommendations: List[str],
    ):
        """Store ATS optimization result"""
        try:
            async with self.get_connection() as conn:
                await conn.execute("""
                    INSERT INTO ats_optimizations
                    (resume_id, ats_score, issues_fixed, recommendations)
                    VALUES ($1, $2, $3, $4)
                """, resume_id, ats_score, issues_fixed, recommendations)

        except Exception as e:
            logger.warning(f"Failed to store ATS optimization: {e}")

    async def get_resume_stats(self, resume_id: str) -> Dict[str, Any]:
        """Get statistics for a resume"""
        try:
            async with self.get_connection() as conn:
                # Get optimization counts
                opt_count = await conn.fetchval("""
                    SELECT COUNT(*) FROM optimization_results WHERE resume_id = $1
                """, resume_id)

                # Get latest scores
                latest_scores = await conn.fetchrow("""
                    SELECT optimization_score, ats_score, keyword_score
                    FROM optimization_results
                    WHERE resume_id = $1
                    ORDER BY created_at DESC
                    LIMIT 1
                """, resume_id)

                # Get STAR generation count
                star_count = await conn.fetchval("""
                    SELECT COUNT(*) FROM star_generations WHERE resume_id = $1
                """, resume_id)

                return {
                    "resume_id": resume_id,
                    "total_optimizations": opt_count or 0,
                    "star_generations": star_count or 0,
                    "latest_scores": dict(latest_scores) if latest_scores else {},
                }

        except Exception as e:
            logger.warning(f"Failed to get resume stats: {e}")
            return {"resume_id": resume_id, "error": str(e)}
