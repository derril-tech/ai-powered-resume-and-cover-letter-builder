"""
DB for Cover Letter Worker
"""

import os
from typing import Optional, List
import asyncpg
from contextlib import asynccontextmanager


class DatabaseManager:
    def __init__(self) -> None:
        self.pool: Optional[asyncpg.Pool] = None
        self.dsn = self._dsn()

    def _dsn(self) -> str:
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        name = os.getenv("DB_NAME", "ai_resume_builder")
        user = os.getenv("DB_USER", "postgres")
        pwd = os.getenv("DB_PASSWORD", "password")
        return f"postgresql://{user}:{pwd}@{host}:{port}/{name}"

    async def connect(self) -> None:
        self.pool = await asyncpg.create_pool(self.dsn, min_size=1, max_size=10)
        await self._migrate()

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
                CREATE TABLE IF NOT EXISTS cover_letters (
                  id SERIAL PRIMARY KEY,
                  resume_id VARCHAR(100) NOT NULL,
                  tone VARCHAR(32) NOT NULL,
                  draft TEXT NOT NULL,
                  created_at TIMESTAMPTZ DEFAULT now()
                )
                """
            )

    async def store_cover_letter(self, resume_id: str, draft: str, tone: str) -> None:
        async with self.conn() as c:
            await c.execute(
                """
                INSERT INTO cover_letters (resume_id, tone, draft)
                VALUES ($1, $2, $3)
                """,
                resume_id,
                tone,
                draft,
            )


