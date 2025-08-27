"""
Optimize Worker - AI-Powered Resume Optimization Engine
FastAPI application for STAR bullet generation, keyword infusion, ATS optimization, and intelligent resume enhancement.
"""

import asyncio
import logging
import sys
import os
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any
import json

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
import structlog

from .core.star_generator import STARGenerator
from .core.keyword_optimizer import KeywordOptimizer
from .core.ats_optimizer import ATSOptimizer
from .core.section_optimizer import SectionOptimizer
from .core.resume_optimizer import ResumeOptimizer
from .queue.task_queue import TaskQueue
from .core.gap_analyzer import GapAnalyzer
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
class OptimizeResumeRequest(BaseModel):
    resume_id: str = Field(..., description="Unique identifier for the resume")
    resume_content: Dict[str, Any] = Field(..., description="Parsed resume content")
    job_description: Optional[Dict[str, Any]] = Field(None, description="Job description for targeted optimization")
    optimization_type: str = Field("comprehensive", description="Type of optimization: star, keywords, ats, comprehensive")
    target_score: Optional[float] = Field(None, description="Target ATS score (0-100)")
    tone: str = Field("professional", description="Tone for bullet points: professional, achievement, impact")

class OptimizeResumeResponse(BaseModel):
    resume_id: str
    optimized_resume: Dict[str, Any] = Field(default_factory=dict)
    optimization_score: float = 0.0
    improvements_made: List[str] = Field(default_factory=list)
    ats_score: float = 0.0
    keyword_match_score: float = 0.0
    processing_time_ms: int = 0

class GenerateSTARRequest(BaseModel):
    resume_id: str = Field(..., description="Unique identifier for the resume")
    experience_item: Dict[str, Any] = Field(..., description="Experience item to convert to STAR format")
    job_requirements: Optional[List[str]] = Field(None, description="Job requirements to align with")
    tone: str = Field("achievement", description="Tone for STAR bullets: achievement, professional, impact")

class GenerateSTARResponse(BaseModel):
    resume_id: str
    original_bullet: str
    star_bullets: List[str] = Field(default_factory=list)
    keyword_infused: bool = False
    impact_score: float = 0.0

class KeywordOptimizationRequest(BaseModel):
    resume_id: str = Field(..., description="Unique identifier for the resume")
    resume_content: Dict[str, Any] = Field(..., description="Resume content to optimize")
    target_keywords: List[str] = Field(..., description="Keywords to infuse")
    job_description: Optional[Dict[str, Any]] = Field(None, description="Job description for context")
    density_target: float = Field(0.02, description="Target keyword density (0-1)")

class KeywordOptimizationResponse(BaseModel):
    resume_id: str
    optimized_content: Dict[str, Any] = Field(default_factory=dict)
    keywords_added: List[str] = Field(default_factory=list)
    keyword_density: float = 0.0
    naturalness_score: float = 0.0

class ATSOptimizationRequest(BaseModel):
    resume_id: str = Field(..., description="Unique identifier for the resume")
    resume_content: Dict[str, Any] = Field(..., description="Resume content to optimize")
    ats_rules: Optional[Dict[str, Any]] = Field(None, description="Specific ATS rules to follow")

class ATSOptimizationResponse(BaseModel):
    resume_id: str
    optimized_content: Dict[str, Any] = Field(default_factory=dict)
    ats_score: float = 0.0
    issues_fixed: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

class HealthResponse(BaseModel):
    status: str
    version: str
    services: Dict[str, str]

class GapAnalysisRequest(BaseModel):
    resume_content: Dict[str, Any]
    job_description: Dict[str, Any]

class GapAnalysisResponse(BaseModel):
    must_haves: list[str]
    present: list[str]
    partial: list[str]
    missing: list[str]
    coverage_score: float
    recommendations: list[str]

# Global instances
star_generator: Optional[STARGenerator] = None
keyword_optimizer: Optional[KeywordOptimizer] = None
ats_optimizer: Optional[ATSOptimizer] = None
section_optimizer: Optional[SectionOptimizer] = None
resume_optimizer: Optional[ResumeOptimizer] = None
task_queue: Optional[TaskQueue] = None
db_manager: Optional[DatabaseManager] = None
gap_analyzer: Optional[GapAnalyzer] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global star_generator, keyword_optimizer, ats_optimizer, section_optimizer, resume_optimizer, task_queue, db_manager

    logger.info("Starting Optimize Worker")

    try:
        # Initialize components
        db_manager = DatabaseManager()
        await db_manager.connect()

        star_generator = STARGenerator()
        keyword_optimizer = KeywordOptimizer()
        ats_optimizer = ATSOptimizer()
        section_optimizer = SectionOptimizer()
        resume_optimizer = ResumeOptimizer(
            star_generator=star_generator,
            keyword_optimizer=keyword_optimizer,
            ats_optimizer=ats_optimizer,
            section_optimizer=section_optimizer,
        )
        gap_analyzer = GapAnalyzer()

        task_queue = TaskQueue()
        await task_queue.connect()

        logger.info("Optimize Worker started successfully")

        yield

    except Exception as e:
        logger.error("Failed to start Optimize Worker", error=str(e))
        raise
    finally:
        # Cleanup
        if task_queue:
            await task_queue.disconnect()
        if db_manager:
            await db_manager.disconnect()
        logger.info("Optimize Worker stopped")

