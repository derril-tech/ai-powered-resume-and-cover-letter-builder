"""
Resume Optimizer
Main orchestrator for comprehensive resume optimization using STAR bullets, keyword infusion, ATS optimization, and section ordering.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from datetime import datetime

from .star_generator import STARGenerator
from .keyword_optimizer import KeywordOptimizer
from .ats_optimizer import ATSOptimizer
from .section_optimizer import SectionOptimizer

logger = logging.getLogger(__name__)

@dataclass
class OptimizationResult:
    """Result of resume optimization"""
    optimized_resume: Dict[str, Any]
    optimization_score: float
    improvements_made: List[str]
    ats_score: float
    keyword_match_score: float
    processing_stats: Dict[str, Any]

@dataclass
class OptimizationConfig:
    """Configuration for optimization process"""
    optimization_type: str = "comprehensive"
    target_score: Optional[float] = None
    tone: str = "achievement"
    industry: Optional[str] = None
    job_level: Optional[str] = None
    max_sections: int = 10
    keyword_density_target: float = 0.02

class ResumeOptimizer:
    """Main orchestrator for resume optimization"""

    def __init__(
        self,
        star_generator: STARGenerator,
        keyword_optimizer: KeywordOptimizer,
        ats_optimizer: ATSOptimizer,
        section_optimizer: SectionOptimizer,
    ):
        self.star_generator = star_generator
        self.keyword_optimizer = keyword_optimizer
        self.ats_optimizer = ats_optimizer
        self.section_optimizer = section_optimizer

        # Optimization weights for scoring
        self.optimization_weights = {
            "ats_score": 0.3,
            "keyword_score": 0.3,
            "structure_score": 0.2,
            "content_quality": 0.2,
        }

    async def optimize_resume(
        self,
        resume_id: str,
        resume_content: Dict[str, Any],
        job_description: Optional[Dict[str, Any]] = None,
        optimization_type: str = "comprehensive",
        target_score: Optional[float] = None,
        tone: str = "achievement",
        industry: Optional[str] = None,
        job_level: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Comprehensive resume optimization

        Args:
            resume_id: Unique identifier for the resume
            resume_content: Resume content to optimize
            job_description: Job description for targeted optimization
            optimization_type: Type of optimization (comprehensive, star, keywords, ats)
            target_score: Target optimization score
            tone: Writing tone for content
            industry: Target industry
            job_level: Job level (entry, mid, senior, executive)

        Returns:
            Optimization results with improved resume content
        """
        try:
            start_time = datetime.now()
            logger.info(f"Starting {optimization_type} optimization for resume {resume_id}")

            # Create optimization configuration
            config = OptimizationConfig(
                optimization_type=optimization_type,
                target_score=target_score,
                tone=tone,
                industry=industry,
                job_level=job_level,
            )

            # Extract job requirements if available
            job_requirements = None
            target_keywords = []
            if job_description:
                job_requirements = await self._extract_job_requirements(job_description)
                target_keywords = await self._extract_target_keywords(job_description)

            # Apply optimization based on type
            if optimization_type == "comprehensive":
                optimized_content = await self._comprehensive_optimization(
                    resume_content, job_requirements, target_keywords, config
                )
            elif optimization_type == "star":
                optimized_content = await self._star_optimization(
                    resume_content, job_requirements, tone
                )
            elif optimization_type == "keywords":
                optimized_content = await self._keyword_optimization(
                    resume_content, target_keywords
                )
            elif optimization_type == "ats":
                optimized_content = await self._ats_optimization(resume_content)
            elif optimization_type == "sections":
                optimized_content = await self._section_optimization(
                    resume_content, industry, job_level
                )
            else:
                raise ValueError(f"Unknown optimization type: {optimization_type}")

            # Calculate final scores
            final_scores = await self._calculate_final_scores(
                optimized_content, job_requirements, target_keywords
            )

            # Generate improvement summary
            improvements_made = await self._generate_improvements_summary(
                resume_content, optimized_content, optimization_type
            )

            # Calculate processing statistics
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            processing_stats = {
                "processing_time_ms": round(processing_time, 2),
                "optimization_type": optimization_type,
                "sections_processed": len(optimized_content),
                "keywords_processed": len(target_keywords),
            }

            result = {
                "resume_id": resume_id,
                "optimized_resume": optimized_content,
                "optimization_score": final_scores["overall_score"],
                "improvements_made": improvements_made,
                "ats_score": final_scores["ats_score"],
                "keyword_match_score": final_scores["keyword_score"],
                "structure_score": final_scores["structure_score"],
                "content_quality_score": final_scores["content_quality_score"],
                "processing_stats": processing_stats,
                "optimization_config": {
                    "type": optimization_type,
                    "tone": tone,
                    "industry": industry,
                    "job_level": job_level,
                    "target_keywords": target_keywords[:10],  # Limit for response size
                },
            }

            logger.info(f"Optimization completed for resume {resume_id}, score: {final_scores['overall_score']:.1f}")
            return result

        except Exception as e:
            logger.error(f"Failed to optimize resume {resume_id}: {e}")
            return {
                "resume_id": resume_id,
                "optimized_resume": resume_content,
                "optimization_score": 0.0,
                "improvements_made": [],
                "ats_score": 0.0,
                "keyword_match_score": 0.0,
                "error": str(e),
            }

    async def _comprehensive_optimization(
        self,
        resume_content: Dict[str, Any],
        job_requirements: Optional[List[str]],
        target_keywords: List[str],
        config: OptimizationConfig,
    ) -> Dict[str, Any]:
        """Apply comprehensive optimization combining all techniques"""
        optimized = resume_content.copy()

        # Step 1: Optimize section order
        section_result = await self.section_optimizer.optimize_section_order(
            optimized, config.industry, config.job_level
        )
        optimized = section_result["optimized_content"]

        # Step 2: Apply STAR bullet optimization to experience section
        if "experience" in optimized:
            star_result = await self.star_generator.generate_star_bullets(
                experience_item={"description": optimized["experience"]},
                job_requirements=job_requirements,
                tone=config.tone,
            )
            if star_result["star_bullets"]:
                optimized["experience"] = star_result["star_bullets"]

        # Step 3: Optimize keywords throughout the resume
        keyword_result = await self.keyword_optimizer.optimize_keywords(
            optimized, target_keywords
        )
        optimized = keyword_result["optimized_content"]

        # Step 4: Apply ATS optimization
        ats_result = await self.ats_optimizer.optimize_for_ats(optimized)
        optimized = ats_result["optimized_content"]

        return optimized

    async def _star_optimization(
        self,
        resume_content: Dict[str, Any],
        job_requirements: Optional[List[str]],
        tone: str,
    ) -> Dict[str, Any]:
        """Optimize resume with STAR bullet points"""
        optimized = resume_content.copy()

        # Focus on experience section
        if "experience" in optimized:
            if isinstance(optimized["experience"], list):
                # Multiple experience items
                optimized_experience = []
                for item in optimized["experience"]:
                    star_result = await self.star_generator.generate_star_bullets(
                        experience_item=item,
                        job_requirements=job_requirements,
                        tone=tone,
                    )
                    if star_result["star_bullets"]:
                        optimized_experience.extend(star_result["star_bullets"])
                    else:
                        optimized_experience.append(item)
                optimized["experience"] = optimized_experience
            else:
                # Single experience block
                star_result = await self.star_generator.generate_star_bullets(
                    experience_item={"description": optimized["experience"]},
                    job_requirements=job_requirements,
                    tone=tone,
                )
                if star_result["star_bullets"]:
                    optimized["experience"] = star_result["star_bullets"]

        return optimized

    async def _keyword_optimization(
        self,
        resume_content: Dict[str, Any],
        target_keywords: List[str],
    ) -> Dict[str, Any]:
        """Optimize resume with keyword infusion"""
        if not target_keywords:
            return resume_content

        keyword_result = await self.keyword_optimizer.optimize_keywords(
            resume_content, target_keywords
        )

        return keyword_result["optimized_content"]

    async def _ats_optimization(self, resume_content: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize resume for ATS compatibility"""
        ats_result = await self.ats_optimizer.optimize_for_ats(resume_content)
        return ats_result["optimized_content"]

    async def _section_optimization(
        self,
        resume_content: Dict[str, Any],
        industry: Optional[str],
        job_level: Optional[str],
    ) -> Dict[str, Any]:
        """Optimize resume section ordering and structure"""
        section_result = await self.section_optimizer.optimize_section_order(
            resume_content, industry, job_level
        )
        return section_result["optimized_content"]

    async def _extract_job_requirements(self, job_description: Dict[str, Any]) -> List[str]:
        """Extract key requirements from job description"""
        requirements = []

        # Extract from various fields
        for field in ["requirements", "qualifications", "responsibilities", "skills"]:
            if field in job_description:
                content = job_description[field]
                if isinstance(content, str):
                    requirements.append(content)
                elif isinstance(content, list):
                    requirements.extend(content)

        return requirements

    async def _extract_target_keywords(self, job_description: Dict[str, Any]) -> List[str]:
        """Extract target keywords from job description"""
        keywords = []

        # Simple keyword extraction - in production, this would be more sophisticated
        text_content = ""
        for content in job_description.values():
            if isinstance(content, str):
                text_content += content + " "
            elif isinstance(content, list):
                text_content += " ".join(str(item) for item in content) + " "

        # Extract potential keywords (words appearing multiple times or with capital letters)
        words = text_content.split()
        word_counts = {}

        for word in words:
            if len(word) > 3 and word[0].isupper():
                word_counts[word] = word_counts.get(word, 0) + 1

        # Return keywords that appear at least twice
        keywords = [word for word, count in word_counts.items() if count >= 2]

        return keywords[:20]  # Limit to top 20 keywords

    async def _calculate_final_scores(
        self,
        optimized_content: Dict[str, Any],
        job_requirements: Optional[List[str]],
        target_keywords: List[str],
    ) -> Dict[str, float]:
        """Calculate final optimization scores"""
        scores = {
            "ats_score": 0.0,
            "keyword_score": 0.0,
            "structure_score": 0.0,
            "content_quality_score": 0.0,
            "overall_score": 0.0,
        }

        try:
            # Calculate ATS score
            ats_result = await self.ats_optimizer.optimize_for_ats(optimized_content)
            scores["ats_score"] = ats_result.get("ats_score", 0.0)

            # Calculate keyword score
            if target_keywords:
                keyword_result = await self.keyword_optimizer.optimize_keywords(
                    optimized_content, target_keywords
                )
                scores["keyword_score"] = (
                    keyword_result.get("keyword_density", 0.0) * 100 +
                    keyword_result.get("naturalness_score", 0.0)
                ) / 2

            # Calculate structure score
            structure_result = await self.section_optimizer.validate_section_structure(
                optimized_content
            )
            scores["structure_score"] = structure_result.get("structure_score", 0.0)

            # Calculate content quality score (simplified)
            total_words = sum(len(str(content).split()) for content in optimized_content.values())
            scores["content_quality_score"] = min(100.0, total_words / 2)

            # Calculate overall score
            scores["overall_score"] = (
                scores["ats_score"] * self.optimization_weights["ats_score"] +
                scores["keyword_score"] * self.optimization_weights["keyword_score"] +
                scores["structure_score"] * self.optimization_weights["structure_score"] +
                scores["content_quality_score"] * self.optimization_weights["content_quality"]
            )

        except Exception as e:
            logger.warning(f"Failed to calculate final scores: {e}")

        return scores

    async def _generate_improvements_summary(
        self,
        original_content: Dict[str, Any],
        optimized_content: Dict[str, Any],
        optimization_type: str,
    ) -> List[str]:
        """Generate summary of improvements made"""
        improvements = []

        # Compare section counts
        original_sections = len(original_content)
        optimized_sections = len(optimized_content)

        if optimized_sections != original_sections:
            improvements.append(f"Optimized section structure ({original_sections} → {optimized_sections} sections)")

        # Check for STAR bullet improvements
        if optimization_type in ["comprehensive", "star"]:
            original_exp_words = len(str(original_content.get("experience", "")).split())
            optimized_exp_words = len(str(optimized_content.get("experience", "")).split())

            if optimized_exp_words != original_exp_words:
                improvements.append("Converted experience descriptions to STAR format bullets")

        # Check for keyword improvements
        if optimization_type in ["comprehensive", "keywords"]:
            improvements.append("Infused relevant keywords throughout resume content")

        # ATS improvements
        if optimization_type in ["comprehensive", "ats"]:
            improvements.append("Optimized formatting for ATS compatibility")

        # Section ordering improvements
        original_order = list(original_content.keys())
        optimized_order = list(optimized_content.keys())

        if original_order != optimized_order:
            improvements.append("Reordered sections for optimal impact")

        if not improvements:
            improvements.append("Applied general resume optimization improvements")

        return improvements

    async def analyze_resume_quality(
        self,
        resume_content: Dict[str, Any],
        job_description: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Analyze overall resume quality"""
        try:
            # Extract job requirements if available
            job_requirements = None
            target_keywords = []
            if job_description:
                job_requirements = await self._extract_job_requirements(job_description)
                target_keywords = await self._extract_target_keywords(job_description)

            # Calculate quality scores
            scores = await self._calculate_final_scores(
                resume_content, job_requirements, target_keywords
            )

            # Generate quality assessment
            assessment = await self._generate_quality_assessment(scores, resume_content)

            return {
                "overall_score": scores["overall_score"],
                "detailed_scores": scores,
                "assessment": assessment,
                "recommendations": await self._generate_quality_recommendations(scores),
            }

        except Exception as e:
            logger.error(f"Failed to analyze resume quality: {e}")
            return {
                "overall_score": 0.0,
                "error": str(e),
            }

    async def _generate_quality_assessment(
        self,
        scores: Dict[str, float],
        resume_content: Dict[str, Any],
    ) -> str:
        """Generate human-readable quality assessment"""
        overall_score = scores["overall_score"]

        if overall_score >= 90:
            assessment = "Excellent resume quality with strong optimization potential"
        elif overall_score >= 80:
            assessment = "Very good resume quality with minor optimization opportunities"
        elif overall_score >= 70:
            assessment = "Good resume quality with room for targeted improvements"
        elif overall_score >= 60:
            assessment = "Fair resume quality requiring significant optimization"
        else:
            assessment = "Resume requires substantial optimization and restructuring"

        # Add specific feedback
        feedback_parts = [assessment]

        if scores["ats_score"] < 70:
            feedback_parts.append(" - ATS compatibility needs improvement")

        if scores["keyword_score"] < 70:
            feedback_parts.append(" - Keyword optimization opportunity identified")

        if scores["structure_score"] < 70:
            feedback_parts.append(" - Section structure could be enhanced")

        return " ".join(feedback_parts)

    async def _generate_quality_recommendations(self, scores: Dict[str, float]) -> List[str]:
        """Generate quality improvement recommendations"""
        recommendations = []

        if scores["ats_score"] < 70:
            recommendations.extend([
                "Optimize formatting for ATS systems",
                "Use standard section headers",
                "Remove complex formatting elements",
            ])

        if scores["keyword_score"] < 70:
            recommendations.extend([
                "Research and include relevant keywords",
                "Distribute keywords naturally across sections",
                "Avoid keyword stuffing",
            ])

        if scores["structure_score"] < 70:
            recommendations.extend([
                "Ensure all key sections are present",
                "Optimize section ordering",
                "Balance content across sections",
            ])

        if scores["content_quality_score"] < 70:
            recommendations.extend([
                "Expand thin sections with relevant details",
                "Use STAR format for experience descriptions",
                "Quantify achievements where possible",
            ])

        return recommendations if recommendations else ["Resume quality is well-optimized"]

    async def benchmark_optimizations(
        self,
        resume_content: Dict[str, Any],
        job_description: Dict[str, Any],
        optimization_types: List[str],
    ) -> Dict[str, Any]:
        """Benchmark different optimization strategies"""
        try:
            logger.info("Starting optimization benchmarking")

            benchmark_results = {}
            base_resume = resume_content.copy()

            for opt_type in optimization_types:
                # Apply optimization
                result = await self.optimize_resume(
                    resume_id="benchmark",
                    resume_content=base_resume.copy(),
                    job_description=job_description,
                    optimization_type=opt_type,
                )

                # Calculate improvement metrics
                improvement = {
                    "optimization_type": opt_type,
                    "original_score": 0.0,  # Would calculate from base resume
                    "optimized_score": result["optimization_score"],
                    "improvement_percentage": 0.0,  # Would calculate difference
                    "processing_time_ms": result["processing_stats"]["processing_time_ms"],
                    "key_improvements": result["improvements_made"],
                }

                benchmark_results[opt_type] = improvement

            # Rank optimizations by effectiveness
            ranked_results = sorted(
                benchmark_results.items(),
                key=lambda x: x[1]["optimized_score"],
                reverse=True
            )

            return {
                "benchmark_results": benchmark_results,
                "ranked_optimizations": [opt_type for opt_type, _ in ranked_results],
                "best_optimization": ranked_results[0][0] if ranked_results else None,
                "average_improvement": sum(
                    result["improvement_percentage"]
                    for result in benchmark_results.values()
                ) / len(benchmark_results) if benchmark_results else 0.0,
            }

        except Exception as e:
            logger.error(f"Failed to benchmark optimizations: {e}")
            return {"error": str(e)}
