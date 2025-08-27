"""
Database Connection
Handles database connectivity for the ATS check worker.
"""

import os
import logging
from typing import Optional, Dict, Any, List
import asyncpg
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self) -> None:
        self.pool: Optional[asyncpg.Pool] = None
        self.conn_str = self._dsn()

    def _dsn(self) -> str:
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        name = os.getenv("DB_NAME", "ai_resume_builder")
        user = os.getenv("DB_USER", "postgres")
        pwd = os.getenv("DB_PASSWORD", "password")
        return f"postgresql://{user}:{pwd}@{host}:{port}/{name}"

    async def connect(self) -> None:
        self.pool = await asyncpg.create_pool(self.conn_str, min_size=1, max_size=10)
        await self._migrate()
        logger.info("ATS DB pool ready")

    async def disconnect(self) -> None:
        if self.pool:
            await self.pool.close()

    @asynccontextmanager
    async def conn(self):
        if not self.pool:
            raise RuntimeError("DB not connected")
        async with self.pool.acquire() as c:
            yield c

    async def _migrate(self) -> None:
        async with self.conn() as c:
            await c.execute(
                """
                CREATE TABLE IF NOT EXISTS ats_analyses (
                  id SERIAL PRIMARY KEY,
                  resume_id VARCHAR(100) NOT NULL,
                  analysis_type VARCHAR(32) NOT NULL,
                  ats_score REAL NOT NULL,
                  detailed JSONB,
                  recommendations JSONB,
                  created_at TIMESTAMPTZ DEFAULT now()
                )
                """
            )

    async def store_analysis_result(
        self,
        resume_id: str,
        result: Dict[str, Any],
        analysis_type: str,
    ) -> None:
        async with self.conn() as c:
            await c.execute(
                """
                INSERT INTO ats_analyses (resume_id, analysis_type, ats_score, detailed, recommendations)
                VALUES ($1, $2, $3, $4, $5)
                """,
                resume_id,
                analysis_type,
                float(result.get("ats_score", 0.0)),
                result,
                result.get("recommendations", []),
            )

    async def get_resume_insights(self, resume_id: str) -> List[Dict[str, Any]]:
        async with self.conn() as c:
            rows = await c.fetch(
                """
                SELECT ats_score, detailed, recommendations, created_at
                FROM ats_analyses
                WHERE resume_id = $1
                ORDER BY created_at DESC
                LIMIT 10
                """,
                resume_id,
            )
            return [dict(r) for r in rows]