# Create FastAPI app
app = FastAPI(
    title="Optimize Worker",
    description="AI-powered resume optimization engine for STAR bullets, keyword infusion, and ATS optimization",
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

    if resume_optimizer and star_generator and keyword_optimizer:
        services_status["optimizer"] = "healthy"
    else:
        services_status["optimizer"] = "unhealthy"

    if task_queue:
        services_status["queue"] = "healthy"
    else:
        services_status["queue"] = "unhealthy"

    return HealthResponse(
        status="healthy" if all(s == "healthy" for s in services_status.values()) else "unhealthy",
        version="1.0.0",
        services=services_status,
    )

@app.post("/analyze/gaps", response_model=GapAnalysisResponse)
async def analyze_gaps(request: GapAnalysisRequest):
    if not gap_analyzer:
        raise HTTPException(status_code=503, detail="Gap analyzer unavailable")
    result = await gap_analyzer.analyze(
        resume_content=request.resume_content,
        job_description=request.job_description,
    )
    return result

@app.post("/optimize", response_model=OptimizeResumeResponse)
async def optimize_resume(
    request: OptimizeResumeRequest,
    background_tasks: BackgroundTasks,
):
    """
    Comprehensive resume optimization using STAR bullets, keyword infusion, and ATS optimization.
    """
    if not resume_optimizer:
        raise HTTPException(status_code=503, detail="Resume optimizer unavailable")

    try:
        import time
        start_time = time.time()

        logger.info("Starting comprehensive resume optimization", resume_id=request.resume_id)

        # Optimize the resume
        result = await resume_optimizer.optimize_resume(
            resume_id=request.resume_id,
            resume_content=request.resume_content,
            job_description=request.job_description,
            optimization_type=request.optimization_type,
            target_score=request.target_score,
            tone=request.tone,
        )

        processing_time = int((time.time() - start_time) * 1000)

        # Store optimization results
        if db_manager:
            background_tasks.add_task(
                db_manager.store_optimization_result,
                request.resume_id,
                result,
                request.optimization_type,
            )

        response = OptimizeResumeResponse(
            resume_id=request.resume_id,
            optimized_resume=result["optimized_resume"],
            optimization_score=result.get("optimization_score", 0.0),
            improvements_made=result.get("improvements_made", []),
            ats_score=result.get("ats_score", 0.0),
            keyword_match_score=result.get("keyword_match_score", 0.0),
            processing_time_ms=processing_time,
        )

        logger.info("Resume optimization completed", resume_id=request.resume_id)
        return response

    except Exception as e:
        logger.error("Failed to optimize resume", resume_id=request.resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to optimize resume: {str(e)}")

@app.post("/star/generate", response_model=GenerateSTARResponse)
async def generate_star_bullets(request: GenerateSTARRequest):
    """
    Generate STAR format bullets from experience descriptions.
    """
    if not star_generator:
        raise HTTPException(status_code=503, detail="STAR generator unavailable")

    try:
        logger.info("Generating STAR bullets", resume_id=request.resume_id)

        # Generate STAR bullets
        result = await star_generator.generate_star_bullets(
            experience_item=request.experience_item,
            job_requirements=request.job_requirements,
            tone=request.tone,
        )

        response = GenerateSTARResponse(
            resume_id=request.resume_id,
            original_bullet=request.experience_item.get("description", ""),
            star_bullets=result.get("star_bullets", []),
            keyword_infused=result.get("keyword_infused", False),
            impact_score=result.get("impact_score", 0.0),
        )

        logger.info("STAR bullet generation completed", resume_id=request.resume_id)
        return response

    except Exception as e:
        logger.error("Failed to generate STAR bullets", resume_id=request.resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to generate STAR bullets: {str(e)}")

@app.post("/keywords/optimize", response_model=KeywordOptimizationResponse)
async def optimize_keywords(request: KeywordOptimizationRequest):
    """
    Optimize resume content with target keywords while maintaining naturalness.
    """
    if not keyword_optimizer:
        raise HTTPException(status_code=503, detail="Keyword optimizer unavailable")

    try:
        logger.info("Starting keyword optimization", resume_id=request.resume_id)

        # Optimize keywords
        result = await keyword_optimizer.optimize_keywords(
            resume_content=request.resume_content,
            target_keywords=request.target_keywords,
            job_description=request.job_description,
            density_target=request.density_target,
        )

        response = KeywordOptimizationResponse(
            resume_id=request.resume_id,
            optimized_content=result.get("optimized_content", {}),
            keywords_added=result.get("keywords_added", []),
            keyword_density=result.get("keyword_density", 0.0),
            naturalness_score=result.get("naturalness_score", 0.0),
        )

        logger.info("Keyword optimization completed", resume_id=request.resume_id)
        return response

    except Exception as e:
        logger.error("Failed to optimize keywords", resume_id=request.resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to optimize keywords: {str(e)}")

@app.post("/ats/optimize", response_model=ATSOptimizationResponse)
async def optimize_for_ats(request: ATSOptimizationRequest):
    """
    Optimize resume for ATS systems with improved parsing and keyword matching.
    """
    if not ats_optimizer:
        raise HTTPException(status_code=503, detail="ATS optimizer unavailable")

    try:
        logger.info("Starting ATS optimization", resume_id=request.resume_id)

        # Optimize for ATS
        result = await ats_optimizer.optimize_for_ats(
            resume_content=request.resume_content,
            ats_rules=request.ats_rules,
        )

        response = ATSOptimizationResponse(
            resume_id=request.resume_id,
            optimized_content=result.get("optimized_content", {}),
            ats_score=result.get("ats_score", 0.0),
            issues_fixed=result.get("issues_fixed", []),
            recommendations=result.get("recommendations", []),
        )

        logger.info("ATS optimization completed", resume_id=request.resume_id)
        return response

    except Exception as e:
        logger.error("Failed to optimize for ATS", resume_id=request.resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to optimize for ATS: {str(e)}")

@app.post("/optimize/async")
async def optimize_resume_async(request: OptimizeResumeRequest):
    """
    Queue a resume for asynchronous optimization.
    Returns immediately with a task ID for status checking.
    """
    if not task_queue:
        raise HTTPException(status_code=503, detail="Task queue unavailable")

    try:
        # Add to queue for processing
        task_id = await task_queue.add_task("optimize_resume", {
            "resume_id": request.resume_id,
            "resume_content": request.resume_content,
            "job_description": request.job_description,
            "optimization_type": request.optimization_type,
            "target_score": request.target_score,
            "tone": request.tone,
        })

        return {
            "task_id": task_id,
            "status": "queued",
            "message": "Resume optimization task queued successfully",
        }

    except Exception as e:
        logger.error("Failed to queue resume optimization task", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to queue task: {str(e)}")

@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Check the status of an asynchronous optimization task"""
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

@app.post("/star/batch")
async def generate_star_batch(
    resume_id: str,
    experience_items: List[Dict[str, Any]],
    job_requirements: Optional[List[str]] = None,
    tone: str = "achievement",
):
    """
    Generate STAR bullets for multiple experience items in batch.
    """
    if not star_generator:
        raise HTTPException(status_code=503, detail="STAR generator unavailable")

    try:
        logger.info("Starting batch STAR generation", resume_id=resume_id, count=len(experience_items))

        results = []
        for item in experience_items:
            result = await star_generator.generate_star_bullets(
                experience_item=item,
                job_requirements=job_requirements,
                tone=tone,
            )
            results.append(result)

        logger.info("Batch STAR generation completed", resume_id=resume_id)
        return {
            "resume_id": resume_id,
            "results": results,
            "total_processed": len(results),
        }

    except Exception as e:
        logger.error("Failed to generate STAR batch", resume_id=resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to generate STAR batch: {str(e)}")

@app.get("/analyze/resume")
async def analyze_resume_quality(
    resume_content: Dict[str, Any],
    job_description: Optional[Dict[str, Any]] = None,
):
    """
    Analyze resume quality and provide optimization recommendations.
    """
    if not resume_optimizer:
        raise HTTPException(status_code=503, detail="Resume optimizer unavailable")

    try:
        analysis = await resume_optimizer.analyze_resume_quality(
            resume_content=resume_content,
            job_description=job_description,
        )

        return analysis

    except Exception as e:
        logger.error("Failed to analyze resume quality", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to analyze resume quality: {str(e)}")

@app.get("/suggestions/{resume_id}")
async def get_optimization_suggestions(resume_id: str):
    """
    Get optimization suggestions for a specific resume.
    """
    try:
        if not db_manager:
            raise HTTPException(status_code=503, detail="Database unavailable")

        suggestions = await db_manager.get_optimization_suggestions(resume_id)
        return {"resume_id": resume_id, "suggestions": suggestions}

    except Exception as e:
        logger.error("Failed to get optimization suggestions", resume_id=resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")

@app.post("/benchmark")
async def benchmark_optimization(
    resume_content: Dict[str, Any],
    job_description: Dict[str, Any],
    optimization_types: List[str] = Query(["star", "keywords", "ats"]),
):
    """
    Benchmark different optimization strategies and their impact.
    """
    if not resume_optimizer:
        raise HTTPException(status_code=503, detail="Resume optimizer unavailable")

    try:
        logger.info("Starting optimization benchmarking")

        benchmark_results = await resume_optimizer.benchmark_optimizations(
            resume_content=resume_content,
            job_description=job_description,
            optimization_types=optimization_types,
        )

        logger.info("Optimization benchmarking completed")
        return benchmark_results

    except Exception as e:
        logger.error("Failed to benchmark optimizations", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to benchmark optimizations: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8003")),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info",
    )
