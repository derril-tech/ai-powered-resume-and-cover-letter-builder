"""
Section Optimizer
Optimizes resume section ordering, content distribution, and structural effectiveness.
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class SectionPriority(Enum):
    """Priority levels for resume sections"""
    CRITICAL = 5
    HIGH = 4
    MEDIUM = 3
    LOW = 2
    OPTIONAL = 1

@dataclass
class SectionAnalysis:
    """Analysis results for a resume section"""
    name: str
    priority: SectionPriority
    word_count: int
    keyword_density: float
    readability_score: float
    impact_score: float
    recommendations: List[str]

@dataclass
class SectionOrder:
    """Optimal section ordering configuration"""
    sections: List[str]
    reasoning: str
    expected_impact: str

class SectionOptimizer:
    """Optimizes resume section ordering and content distribution"""

    def __init__(self):
        # Standard section configurations
        self.section_definitions = {
            "contact": {
                "priority": SectionPriority.CRITICAL,
                "typical_length": 10,
                "keywords": ["phone", "email", "address", "linkedin"],
                "description": "Contact information and personal details",
            },
            "summary": {
                "priority": SectionPriority.HIGH,
                "typical_length": 50,
                "keywords": ["summary", "objective", "profile", "overview"],
                "description": "Professional summary or career objective",
            },
            "experience": {
                "priority": SectionPriority.CRITICAL,
                "typical_length": 200,
                "keywords": ["experience", "work", "employment", "role", "position"],
                "description": "Work experience and professional history",
            },
            "education": {
                "priority": SectionPriority.CRITICAL,
                "typical_length": 40,
                "keywords": ["education", "degree", "university", "college", "gpa"],
                "description": "Educational background and qualifications",
            },
            "skills": {
                "priority": SectionPriority.HIGH,
                "typical_length": 30,
                "keywords": ["skills", "competencies", "expertise", "technologies"],
                "description": "Technical and professional skills",
            },
            "projects": {
                "priority": SectionPriority.MEDIUM,
                "typical_length": 60,
                "keywords": ["projects", "portfolio", "achievements", "accomplishments"],
                "description": "Notable projects and portfolio items",
            },
            "certifications": {
                "priority": SectionPriority.MEDIUM,
                "typical_length": 25,
                "keywords": ["certifications", "certificates", "credentials", "licenses"],
                "description": "Professional certifications and credentials",
            },
            "awards": {
                "priority": SectionPriority.LOW,
                "typical_length": 20,
                "keywords": ["awards", "honors", "recognition", "achievements"],
                "description": "Awards, honors, and recognitions",
            },
            "publications": {
                "priority": SectionPriority.LOW,
                "typical_length": 30,
                "keywords": ["publications", "papers", "articles", "research"],
                "description": "Publications and research work",
            },
            "volunteer": {
                "priority": SectionPriority.OPTIONAL,
                "typical_length": 25,
                "keywords": ["volunteer", "community", "service", "involvement"],
                "description": "Volunteer work and community involvement",
            },
        }

        # Industry-specific section ordering preferences
        self.industry_orders = {
            "technology": [
                "contact", "summary", "experience", "skills", "projects",
                "education", "certifications", "awards"
            ],
            "finance": [
                "contact", "summary", "experience", "education", "certifications",
                "skills", "awards", "projects"
            ],
            "marketing": [
                "contact", "summary", "experience", "skills", "projects",
                "education", "certifications", "awards"
            ],
            "healthcare": [
                "contact", "summary", "experience", "education", "certifications",
                "skills", "awards", "projects"
            ],
            "education": [
                "contact", "summary", "experience", "education", "certifications",
                "skills", "projects", "awards"
            ],
        }

        # Default optimal order
        self.default_order = [
            "contact", "summary", "experience", "skills", "projects",
            "education", "certifications", "awards", "publications", "volunteer"
        ]

    async def optimize_section_order(
        self,
        resume_content: Dict[str, Any],
        industry: Optional[str] = None,
        job_level: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Optimize the ordering of resume sections

        Args:
            resume_content: Resume content dictionary
            industry: Target industry for optimization
            job_level: Job level (entry, mid, senior, executive)

        Returns:
            Optimized resume with reordered sections
        """
        try:
            logger.info(f"Optimizing section order for industry: {industry}")

            # Analyze current sections
            section_analysis = await self._analyze_sections(resume_content)

            # Determine optimal order
            optimal_order = await self._determine_optimal_order(
                section_analysis, industry, job_level
            )

            # Reorder sections
            reordered_content = await self._reorder_sections(resume_content, optimal_order)

            # Generate optimization report
            optimization_report = await self._generate_optimization_report(
                section_analysis, optimal_order
            )

            result = {
                "optimized_content": reordered_content,
                "original_order": list(resume_content.keys()),
                "optimal_order": optimal_order.sections,
                "optimization_reasoning": optimal_order.reasoning,
                "expected_impact": optimal_order.expected_impact,
                "section_analysis": [
                    {
                        "name": analysis.name,
                        "priority": analysis.priority.value,
                        "word_count": analysis.word_count,
                        "impact_score": analysis.impact_score,
                        "recommendations": analysis.recommendations,
                    }
                    for analysis in section_analysis
                ],
                "optimization_report": optimization_report,
            }

            logger.info(f"Section order optimization completed")
            return result

        except Exception as e:
            logger.error(f"Failed to optimize section order: {e}")
            return {
                "optimized_content": resume_content,
                "original_order": list(resume_content.keys()),
                "optimal_order": list(resume_content.keys()),
                "error": str(e),
            }

    async def _analyze_sections(self, resume_content: Dict[str, Any]) -> List[SectionAnalysis]:
        """Analyze each section for optimization opportunities"""
        analyses = []

        for section_name, section_content in resume_content.items():
            analysis = await self._analyze_single_section(section_name, section_content)
            analyses.append(analysis)

        # Sort by priority
        analyses.sort(key=lambda x: x.priority.value, reverse=True)

        return analyses

    async def _analyze_single_section(
        self,
        section_name: str,
        section_content: Any,
    ) -> SectionAnalysis:
        """Analyze a single section"""
        # Extract text content
        text_content = self._extract_section_text(section_content)
        word_count = len(text_content.split())

        # Get section definition
        section_def = self.section_definitions.get(section_name.lower(), {
            "priority": SectionPriority.OPTIONAL,
            "typical_length": 50,
            "keywords": [],
        })

        # Calculate keyword density
        keyword_density = await self._calculate_keyword_density(
            text_content, section_def["keywords"]
        )

        # Calculate readability score
        readability_score = await self._calculate_readability_score(text_content)

        # Calculate impact score
        impact_score = await self._calculate_section_impact(
            section_name, text_content, word_count, keyword_density
        )

        # Generate recommendations
        recommendations = await self._generate_section_recommendations(
            section_name, word_count, keyword_density, readability_score, section_def
        )

        return SectionAnalysis(
            name=section_name,
            priority=section_def["priority"],
            word_count=word_count,
            keyword_density=keyword_density,
            readability_score=readability_score,
            impact_score=impact_score,
            recommendations=recommendations,
        )

    def _extract_section_text(self, section_content: Any) -> str:
        """Extract text from section content"""
        if isinstance(section_content, str):
            return section_content
        elif isinstance(section_content, list):
            text_parts = []
            for item in section_content:
                if isinstance(item, str):
                    text_parts.append(item)
                elif isinstance(item, dict):
                    text_parts.extend(str(v) for v in item.values() if v)
            return ' '.join(text_parts)
        elif isinstance(section_content, dict):
            return ' '.join(str(v) for v in section_content.values() if v)
        return str(section_content)

    async def _calculate_keyword_density(self, text: str, keywords: List[str]) -> float:
        """Calculate keyword density for a section"""
        if not text or not keywords:
            return 0.0

        text_lower = text.lower()
        total_words = len(text.split())

        if total_words == 0:
            return 0.0

        keyword_count = 0
        for keyword in keywords:
            keyword_count += text_lower.count(keyword.lower())

        return keyword_count / total_words

    async def _calculate_readability_score(self, text: str) -> float:
        """Calculate readability score for section text"""
        if not text:
            return 0.0

        words = text.split()
        sentences = re.split(r'[.!?]+', text)

        # Simple readability metrics
        avg_words_per_sentence = len(words) / len(sentences) if sentences else 0
        avg_syllables_per_word = sum(self._count_syllables(word) for word in words) / len(words) if words else 0

        # Flesch Reading Ease (simplified)
        score = 206.835 - 1.015 * avg_words_per_sentence - 84.6 * avg_syllables_per_word

        # Normalize to 0-100 scale
        return max(0.0, min(100.0, score))

    def _count_syllables(self, word: str) -> int:
        """Count syllables in a word (simplified)"""
        word = word.lower()
        count = 0
        vowels = "aeiouy"

        if word[0] in vowels:
            count += 1

        for i in range(1, len(word)):
            if word[i] in vowels and word[i - 1] not in vowels:
                count += 1

        if word.endswith("e"):
            count -= 1

        return max(1, count)

    async def _calculate_section_impact(self, section_name: str, text: str, word_count: int, keyword_density: float) -> float:
        """Calculate impact score for a section"""
        base_score = 0.0

        # Base score from section priority
        section_def = self.section_definitions.get(section_name.lower(), {})
        priority_score = section_def.get("priority", SectionPriority.OPTIONAL).value * 20

        # Content quality score
        content_score = min(50, word_count / 2)  # Up to 50 points for content length

        # Keyword relevance score
        keyword_score = min(30, keyword_density * 300)  # Up to 30 points for keyword density

        base_score = priority_score + content_score + keyword_score

        # Bonus for well-structured content
        if word_count > 20 and keyword_density > 0.01:
            base_score += 10

        return min(100.0, base_score)

    async def _generate_section_recommendations(
        self,
        section_name: str,
        word_count: int,
        keyword_density: float,
        readability_score: float,
        section_def: Dict[str, Any],
    ) -> List[str]:
        """Generate recommendations for section improvement"""
        recommendations = []

        typical_length = section_def.get("typical_length", 50)

        # Length recommendations
        if word_count < typical_length * 0.5:
            recommendations.append(f"Consider expanding {section_name} section with more detail")
        elif word_count > typical_length * 2:
            recommendations.append(f"Consider condensing {section_name} section to focus on key points")

        # Keyword density recommendations
        if keyword_density < 0.01:
            recommendations.append(f"Add relevant keywords to {section_name} section")
        elif keyword_density > 0.1:
            recommendations.append(f"Reduce keyword density in {section_name} to avoid stuffing")

        # Readability recommendations
        if readability_score < 40:
            recommendations.append(f"Improve readability of {section_name} with shorter sentences")

        return recommendations

    async def _determine_optimal_order(
        self,
        section_analysis: List[SectionAnalysis],
        industry: Optional[str],
        job_level: Optional[str],
    ) -> SectionOrder:
        """Determine optimal section ordering"""
        # Start with industry-specific order if available
        if industry and industry.lower() in self.industry_orders:
            base_order = self.industry_orders[industry.lower()].copy()
            reasoning = f"Optimized for {industry} industry standards"
        else:
            base_order = self.default_order.copy()
            reasoning = "Using standard resume optimization order"

        # Adjust for job level
        if job_level:
            if job_level.lower() in ["senior", "executive"]:
                # Move projects and certifications higher for senior roles
                if "projects" in base_order:
                    base_order.remove("projects")
                    base_order.insert(4, "projects")
                reasoning += f", adjusted for {job_level} level position"
            elif job_level.lower() in ["entry", "junior"]:
                # Keep education high for entry-level
                reasoning += f", optimized for {job_level} level position"

        # Sort sections by priority and current performance
        available_sections = {analysis.name: analysis for analysis in section_analysis}
        ordered_sections = []

        # First, add high-priority sections in optimal order
        for section_name in base_order:
            if section_name in available_sections:
                ordered_sections.append(section_name)

        # Then add any remaining sections by priority
        remaining_sections = [
            analysis.name for analysis in section_analysis
            if analysis.name not in ordered_sections
        ]

        remaining_sections.sort(
            key=lambda x: available_sections[x].priority.value,
            reverse=True
        )

        ordered_sections.extend(remaining_sections)

        # Determine expected impact
        impact_descriptions = {
            "technology": "Better keyword matching for tech roles",
            "finance": "Emphasis on education and certifications",
            "marketing": "Showcase of projects and creative work",
            "healthcare": "Focus on certifications and education",
            "education": "Academic background prominence",
        }

        expected_impact = impact_descriptions.get(
            industry, "Improved ATS parsing and reader flow"
        )

        return SectionOrder(
            sections=ordered_sections,
            reasoning=reasoning,
            expected_impact=expected_impact,
        )

    async def _reorder_sections(
        self,
        resume_content: Dict[str, Any],
        optimal_order: SectionOrder,
    ) -> Dict[str, Any]:
        """Reorder sections according to optimal order"""
        reordered_content = {}

        # Add sections in optimal order
        for section_name in optimal_order.sections:
            if section_name in resume_content:
                reordered_content[section_name] = resume_content[section_name]

        # Add any remaining sections that weren't in optimal order
        for section_name, section_content in resume_content.items():
            if section_name not in reordered_content:
                reordered_content[section_name] = section_content

        return reordered_content

    async def _generate_optimization_report(
        self,
        section_analysis: List[SectionAnalysis],
        optimal_order: SectionOrder,
    ) -> Dict[str, Any]:
        """Generate comprehensive optimization report"""
        # Calculate section statistics
        total_words = sum(analysis.word_count for analysis in section_analysis)
        avg_impact = sum(analysis.impact_score for analysis in section_analysis) / len(section_analysis)

        # Identify strongest and weakest sections
        sorted_by_impact = sorted(section_analysis, key=lambda x: x.impact_score, reverse=True)
        strongest_section = sorted_by_impact[0] if sorted_by_impact else None
        weakest_section = sorted_by_impact[-1] if sorted_by_impact else None

        # Content distribution analysis
        content_distribution = {
            "excellent": len([a for a in section_analysis if a.impact_score >= 80]),
            "good": len([a for a in section_analysis if 60 <= a.impact_score < 80]),
            "needs_improvement": len([a for a in section_analysis if a.impact_score < 60]),
        }

        return {
            "total_sections": len(section_analysis),
            "total_words": total_words,
            "average_impact_score": round(avg_impact, 1),
            "strongest_section": strongest_section.name if strongest_section else None,
            "weakest_section": weakest_section.name if weakest_section else None,
            "content_distribution": content_distribution,
            "optimization_confidence": await self._calculate_optimization_confidence(
                section_analysis, optimal_order
            ),
        }

    async def _calculate_optimization_confidence(
        self,
        section_analysis: List[SectionAnalysis],
        optimal_order: SectionOrder,
    ) -> float:
        """Calculate confidence in the optimization"""
        confidence = 70.0  # Base confidence

        # Increase confidence based on section analysis quality
        high_priority_sections = [
            analysis for analysis in section_analysis
            if analysis.priority.value >= SectionPriority.HIGH.value
        ]

        if high_priority_sections:
            avg_priority_score = sum(a.priority.value for a in high_priority_sections) / len(high_priority_sections)
            confidence += min(20, avg_priority_score * 4)

        # Increase confidence if we have good content distribution
        word_counts = [a.word_count for a in section_analysis]
        if word_counts and max(word_counts) / (sum(word_counts) / len(word_counts)) < 5:
            confidence += 10  # Balanced content distribution

        return min(100.0, confidence)

    async def validate_section_structure(
        self,
        resume_content: Dict[str, Any],
        industry: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Validate resume section structure"""
        try:
            analysis = await self._analyze_sections(resume_content)

            # Check for required sections
            required_sections = {"contact", "experience", "education", "skills"}
            present_sections = {section.name.lower() for section in analysis}
            missing_sections = required_sections - present_sections

            # Industry-specific validation
            industry_sections = set()
            if industry and industry.lower() in self.industry_orders:
                industry_sections = set(self.industry_orders[industry.lower()])

            # Structure score
            structure_score = 100

            if missing_sections:
                structure_score -= len(missing_sections) * 15

            # Check section ordering
            current_order = list(resume_content.keys())
            optimal_order = await self._determine_optimal_order(analysis, industry, None)

            order_matches = sum(1 for i, section in enumerate(current_order)
                              if i < len(optimal_order.sections) and section == optimal_order.sections[i])

            order_score = (order_matches / len(current_order)) * 100 if current_order else 0
            structure_score = (structure_score + order_score) / 2

            return {
                "structure_score": round(structure_score, 1),
                "present_sections": list(present_sections),
                "missing_sections": list(missing_sections),
                "recommended_sections": list(industry_sections - present_sections) if industry_sections else [],
                "section_analysis": [
                    {
                        "name": section.name,
                        "priority": section.priority.value,
                        "adequacy_score": round(section.impact_score, 1),
                    }
                    for section in analysis
                ],
            }

        except Exception as e:
            logger.error(f"Failed to validate section structure: {e}")
            return {
                "structure_score": 0.0,
                "error": str(e),
            }

    async def optimize_section_content(
        self,
        section_name: str,
        section_content: Any,
        target_keywords: List[str],
        max_length: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Optimize content within a specific section"""
        try:
            text_content = self._extract_section_text(section_content)
            word_count = len(text_content.split())

            # Content optimization strategies
            optimizations = []

            # Length optimization
            if max_length and word_count > max_length:
                optimizations.append("content_shortening")
                # This would implement content shortening logic

            # Keyword integration
            if target_keywords:
                current_keywords = [kw for kw in target_keywords if kw.lower() in text_content.lower()]
                missing_keywords = [kw for kw in target_keywords if kw.lower() not in text_content.lower()]

                if missing_keywords:
                    optimizations.append("keyword_integration")
                    # This would implement keyword integration logic

            # Readability improvement
            readability_score = await self._calculate_readability_score(text_content)
            if readability_score < 50:
                optimizations.append("readability_improvement")
                # This would implement readability improvements

            return {
                "original_content": section_content,
                "optimized_content": section_content,  # Placeholder
                "optimizations_applied": optimizations,
                "improvement_score": 0.0,  # Placeholder
                "word_count_change": 0,
            }

        except Exception as e:
            logger.error(f"Failed to optimize section content: {e}")
            return {
                "original_content": section_content,
                "optimized_content": section_content,
                "error": str(e),
            }
