"""
Resume Parser Worker - AI-Powered Resume Analysis
FastAPI application for parsing resume documents and extracting structured information.
"""

import asyncio
import logging
import sys
import os
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any
import base64
import io

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import structlog

from .core.parser import ResumeParser
from .core.document_processor import DocumentProcessor
from .core.nlp_processor import NLPProcessor
from .core.skill_extractor import SkillExtractor
from .core.experience_extractor import ExperienceExtractor
from .core.education_extractor import EducationExtractor
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
class ParseResumeRequest(BaseModel):
    resume_id: str = Field(..., description="Unique identifier for the resume")
    content: str = Field(..., description="Resume text content")
    filename: Optional[str] = Field(None, description="Original filename")
    content_type: Optional[str] = Field(None, description="Content type")
    callback_url: Optional[str] = Field(None, description="Webhook URL for results")

class ParseResumeFileRequest(BaseModel):
    resume_id: str = Field(..., description="Unique identifier for the resume")
    callback_url: Optional[str] = Field(None, description="Webhook URL for results")

class ParsedResumeResponse(BaseModel):
    resume_id: str
    filename: Optional[str] = None
    contact_info: Dict[str, Any] = Field(default_factory=dict)
    summary: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience: List[Dict[str, Any]] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[Dict[str, Any]] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    awards: List[Dict[str, Any]] = Field(default_factory=list)
    publications: List[Dict[str, Any]] = Field(default_factory=list)
    references: List[Dict[str, Any]] = Field(default_factory=list)
    sections_found: List[str] = Field(default_factory=list)
    quality_score: float = 0.0
    word_count: int = 0
    confidence_scores: Dict[str, float] = Field(default_factory=dict)

class HealthResponse(BaseModel):
    status: str
    version: str
    services: Dict[str, str]

# Global instances
parser: Optional[ResumeParser] = None
document_processor: Optional[DocumentProcessor] = None
task_queue: Optional[TaskQueue] = None
db_manager: Optional[DatabaseManager] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global parser, document_processor, task_queue, db_manager

    logger.info("Starting Resume Parser Worker")

    try:
        # Initialize components
        db_manager = DatabaseManager()
        await db_manager.connect()

        document_processor = DocumentProcessor()
        nlp_processor = NLPProcessor()
        skill_extractor = SkillExtractor()
        experience_extractor = ExperienceExtractor()
        education_extractor = EducationExtractor()

        parser = ResumeParser(
            document_processor=document_processor,
            nlp_processor=nlp_processor,
            skill_extractor=skill_extractor,
            experience_extractor=experience_extractor,
            education_extractor=education_extractor,
        )

        task_queue = TaskQueue()
        await task_queue.connect()

        logger.info("Resume Parser Worker started successfully")

        yield

    except Exception as e:
        logger.error("Failed to start Resume Parser Worker", error=str(e))
        raise
    finally:
        # Cleanup
        if task_queue:
            await task_queue.disconnect()
        if db_manager:
            await db_manager.disconnect()
        logger.info("Resume Parser Worker stopped")

