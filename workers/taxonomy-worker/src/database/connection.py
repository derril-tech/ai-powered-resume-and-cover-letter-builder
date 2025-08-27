"""
Database Connection
Handles database connectivity for the taxonomy worker.
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
                # Create taxonomy tables
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS taxonomy_categories (
                        id SERIAL PRIMARY KEY,
                        key VARCHAR(100) UNIQUE NOT NULL,
                        name VARCHAR(200) NOT NULL,
                        description TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS taxonomy_skills (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(200) NOT NULL,
                        category_key VARCHAR(100) REFERENCES taxonomy_categories(key),
                        description TEXT,
                        level VARCHAR(50) DEFAULT 'unknown',
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        UNIQUE(name, category_key)
                    )
                """)

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS skill_aliases (
                        id SERIAL PRIMARY KEY,
                        skill_id INTEGER REFERENCES taxonomy_skills(id),
                        alias VARCHAR(200) NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        UNIQUE(skill_id, alias)
                    )
                """)

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS normalization_rules (
                        id SERIAL PRIMARY KEY,
                        pattern VARCHAR(500) NOT NULL,
                        replacement VARCHAR(200),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS skill_matches (
                        id SERIAL PRIMARY KEY,
                        source_skill VARCHAR(200) NOT NULL,
                        target_skill VARCHAR(200) NOT NULL,
                        confidence FLOAT NOT NULL,
                        match_type VARCHAR(50),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)

                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS learning_mappings (
                        id SERIAL PRIMARY KEY,
                        source_skill VARCHAR(200) NOT NULL,
                        target_skill VARCHAR(200) NOT NULL,
                        source_type VARCHAR(50),
                        confidence FLOAT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)

                logger.info("Database tables created successfully")

        except Exception as e:
            logger.error(f"Failed to create tables: {e}")
            raise

    async def store_taxonomy_skill(self, skill_data: Dict[str, Any]) -> int:
        """Store a skill in the taxonomy"""
        try:
            async with self.get_connection() as conn:
                # Insert or update skill
                skill_id = await conn.fetchval("""
                    INSERT INTO taxonomy_skills (name, category_key, description, level)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (name, category_key)
                    DO UPDATE SET
                        description = EXCLUDED.description,
                        level = EXCLUDED.level,
                        updated_at = NOW()
                    RETURNING id
                """, skill_data["name"], skill_data["category"], skill_data.get("description"),
                     skill_data.get("level", "unknown"))

                # Store aliases
                if skill_data.get("aliases"):
                    for alias in skill_data["aliases"]:
                        await conn.execute("""
                            INSERT INTO skill_aliases (skill_id, alias)
                            VALUES ($1, $2)
                            ON CONFLICT (skill_id, alias) DO NOTHING
                        """, skill_id, alias)

                return skill_id

        except Exception as e:
            logger.error(f"Failed to store taxonomy skill: {e}")
            raise

    async def get_taxonomy_skills(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get taxonomy skills"""
        try:
            async with self.get_connection() as conn:
                if category:
                    rows = await conn.fetch("""
                        SELECT s.*, array_agg(sa.alias) as aliases
                        FROM taxonomy_skills s
                        LEFT JOIN skill_aliases sa ON s.id = sa.skill_id
                        WHERE s.category_key = $1
                        GROUP BY s.id
                    """, category)
                else:
                    rows = await conn.fetch("""
                        SELECT s.*, array_agg(sa.alias) as aliases
                        FROM taxonomy_skills s
                        LEFT JOIN skill_aliases sa ON s.id = sa.skill_id
                        GROUP BY s.id
                    """)

                skills = []
                for row in rows:
                    skill = dict(row)
                    # Handle NULL aliases array
                    if skill["aliases"] and skill["aliases"][0] is None:
                        skill["aliases"] = []
                    skills.append(skill)

                return skills

        except Exception as e:
            logger.error(f"Failed to get taxonomy skills: {e}")
            return []

    async def store_normalization_result(
        self,
        original_skill: str,
        normalized_skill: str,
        confidence: float,
        source: Optional[str] = None,
    ):
        """Store normalization result for learning"""
        try:
            async with self.get_connection() as conn:
                await conn.execute("""
                    INSERT INTO skill_matches (source_skill, target_skill, confidence, match_type)
                    VALUES ($1, $2, $3, $4)
                """, original_skill, normalized_skill, confidence, source or "unknown")

        except Exception as e:
            logger.warning(f"Failed to store normalization result: {e}")

    async def get_learning_mappings(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get stored learning mappings"""
        try:
            async with self.get_connection() as conn:
                rows = await conn.fetch("""
                    SELECT * FROM learning_mappings
                    ORDER BY created_at DESC
                    LIMIT $1
                """, limit)

                return [dict(row) for row in rows]

        except Exception as e:
            logger.warning(f"Failed to get learning mappings: {e}")
            return []

    async def store_learning_mapping(
        self,
        source_skill: str,
        target_skill: str,
        source_type: str,
        confidence: Optional[float] = None,
    ):
        """Store a learning mapping"""
        try:
            async with self.get_connection() as conn:
                await conn.execute("""
                    INSERT INTO learning_mappings (source_skill, target_skill, source_type, confidence)
                    VALUES ($1, $2, $3, $4)
                """, source_skill, target_skill, source_type, confidence)

        except Exception as e:
            logger.warning(f"Failed to store learning mapping: {e}")

    async def get_skill_stats(self) -> Dict[str, Any]:
        """Get skill statistics"""
        try:
            async with self.get_connection() as conn:
                # Get category counts
                category_counts = await conn.fetch("""
                    SELECT category_key, COUNT(*) as count
                    FROM taxonomy_skills
                    GROUP BY category_key
                """)

                # Get total counts
                total_skills = await conn.fetchval("SELECT COUNT(*) FROM taxonomy_skills")
                total_aliases = await conn.fetchval("SELECT COUNT(*) FROM skill_aliases")
                total_matches = await conn.fetchval("SELECT COUNT(*) FROM skill_matches")

                return {
                    "total_skills": total_skills or 0,
                    "total_aliases": total_aliases or 0,
                    "total_matches": total_matches or 0,
                    "categories": {row["category_key"]: row["count"] for row in category_counts},
                }

        except Exception as e:
            logger.warning(f"Failed to get skill stats: {e}")
            return {
                "total_skills": 0,
                "total_aliases": 0,
                "total_matches": 0,
                "categories": {},
            }

    async def search_similar_skills(
        self,
        skill_name: str,
        limit: int = 10,
        threshold: float = 0.5,
    ) -> List[Dict[str, Any]]:
        """Search for similar skills in the database"""
        try:
            async with self.get_connection() as conn:
                # Simple text similarity search
                rows = await conn.fetch("""
                    SELECT s.name, s.category_key, s.description,
                           similarity(s.name, $1) as score
                    FROM taxonomy_skills s
                    WHERE similarity(s.name, $1) > $2
                    ORDER BY score DESC
                    LIMIT $3
                """, skill_name, threshold, limit)

                return [dict(row) for row in rows]

        except Exception as e:
            logger.warning(f"Failed to search similar skills: {e}")
            return []
