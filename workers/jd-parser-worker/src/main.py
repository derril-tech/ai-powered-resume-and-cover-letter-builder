"""
JD Parser Worker - AI-Powered Job Description Analysis
FastAPI application for parsing job descriptions and extracting skills, keywords, and requirements.
"""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any
import os

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import structlog

from .core.parser import JobDescriptionParser
from .core.nlp_processor import NLPProcessor
from .core.skill_extractor import SkillExtractor
from .core.keyword_extractor import KeywordExtractor
from .queue.task_queue import TaskQueue
from .database.connection import DatabaseManager

# Configure structured logging
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO,
)
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Pydantic models
class ParseJobRequest(BaseModel):
    job_id: str = Field(..., description="Unique identifier for the job")
    title: str = Field(..., description="Job title")
    description: str = Field(..., description="Job description text")
    requirements: Optional[str] = Field(None, description="Job requirements text")
    company: Optional[str] = Field(None, description="Company name")
    callback_url: Optional[str] = Field(None, description="Webhook URL for results")

class ParsedJobResponse(BaseModel):
    job_id: str
    skills: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    experience_level: Optional[str] = None
    education_level: Optional[str] = None
    salary_range: Optional[Dict[str, Any]] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    benefits: List[str] = Field(default_factory=list)
    responsibilities: List[str] = Field(default_factory=list)
    qualifications: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    industry_keywords: List[str] = Field(default_factory=list)
    confidence_scores: Dict[str, float] = Field(default_factory=dict)

class HealthResponse(BaseModel):
    status: str
    version: str
    services: Dict[str, str]

# Global instances
parser: Optional[JobDescriptionParser] = None
task_queue: Optional[TaskQueue] = None
db_manager: Optional[DatabaseManager] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global parser, task_queue, db_manager

    logger.info("Starting JD Parser Worker")

    try:
        # Initialize components
        db_manager = DatabaseManager()
        await db_manager.connect()

        nlp_processor = NLPProcessor()
        skill_extractor = SkillExtractor()
        keyword_extractor = KeywordExtractor()

        parser = JobDescriptionParser(
            nlp_processor=nlp_processor,
            skill_extractor=skill_extractor,
            keyword_extractor=keyword_extractor,
        )

        task_queue = TaskQueue()
        await task_queue.connect()

        logger.info("JD Parser Worker started successfully")

        yield

    except Exception as e:
        logger.error("Failed to start JD Parser Worker", error=str(e))
        raise
    finally:
        # Cleanup
        if task_queue:
            await task_queue.disconnect()
        if db_manager:
            await db_manager.disconnect()
        logger.info("JD Parser Worker stopped")

# Create FastAPI app
app = FastAPI(
    title="JD Parser Worker",
    description="AI-powered job description parsing and analysis service",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    services_status = {}

    if db_manager:
        services_status["database"] = "healthy"
    else:
        services_status["database"] = "unhealthy"

    if task_queue:
        services_status["queue"] = "healthy"
    else:
        services_status["queue"] = "unhealthy"

    if parser:
        services_status["parser"] = "healthy"
    else:
        services_status["parser"] = "unhealthy"

    return HealthResponse(
        status="healthy" if all(s == "healthy" for s in services_status.values()) else "unhealthy",
        version="1.0.0",
        services=services_status,
    )

@app.post("/parse", response_model=ParsedJobResponse)
async def parse_job(
    request: ParseJobRequest,
    background_tasks: BackgroundTasks,
):
    """
    Parse a job description and extract skills, keywords, and other information.
    Can be processed synchronously or asynchronously based on complexity.
    """
    if not parser:
        raise HTTPException(status_code=503, detail="Parser service unavailable")

    try:
        # Combine description and requirements for comprehensive analysis
        full_text = f"{request.title}\n\n{request.description}"
        if request.requirements:
            full_text += f"\n\n{request.requirements}"

        logger.info("Starting job description parsing", job_id=request.job_id)

        # Parse the job description
        result = await parser.parse(
            job_id=request.job_id,
            title=request.title,
            text=full_text,
            company=request.company,
        )

        # Convert to response format
        response = ParsedJobResponse(
            job_id=request.job_id,
            skills=result.skills,
            keywords=result.keywords,
            experience_level=result.experience_level,
            education_level=result.education_level,
            salary_range=result.salary_range,
            location=result.location,
            job_type=result.job_type,
            benefits=result.benefits,
            responsibilities=result.responsibilities,
            qualifications=result.qualifications,
            technologies=result.technologies,
            soft_skills=result.soft_skills,
            industry_keywords=result.industry_keywords,
            confidence_scores=result.confidence_scores,
        )

        # Store results in database if manager is available
        if db_manager:
            background_tasks.add_task(
                db_manager.store_parsed_job,
                request.job_id,
                result,
            )

        # Send webhook callback if provided
        if request.callback_url:
            background_tasks.add_task(
                send_webhook_callback,
                request.callback_url,
                response.dict(),
            )

        logger.info("Job description parsing completed", job_id=request.job_id)
        return response

    except Exception as e:
        logger.error("Failed to parse job description", job_id=request.job_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to parse job description: {str(e)}")

@app.post("/parse/async")
async def parse_job_async(request: ParseJobRequest):
    """
    Queue a job description for asynchronous parsing.
    Returns immediately with a task ID for status checking.
    """
    if not task_queue:
        raise HTTPException(status_code=503, detail="Task queue unavailable")

    try:
        # Add to queue for processing
        task_id = await task_queue.add_task("parse_job", {
            "job_id": request.job_id,
            "title": request.title,
            "description": request.description,
            "requirements": request.requirements,
            "company": request.company,
            "callback_url": request.callback_url,
        })

        return {
            "task_id": task_id,
            "status": "queued",
            "message": "Job parsing task queued successfully",
        }

    except Exception as e:
        logger.error("Failed to queue job parsing task", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to queue task: {str(e)}")

@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Check the status of an asynchronous parsing task"""
    if not task_queue:
        raise HTTPException(status_code=503, detail="Task queue unavailable")

    try:
        status = await task_queue.get_task_status(task_id)
        if not status:
            raise HTTPException(status_code=404, detail="Task not found")

        return status

    except Exception as e:
        logger.error("Failed to get task status", task_id=task_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get task status: {str(e)}")

@app.post("/skills/extract")
async def extract_skills(text: str):
    """Extract skills from arbitrary text"""
    if not parser:
        raise HTTPException(status_code=503, detail="Parser service unavailable")

    try:
        skills = await parser.skill_extractor.extract_skills(text)
        return {"skills": skills}
    except Exception as e:
        logger.error("Failed to extract skills", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to extract skills: {str(e)}")

@app.post("/keywords/extract")
async def extract_keywords(text: str):
    """Extract keywords from arbitrary text"""
    if not parser:
        raise HTTPException(status_code=503, detail="Parser service unavailable")

    try:
        keywords = await parser.keyword_extractor.extract_keywords(text)
        return {"keywords": keywords}
    except Exception as e:
        logger.error("Failed to extract keywords", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to extract keywords: {str(e)}")

async def send_webhook_callback(url: str, data: dict):
    """Send webhook callback with parsing results"""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            await client.post(url, json=data, timeout=30.0)
        logger.info("Webhook callback sent successfully", url=url)
    except Exception as e:
        logger.error("Failed to send webhook callback", url=url, error=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info",
    )