# Create FastAPI app
app = FastAPI(
    title="Resume Parser Worker",
    description="AI-powered resume parsing and analysis service",
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

    if parser and document_processor:
        services_status["parser"] = "healthy"
    else:
        services_status["parser"] = "unhealthy"

    return HealthResponse(
        status="healthy" if all(s == "healthy" for s in services_status.values()) else "unhealthy",
        version="1.0.0",
        services=services_status,
    )

@app.post("/parse", response_model=ParsedResumeResponse)
async def parse_resume(
    request: ParseResumeRequest,
    background_tasks: BackgroundTasks,
):
    """
    Parse resume text and extract structured information.
    Can be processed synchronously or asynchronously based on complexity.
    """
    if not parser:
        raise HTTPException(status_code=503, detail="Parser service unavailable")

    try:
        logger.info("Starting resume parsing", resume_id=request.resume_id)

        # Parse the resume
        result = await parser.parse(
            resume_id=request.resume_id,
            content=request.content,
            filename=request.filename,
            content_type=request.content_type,
        )

        # Convert to response format
        response = ParsedResumeResponse(
            resume_id=request.resume_id,
            filename=request.filename,
            contact_info=result.contact_info,
            summary=result.summary,
            skills=result.skills,
            experience=result.experience,
            education=result.education,
            certifications=result.certifications,
            projects=result.projects,
            languages=result.languages,
            awards=result.awards,
            publications=result.publications,
            references=result.references,
            sections_found=result.sections_found,
            quality_score=result.quality_score,
            word_count=result.word_count,
            confidence_scores=result.confidence_scores,
        )

        # Store results in database if manager is available
        if db_manager:
            background_tasks.add_task(
                db_manager.store_parsed_resume,
                request.resume_id,
                result,
            )

        # Send webhook callback if provided
        if request.callback_url:
            background_tasks.add_task(
                send_webhook_callback,
                request.callback_url,
                response.dict(),
            )

        logger.info("Resume parsing completed", resume_id=request.resume_id)
        return response

    except Exception as e:
        logger.error("Failed to parse resume", resume_id=request.resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

@app.post("/parse/file", response_model=ParsedResumeResponse)
async def parse_resume_file(
    resume_id: str = Form(...),
    file: UploadFile = File(...),
    callback_url: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """
    Parse resume file (PDF, DOCX, TXT) and extract structured information.
    """
    if not parser or not document_processor:
        raise HTTPException(status_code=503, detail="Parser service unavailable")

    try:
        # Validate file type
        allowed_types = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain',
        ]

        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Supported types: PDF, DOCX, TXT"
            )

        # Read file content
        file_content = await file.read()

        logger.info("Starting resume file parsing", resume_id=resume_id, filename=file.filename)

        # Extract text from document
        extracted_text = await document_processor.extract_text(
            file_content,
            file.content_type,
            file.filename,
        )

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file")

        # Parse the extracted text
        result = await parser.parse(
            resume_id=resume_id,
            content=extracted_text,
            filename=file.filename,
            content_type=file.content_type,
        )

        # Convert to response format
        response = ParsedResumeResponse(
            resume_id=resume_id,
            filename=file.filename,
            contact_info=result.contact_info,
            summary=result.summary,
            skills=result.skills,
            experience=result.experience,
            education=result.education,
            certifications=result.certifications,
            projects=result.projects,
            languages=result.languages,
            awards=result.awards,
            publications=result.publications,
            references=result.references,
            sections_found=result.sections_found,
            quality_score=result.quality_score,
            word_count=result.word_count,
            confidence_scores=result.confidence_scores,
        )

        # Store results in database if manager is available
        if db_manager:
            background_tasks.add_task(
                db_manager.store_parsed_resume,
                resume_id,
                result,
            )

        # Send webhook callback if provided
        if callback_url:
            background_tasks.add_task(
                send_webhook_callback,
                callback_url,
                response.dict(),
            )

        logger.info("Resume file parsing completed", resume_id=resume_id, filename=file.filename)
        return response

    except Exception as e:
        logger.error("Failed to parse resume file", resume_id=resume_id, filename=file.filename, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to parse resume file: {str(e)}")

@app.post("/parse/async")
async def parse_resume_async(request: ParseResumeRequest):
    """
    Queue a resume for asynchronous parsing.
    Returns immediately with a task ID for status checking.
    """
    if not task_queue:
        raise HTTPException(status_code=503, detail="Task queue unavailable")

    try:
        # Add to queue for processing
        task_id = await task_queue.add_task("parse_resume", {
            "resume_id": request.resume_id,
            "content": request.content,
            "filename": request.filename,
            "content_type": request.content_type,
            "callback_url": request.callback_url,
        })

        return {
            "task_id": task_id,
            "status": "queued",
            "message": "Resume parsing task queued successfully",
        }

    except Exception as e:
        logger.error("Failed to queue resume parsing task", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to queue task: {str(e)}")

@app.post("/parse/file/async")
async def parse_resume_file_async(
    resume_id: str = Form(...),
    file: UploadFile = File(...),
    callback_url: Optional[str] = Form(None),
):
    """
    Queue a resume file for asynchronous parsing.
    """
    if not task_queue:
        raise HTTPException(status_code=503, detail="Task queue unavailable")

    try:
        # Validate file type
        allowed_types = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain',
        ]

        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}"
            )

        # Read file content
        file_content = await file.read()

        # Add to queue for processing
        task_id = await task_queue.add_task("parse_resume_file", {
            "resume_id": resume_id,
            "file_content": base64.b64encode(file_content).decode(),
            "filename": file.filename,
            "content_type": file.content_type,
            "callback_url": callback_url,
        })

        return {
            "task_id": task_id,
            "status": "queued",
            "message": "Resume file parsing task queued successfully",
        }

    except Exception as e:
        logger.error("Failed to queue resume file parsing task", error=str(e))
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

@app.post("/extract/contact")
async def extract_contact_info(text: str):
    """Extract contact information from text"""
    if not parser:
        raise HTTPException(status_code=503, detail="Parser service unavailable")

    try:
        contact_info = await parser.extract_contact_info(text)
        return {"contact_info": contact_info}
    except Exception as e:
        logger.error("Failed to extract contact info", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to extract contact info: {str(e)}")

@app.post("/extract/experience")
async def extract_experience(text: str):
    """Extract work experience from text"""
    if not parser:
        raise HTTPException(status_code=503, detail="Parser service unavailable")

    try:
        experience = await parser.extract_experience(text)
        return {"experience": experience}
    except Exception as e:
        logger.error("Failed to extract experience", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to extract experience: {str(e)}")

@app.post("/extract/education")
async def extract_education(text: str):
    """Extract education from text"""
    if not parser:
        raise HTTPException(status_code=503, detail="Parser service unavailable")

    try:
        education = await parser.extract_education(text)
        return {"education": education}
    except Exception as e:
        logger.error("Failed to extract education", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to extract education: {str(e)}")

@app.post("/quality/score")
async def score_resume_quality(text: str):
    """Score resume quality and provide suggestions"""
    if not parser:
        raise HTTPException(status_code=503, detail="Parser service unavailable")

    try:
        score = await parser.score_resume_quality(text)
        return {"quality_score": score}
    except Exception as e:
        logger.error("Failed to score resume quality", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to score resume quality: {str(e)}")

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
        port=int(os.getenv("PORT", "8001")),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info",
    )
