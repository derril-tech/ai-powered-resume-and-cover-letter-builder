"""
ATS Check Worker - AI-Powered ATS Scoring & Analysis Engine
FastAPI application for comprehensive ATS scoring, readability analysis, keyword optimization checking, and ATS compatibility assessment.
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

from .core.length_analyzer import LengthAnalyzer
from .core.readability_analyzer import ReadabilityAnalyzer
from .core.keyword_analyzer import KeywordAnalyzer
from .core.tense_analyzer import TenseAnalyzer
from .core.ats_scorer import ATSScorer
from .core.content_analyzer import ContentAnalyzer
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
class AnalyzeResumeRequest(BaseModel):
    resume_id: str = Field(..., description="Unique identifier for the resume")
    resume_content: Dict[str, Any] = Field(..., description="Resume content to analyze")
    job_description: Optional[Dict[str, Any]] = Field(None, description="Job description for comparison")
    analysis_type: str = Field("comprehensive", description="Type of analysis: comprehensive, quick, detailed")

class AnalyzeResumeResponse(BaseModel):
    resume_id: str
    ats_score: float = 0.0
    detailed_scores: Dict[str, float] = Field(default_factory=dict)
    issues_found: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    analysis_summary: Dict[str, Any] = Field(default_factory=dict)
    processing_time_ms: int = 0

class QuickScoreRequest(BaseModel):
    resume_content: Dict[str, Any] = Field(..., description="Resume content to score")

class QuickScoreResponse(BaseModel):
    ats_score: float = 0.0
    score_breakdown: Dict[str, float] = Field(default_factory=dict)
    risk_level: str = "unknown"

class CompareResumesRequest(BaseModel):
    resume_a: Dict[str, Any] = Field(..., description="First resume content")
    resume_b: Dict[str, Any] = Field(..., description="Second resume content")
    job_description: Optional[Dict[str, Any]] = Field(None, description="Job description context")

class CompareResumesResponse(BaseModel):
    winner: str = "tie"
    score_difference: float = 0.0
    comparison_details: Dict[str, Any] = Field(default_factory=dict)
    recommendations: List[str] = Field(default_factory=list)

class OptimizeForJobRequest(BaseModel):
    resume_id: str = Field(..., description="Unique identifier for the resume")
    resume_content: Dict[str, Any] = Field(..., description="Resume content to optimize")
    job_description: Dict[str, Any] = Field(..., description="Target job description")
    optimization_focus: str = Field("keywords", description="Focus area: keywords, length, readability, comprehensive")

class OptimizeForJobResponse(BaseModel):
    resume_id: str
    optimized_content: Dict[str, Any] = Field(default_factory=dict)
    optimization_score: float = 0.0
    changes_made: List[str] = Field(default_factory=list)
    keyword_match_improvement: float = 0.0

class HealthResponse(BaseModel):
    status: str
    version: str
    services: Dict[str, str]

# Global instances
length_analyzer: Optional[LengthAnalyzer] = None
readability_analyzer: Optional[ReadabilityAnalyzer] = None
keyword_analyzer: Optional[KeywordAnalyzer] = None
tense_analyzer: Optional[TenseAnalyzer] = None
ats_scorer: Optional[ATSScorer] = None
content_analyzer: Optional[ContentAnalyzer] = None
task_queue: Optional[TaskQueue] = None
db_manager: Optional[DatabaseManager] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global length_analyzer, readability_analyzer, keyword_analyzer, tense_analyzer, ats_scorer, content_analyzer, task_queue, db_manager

    logger.info("Starting ATS Check Worker")

    try:
        # Initialize components
        db_manager = DatabaseManager()
        await db_manager.connect()

        length_analyzer = LengthAnalyzer()
        readability_analyzer = ReadabilityAnalyzer()
        keyword_analyzer = KeywordAnalyzer()
        tense_analyzer = TenseAnalyzer()
        content_analyzer = ContentAnalyzer()

        ats_scorer = ATSScorer(
            length_analyzer=length_analyzer,
            readability_analyzer=readability_analyzer,
            keyword_analyzer=keyword_analyzer,
            tense_analyzer=tense_analyzer,
            content_analyzer=content_analyzer,
        )

        task_queue = TaskQueue()
        await task_queue.connect()

        logger.info("ATS Check Worker started successfully")

        yield

    except Exception as e:
        logger.error("Failed to start ATS Check Worker", error=str(e))
        raise
    finally:
        # Cleanup
        if task_queue:
            await task_queue.disconnect()
        if db_manager:
            await db_manager.disconnect()
        logger.info("ATS Check Worker stopped")

# Create FastAPI app
app = FastAPI(
    title="ATS Check Worker",
    description="AI-powered ATS scoring and analysis engine for resume optimization",
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

    if ats_scorer and readability_analyzer and keyword_analyzer:
        services_status["analyzer"] = "healthy"
    else:
        services_status["analyzer"] = "unhealthy"

    if task_queue:
        services_status["queue"] = "healthy"
    else:
        services_status["queue"] = "unhealthy"

    return HealthResponse(
        status="healthy" if all(s == "healthy" for s in services_status.values()) else "unhealthy",
        version="1.0.0",
        services=services_status,
    )

@app.post("/analyze", response_model=AnalyzeResumeResponse)
async def analyze_resume(
    request: AnalyzeResumeRequest,
    background_tasks: BackgroundTasks,
):
    """
    Comprehensive ATS analysis of resume content including scoring, readability, keywords, and recommendations.
    """
    if not ats_scorer:
        raise HTTPException(status_code=503, detail="ATS scorer unavailable")

    try:
        import time
        start_time = time.time()

        logger.info("Starting comprehensive ATS analysis", resume_id=request.resume_id)

        # Perform comprehensive analysis
        analysis_result = await ats_scorer.analyze_resume(
            resume_content=request.resume_content,
            job_description=request.job_description,
            analysis_type=request.analysis_type,
        )

        processing_time = int((time.time() - start_time) * 1000)

        # Store analysis results
        if db_manager:
            background_tasks.add_task(
                db_manager.store_analysis_result,
                request.resume_id,
                analysis_result,
                request.analysis_type,
            )

        response = AnalyzeResumeResponse(
            resume_id=request.resume_id,
            ats_score=analysis_result.get("ats_score", 0.0),
            detailed_scores=analysis_result.get("detailed_scores", {}),
            issues_found=analysis_result.get("issues_found", []),
            recommendations=analysis_result.get("recommendations", []),
            analysis_summary=analysis_result.get("analysis_summary", {}),
            processing_time_ms=processing_time,
        )

        logger.info("ATS analysis completed", resume_id=request.resume_id)
        return response

    except Exception as e:
        logger.error("Failed to analyze resume", resume_id=request.resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to analyze resume: {str(e)}")

@app.post("/score/quick", response_model=QuickScoreResponse)
async def quick_score(request: QuickScoreRequest):
    """
    Quick ATS scoring for immediate feedback.
    """
    if not ats_scorer:
        raise HTTPException(status_code=503, detail="ATS scorer unavailable")

    try:
        score_result = await ats_scorer.quick_score(request.resume_content)

        # Determine risk level
        score = score_result.get("ats_score", 0.0)
        if score >= 80:
            risk_level = "low"
        elif score >= 60:
            risk_level = "medium"
        else:
            risk_level = "high"

        return QuickScoreResponse(
            ats_score=score,
            score_breakdown=score_result.get("breakdown", {}),
            risk_level=risk_level,
        )

    except Exception as e:
        logger.error("Failed to quick score resume", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to score resume: {str(e)}")

@app.post("/compare", response_model=CompareResumesResponse)
async def compare_resumes(request: CompareResumesRequest):
    """
    Compare two resumes and determine which performs better for ATS.
    """
    if not ats_scorer:
        raise HTTPException(status_code=503, detail="ATS scorer unavailable")

    try:
        logger.info("Starting resume comparison")

        comparison_result = await ats_scorer.compare_resumes(
            resume_a=request.resume_a,
            resume_b=request.resume_b,
            job_description=request.job_description,
        )

        response = CompareResumesResponse(
            winner=comparison_result.get("winner", "tie"),
            score_difference=comparison_result.get("score_difference", 0.0),
            comparison_details=comparison_result.get("comparison_details", {}),
            recommendations=comparison_result.get("recommendations", []),
        )

        logger.info("Resume comparison completed")
        return response

    except Exception as e:
        logger.error("Failed to compare resumes", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to compare resumes: {str(e)}")

@app.post("/optimize/job", response_model=OptimizeForJobResponse)
async def optimize_for_job(request: OptimizeForJobRequest):
    """
    Optimize resume specifically for a target job description.
    """
    if not ats_scorer:
        raise HTTPException(status_code=503, detail="ATS scorer unavailable")

    try:
        logger.info("Starting job-specific optimization", resume_id=request.resume_id)

        optimization_result = await ats_scorer.optimize_for_job(
            resume_content=request.resume_content,
            job_description=request.job_description,
            optimization_focus=request.optimization_focus,
        )

        response = OptimizeForJobResponse(
            resume_id=request.resume_id,
            optimized_content=optimization_result.get("optimized_content", {}),
            optimization_score=optimization_result.get("optimization_score", 0.0),
            changes_made=optimization_result.get("changes_made", []),
            keyword_match_improvement=optimization_result.get("keyword_match_improvement", 0.0),
        )

        logger.info("Job-specific optimization completed", resume_id=request.resume_id)
        return response

    except Exception as e:
        logger.error("Failed to optimize for job", resume_id=request.resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to optimize for job: {str(e)}")

@app.get("/readability/score")
async def get_readability_score(text: str):
    """
    Calculate readability score for text content.
    """
    if not readability_analyzer:
        raise HTTPException(status_code=503, detail="Readability analyzer unavailable")

    try:
        scores = await readability_analyzer.analyze_readability(text)
        return scores

    except Exception as e:
        logger.error("Failed to calculate readability score", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to calculate readability: {str(e)}")

@app.get("/length/analyze")
async def analyze_length(
    text: str,
    target_length: Optional[int] = None,
    content_type: str = "resume",
):
    """
    Analyze text length and provide recommendations.
    """
    if not length_analyzer:
        raise HTTPException(status_code=503, detail="Length analyzer unavailable")

    try:
        analysis = await length_analyzer.analyze_length(text, target_length, content_type)
        return analysis

    except Exception as e:
        logger.error("Failed to analyze length", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to analyze length: {str(e)}")

@app.get("/tense/analyze")
async def analyze_tense(text: str):
    """
    Analyze verb tense usage in text.
    """
    if not tense_analyzer:
        raise HTTPException(status_code=503, detail="Tense analyzer unavailable")

    try:
        analysis = await tense_analyzer.analyze_tense(text)
        return analysis

    except Exception as e:
        logger.error("Failed to analyze tense", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to analyze tense: {str(e)}")

@app.post("/keywords/analyze")
async def analyze_keywords(
    resume_content: Dict[str, Any],
    job_description: Optional[Dict[str, Any]] = None,
    target_density: float = 0.02,
):
    """
    Analyze keyword usage and optimization opportunities.
    """
    if not keyword_analyzer:
        raise HTTPException(status_code=503, detail="Keyword analyzer unavailable")

    try:
        analysis = await keyword_analyzer.analyze_keywords(
            resume_content=resume_content,
            job_description=job_description,
            target_density=target_density,
        )
        return analysis

    except Exception as e:
        logger.error("Failed to analyze keywords", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to analyze keywords: {str(e)}")

@app.post("/content/analyze")
async def analyze_content(
    resume_content: Dict[str, Any],
    analysis_type: str = "comprehensive",
):
    """
    Analyze content quality and effectiveness.
    """
    if not content_analyzer:
        raise HTTPException(status_code=503, detail="Content analyzer unavailable")

    try:
        analysis = await content_analyzer.analyze_content(
            resume_content=resume_content,
            analysis_type=analysis_type,
        )
        return analysis

    except Exception as e:
        logger.error("Failed to analyze content", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to analyze content: {str(e)}")

@app.post("/benchmark")
async def benchmark_ats_systems(
    resume_content: Dict[str, Any],
    job_description: Optional[Dict[str, Any]] = None,
    systems: List[str] = Query(["general", "workday", "taleo", "icims"]),
):
    """
    Benchmark resume against different ATS systems.
    """
    if not ats_scorer:
        raise HTTPException(status_code=503, detail="ATS scorer unavailable")

    try:
        logger.info("Starting ATS system benchmarking")

        benchmark_results = await ats_scorer.benchmark_ats_systems(
            resume_content=resume_content,
            job_description=job_description,
            systems=systems,
        )

        logger.info("ATS system benchmarking completed")
        return benchmark_results

    except Exception as e:
        logger.error("Failed to benchmark ATS systems", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to benchmark ATS systems: {str(e)}")

@app.get("/insights/{resume_id}")
async def get_resume_insights(resume_id: str):
    """
    Get detailed insights and recommendations for a resume.
    """
    try:
        if not db_manager:
            raise HTTPException(status_code=503, detail="Database unavailable")

        insights = await db_manager.get_resume_insights(resume_id)
        return {"resume_id": resume_id, "insights": insights}

    except Exception as e:
        logger.error("Failed to get resume insights", resume_id=resume_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get insights: {str(e)}")

@app.post("/train/scorer")
async def train_ats_scorer(
    training_data: List[Dict[str, Any]],
    background_tasks: BackgroundTasks,
):
    """
    Train the ATS scorer with new data for improved accuracy.
    """
    if not ats_scorer:
        raise HTTPException(status_code=503, detail="ATS scorer unavailable")

    try:
        # Queue training for background processing
        background_tasks.add_task(
            ats_scorer.train_model,
            training_data,
        )

        return {"message": "ATS scorer training queued", "status": "processing"}

    except Exception as e:
        logger.error("Failed to queue ATS scorer training", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to queue training: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8004")),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info",
    )
