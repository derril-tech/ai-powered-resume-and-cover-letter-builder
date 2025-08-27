"""
Cover Letter Worker - Draft generation with tone presets
"""

import os
import sys
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from .core.generator import CoverLetterGenerator
from .database.connection import DatabaseManager


logging.basicConfig(format="%(message)s", stream=sys.stdout, level=logging.INFO)
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()


class GenerateRequest(BaseModel):
    resume_id: str
    resume_summary: Optional[str] = None
    experience_highlights: List[str] = Field(default_factory=list)
    company: str
    role: str
    job_requirements: List[str] = Field(default_factory=list)
    tone: str = Field("professional", description="professional|warm|concise|impact|enthusiastic")
    word_limit: int = 300


class GenerateResponse(BaseModel):
    resume_id: str
    draft: str
    tone: str
    word_count: int
    suggestions: List[str] = Field(default_factory=list)


generator: Optional[CoverLetterGenerator] = None
db: Optional[DatabaseManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global generator, db
    try:
        db = DatabaseManager()
        await db.connect()
        generator = CoverLetterGenerator()
        yield
    finally:
        if db:
            await db.disconnect()


app = FastAPI(title="Cover Letter Worker", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*"],
    allow_methods=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    if not generator:
        raise HTTPException(status_code=503, detail="generator unavailable")
    draft, suggestions = await generator.generate(
        resume_summary=req.resume_summary,
        experience_highlights=req.experience_highlights,
        company=req.company,
        role=req.role,
        job_requirements=req.job_requirements,
        tone=req.tone,
        word_limit=req.word_limit,
    )
    if db:
        await db.store_cover_letter(req.resume_id, draft, req.tone)
    return GenerateResponse(
        resume_id=req.resume_id,
        draft=draft,
        tone=req.tone,
        word_count=len(draft.split()),
        suggestions=suggestions,
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8005")))


