"""
Taxonomy Worker - AI-Powered Skill Normalization & Taxonomy Management
FastAPI application for normalizing skills, managing taxonomies, and providing similarity matching.
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

from .core.skill_normalizer import SkillNormalizer
from .core.taxonomy_manager import TaxonomyManager
from .core.similarity_matcher import SimilarityMatcher
from .core.skill_clusterer import SkillClusterer
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
class NormalizeSkillsRequest(BaseModel):
    skills: List[str] = Field(..., description="List of skills to normalize")
    source: Optional[str] = Field(None, description="Source of skills (jd, resume, manual)")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")

class NormalizeSkillsResponse(BaseModel):
    normalized_skills: List[Dict[str, Any]] = Field(default_factory=list)
    unmatched_skills: List[str] = Field(default_factory=list)
    confidence_score: float = 0.0
    processing_time_ms: int = 0

class SkillMatch(BaseModel):
    skill: str
    normalized_skill: str
    category: str
    confidence: float
    aliases: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class MatchSkillsRequest(BaseModel):
    source_skills: List[str] = Field(..., description="Source skills to match")
    target_skills: List[str] = Field(..., description="Target skills to match against")
    threshold: float = Field(0.7, description="Similarity threshold (0-1)")
    match_type: str = Field("semantic", description="Type of matching: semantic, fuzzy, exact")

class MatchSkillsResponse(BaseModel):
    matches: List[Dict[str, Any]] = Field(default_factory=list)
    unmatched_source: List[str] = Field(default_factory=list)
    unmatched_target: List[str] = Field(default_factory=list)
    average_confidence: float = 0.0

class TaxonomyStats(BaseModel):
    total_skills: int = 0
    categories: Dict[str, int] = Field(default_factory=dict)
    normalization_rules: int = 0
    last_updated: Optional[str] = None
    coverage_score: float = 0.0

class HealthResponse(BaseModel):
    status: str
    version: str
    services: Dict[str, str]

# Global instances
skill_normalizer: Optional[SkillNormalizer] = None
taxonomy_manager: Optional[TaxonomyManager] = None
similarity_matcher: Optional[SimilarityMatcher] = None
skill_clusterer: Optional[SkillClusterer] = None
task_queue: Optional[TaskQueue] = None
db_manager: Optional[DatabaseManager] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global skill_normalizer, taxonomy_manager, similarity_matcher, skill_clusterer, task_queue, db_manager

    logger.info("Starting Taxonomy Worker")

    try:
        # Initialize components
        db_manager = DatabaseManager()
        await db_manager.connect()

        taxonomy_manager = TaxonomyManager(db_manager)
        await taxonomy_manager.initialize()

        skill_normalizer = SkillNormalizer(taxonomy_manager)
        similarity_matcher = SimilarityMatcher(taxonomy_manager)
        skill_clusterer = SkillClusterer(taxonomy_manager)

        task_queue = TaskQueue()
        await task_queue.connect()

        # Load initial taxonomy data
        await taxonomy_manager.load_taxonomy_data()

        logger.info("Taxonomy Worker started successfully")

        yield

    except Exception as e:
        logger.error("Failed to start Taxonomy Worker", error=str(e))
        raise
    finally:
        # Cleanup
        if task_queue:
            await task_queue.disconnect()
        if db_manager:
            await db_manager.disconnect()
        logger.info("Taxonomy Worker stopped")

# Create FastAPI app
app = FastAPI(
    title="Taxonomy Worker",
    description="AI-powered skill normalization and taxonomy management service",
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

    if taxonomy_manager:
        services_status["taxonomy"] = "healthy"
    else:
        services_status["taxonomy"] = "unhealthy"

    if skill_normalizer and similarity_matcher:
        services_status["normalizer"] = "healthy"
    else:
        services_status["normalizer"] = "unhealthy"

    if task_queue:
        services_status["queue"] = "healthy"
    else:
        services_status["queue"] = "unhealthy"

    return HealthResponse(
        status="healthy" if all(s == "healthy" for s in services_status.values()) else "unhealthy",
        version="1.0.0",
        services=services_status,
    )

@app.post("/normalize", response_model=NormalizeSkillsResponse)
async def normalize_skills(
    request: NormalizeSkillsRequest,
    background_tasks: BackgroundTasks,
):
    """
    Normalize a list of skills using the taxonomy system.
    Returns normalized skills with categories and confidence scores.
    """
    if not skill_normalizer or not taxonomy_manager:
        raise HTTPException(status_code=503, detail="Normalizer service unavailable")

    try:
        import time
        start_time = time.time()

        logger.info("Starting skill normalization", skill_count=len(request.skills))

        # Normalize skills
        result = await skill_normalizer.normalize_skills(
            skills=request.skills,
            source=request.source,
            context=request.context,
        )

        processing_time = int((time.time() - start_time) * 1000)

        # Store normalization results for learning
        if db_manager:
            background_tasks.add_task(
                taxonomy_manager.store_normalization_results,
                request.skills,
                result,
                request.source,
            )

        response = NormalizeSkillsResponse(
            normalized_skills=result["normalized_skills"],
            unmatched_skills=result["unmatched_skills"],
            confidence_score=result.get("confidence_score", 0.0),
            processing_time_ms=processing_time,
        )

        logger.info("Skill normalization completed", skill_count=len(request.skills))
        return response

    except Exception as e:
        logger.error("Failed to normalize skills", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to normalize skills: {str(e)}")

@app.post("/match", response_model=MatchSkillsResponse)
async def match_skills(request: MatchSkillsRequest):
    """
    Match source skills against target skills using various similarity algorithms.
    """
    if not similarity_matcher:
        raise HTTPException(status_code=503, detail="Similarity matcher unavailable")

    try:
        logger.info(
            "Starting skill matching",
            source_count=len(request.source_skills),
            target_count=len(request.target_skills),
            match_type=request.match_type,
        )

        # Match skills
        result = await similarity_matcher.match_skills(
            source_skills=request.source_skills,
            target_skills=request.target_skills,
            threshold=request.threshold,
            match_type=request.match_type,
        )

        response = MatchSkillsResponse(
            matches=result["matches"],
            unmatched_source=result["unmatched_source"],
            unmatched_target=result["unmatched_target"],
            average_confidence=result.get("average_confidence", 0.0),
        )

        logger.info("Skill matching completed")
        return response

    except Exception as e:
        logger.error("Failed to match skills", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to match skills: {str(e)}")

@app.get("/taxonomy/stats", response_model=TaxonomyStats)
async def get_taxonomy_stats():
    """Get statistics about the current taxonomy"""
    if not taxonomy_manager:
        raise HTTPException(status_code=503, detail="Taxonomy manager unavailable")

    try:
        stats = await taxonomy_manager.get_taxonomy_stats()
        return TaxonomyStats(**stats)
    except Exception as e:
        logger.error("Failed to get taxonomy stats", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get taxonomy stats: {str(e)}")

@app.get("/taxonomy/categories")
async def get_taxonomy_categories():
    """Get all available skill categories"""
    if not taxonomy_manager:
        raise HTTPException(status_code=503, detail="Taxonomy manager unavailable")

    try:
        categories = await taxonomy_manager.get_categories()
        return {"categories": categories}
    except Exception as e:
        logger.error("Failed to get taxonomy categories", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get categories: {str(e)}")

@app.get("/taxonomy/skills/{category}")
async def get_skills_by_category(
    category: str,
    limit: int = Query(100, description="Maximum number of skills to return"),
    offset: int = Query(0, description="Offset for pagination"),
):
    """Get all skills in a specific category"""
    if not taxonomy_manager:
        raise HTTPException(status_code=503, detail="Taxonomy manager unavailable")

    try:
        skills = await taxonomy_manager.get_skills_by_category(category, limit, offset)
        return {"category": category, "skills": skills}
    except Exception as e:
        logger.error("Failed to get skills by category", category=category, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get skills: {str(e)}")

@app.post("/taxonomy/skills")
async def add_skill(skill_data: Dict[str, Any]):
    """Add a new skill to the taxonomy"""
    if not taxonomy_manager:
        raise HTTPException(status_code=503, detail="Taxonomy manager unavailable")

    try:
        required_fields = ["name", "category"]
        if not all(field in skill_data for field in required_fields):
            raise HTTPException(status_code=400, detail="Missing required fields: name, category")

        skill_id = await taxonomy_manager.add_skill(skill_data)
        return {"skill_id": skill_id, "message": "Skill added successfully"}
    except Exception as e:
        logger.error("Failed to add skill", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to add skill: {str(e)}")

@app.put("/taxonomy/skills/{skill_id}")
async def update_skill(skill_id: str, skill_data: Dict[str, Any]):
    """Update an existing skill in the taxonomy"""
    if not taxonomy_manager:
        raise HTTPException(status_code=503, detail="Taxonomy manager unavailable")

    try:
        updated = await taxonomy_manager.update_skill(skill_id, skill_data)
        if not updated:
            raise HTTPException(status_code=404, detail="Skill not found")

        return {"message": "Skill updated successfully"}
    except Exception as e:
        logger.error("Failed to update skill", skill_id=skill_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to update skill: {str(e)}")

@app.delete("/taxonomy/skills/{skill_id}")
async def delete_skill(skill_id: str):
    """Delete a skill from the taxonomy"""
    if not taxonomy_manager:
        raise HTTPException(status_code=503, detail="Taxonomy manager unavailable")

    try:
        deleted = await taxonomy_manager.delete_skill(skill_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Skill not found")

        return {"message": "Skill deleted successfully"}
    except Exception as e:
        logger.error("Failed to delete skill", skill_id=skill_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete skill: {str(e)}")

@app.post("/cluster")
async def cluster_skills(
    skills: List[str],
    method: str = Query("semantic", description="Clustering method: semantic, similarity, category"),
    min_cluster_size: int = Query(2, description="Minimum skills per cluster"),
):
    """Cluster skills based on similarity or semantics"""
    if not skill_clusterer:
        raise HTTPException(status_code=503, detail="Skill clusterer unavailable")

    try:
        logger.info("Starting skill clustering", skill_count=len(skills), method=method)

        clusters = await skill_clusterer.cluster_skills(
            skills=skills,
            method=method,
            min_cluster_size=min_cluster_size,
        )

        logger.info("Skill clustering completed", cluster_count=len(clusters))
        return {"clusters": clusters}
    except Exception as e:
        logger.error("Failed to cluster skills", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to cluster skills: {str(e)}")

@app.post("/suggest/aliases")
async def suggest_aliases(skill: str, max_suggestions: int = Query(10)):
    """Suggest aliases for a given skill"""
    if not skill_normalizer:
        raise HTTPException(status_code=503, detail="Skill normalizer unavailable")

    try:
        aliases = await skill_normalizer.suggest_aliases(skill, max_suggestions)
        return {"skill": skill, "suggested_aliases": aliases}
    except Exception as e:
        logger.error("Failed to suggest aliases", skill=skill, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to suggest aliases: {str(e)}")

@app.post("/taxonomy/learn")
async def learn_from_data(
    source_skills: List[str],
    target_skills: List[str],
    background_tasks: BackgroundTasks,
):
    """Learn from skill normalization patterns to improve the taxonomy"""
    if not taxonomy_manager or not skill_normalizer:
        raise HTTPException(status_code=503, detail="Learning services unavailable")

    try:
        # Add to learning queue for background processing
        background_tasks.add_task(
            skill_normalizer.learn_from_mappings,
            source_skills,
            target_skills,
        )

        return {"message": "Learning task queued", "status": "processing"}
    except Exception as e:
        logger.error("Failed to queue learning task", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to queue learning task: {str(e)}")

@app.get("/search")
async def search_skills(
    query: str,
    category: Optional[str] = None,
    limit: int = Query(20, description="Maximum number of results"),
    threshold: float = Query(0.6, description="Similarity threshold"),
):
    """Search for skills in the taxonomy"""
    if not taxonomy_manager:
        raise HTTPException(status_code=503, detail="Taxonomy manager unavailable")

    try:
        results = await taxonomy_manager.search_skills(
            query=query,
            category=category,
            limit=limit,
            threshold=threshold,
        )

        return {"query": query, "results": results}
    except Exception as e:
        logger.error("Failed to search skills", query=query, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to search skills: {str(e)}")

@app.post("/taxonomy/import")
async def import_taxonomy_data(
    taxonomy_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
):
    """Import taxonomy data from external sources"""
    if not taxonomy_manager:
        raise HTTPException(status_code=503, detail="Taxonomy manager unavailable")

    try:
        # Validate taxonomy data structure
        if "categories" not in taxonomy_data and "skills" not in taxonomy_data:
            raise HTTPException(status_code=400, detail="Invalid taxonomy data format")

        # Queue import for background processing
        background_tasks.add_task(taxonomy_manager.import_taxonomy_data, taxonomy_data)

        return {"message": "Taxonomy import queued", "status": "processing"}
    except Exception as e:
        logger.error("Failed to queue taxonomy import", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to queue import: {str(e)}")

@app.get("/taxonomy/export")
async def export_taxonomy_data(format: str = Query("json", description="Export format: json, csv")):
    """Export current taxonomy data"""
    if not taxonomy_manager:
        raise HTTPException(status_code=503, detail="Taxonomy manager unavailable")

    try:
        data = await taxonomy_manager.export_taxonomy_data(format=format)
        return {"format": format, "data": data}
    except Exception as e:
        logger.error("Failed to export taxonomy data", format=format, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8002")),
        reload=os.getenv("ENVIRONMENT") == "development",
        log_level="info",
    )
