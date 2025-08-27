"""
Job Description Parser
Main orchestrator for parsing job descriptions and extracting structured information.
"""

import re
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import asyncio

from .nlp_processor import NLPProcessor
from .skill_extractor import SkillExtractor
from .keyword_extractor import KeywordExtractor

logger = logging.getLogger(__name__)

@dataclass
class ParsedJobResult:
    """Result of parsing a job description"""
    job_id: str
    skills: List[str]
    keywords: List[str]
    experience_level: Optional[str] = None
    education_level: Optional[str] = None
    salary_range: Optional[Dict[str, Any]] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    benefits: List[str] = []
    responsibilities: List[str] = []
    qualifications: List[str] = []
    technologies: List[str] = []
    soft_skills: List[str] = []
    industry_keywords: List[str] = []
    confidence_scores: Dict[str, float] = None

    def __post_init__(self):
        if self.confidence_scores is None:
            self.confidence_scores = {}

class JobDescriptionParser:
    """Main parser for job descriptions using NLP and ML techniques"""

    def __init__(
        self,
        nlp_processor: NLPProcessor,
        skill_extractor: SkillExtractor,
        keyword_extractor: KeywordExtractor,
    ):
        self.nlp_processor = nlp_processor
        self.skill_extractor = skill_extractor
        self.keyword_extractor = keyword_extractor

        # Common patterns for extraction
        self.experience_patterns = [
            r'(\d+)\s*[-+]\s*years?\s*(?:of\s*)?experience',
            r'experience\s*:\s*(\d+)\s*years?',
            r'minimum\s+(\d+)\s*years?\s*(?:of\s*)?experience',
            r'at\s+least\s+(\d+)\s*years?',
        ]

        self.education_patterns = [
            r'bachelor\s*s?\s*(?:degree|\'s)?(?:\s+in\s+[\w\s]+)?',
            r'master\s*s?\s*(?:degree|\'s)?(?:\s+in\s+[\w\s]+)?',
            r'ph\.?d\.?(?:\s+in\s+[\w\s]+)?',
            r'doctorate(?:\s+in\s+[\w\s]+)?',
            r'associate\s*s?\s*(?:degree|\'s)?',
        ]

        self.location_patterns = [
            r'(?:location|based|positioned)\s*:?\s*([^,\n]{1,50})',
            r'(?:remote|on-site|hybrid|flexible)\s*work',
            r'work\s+from\s+home',
        ]

        self.job_type_patterns = [
            r'(?:full\s*time|part\s*time|contract|temporary|freelance|internship)',
            r'(?:permanent|temporary|seasonal)',
        ]

    async def parse(
        self,
        job_id: str,
        title: str,
        text: str,
        company: Optional[str] = None,
    ) -> ParsedJobResult:
        """
        Parse a job description and extract structured information.

        Args:
            job_id: Unique identifier for the job
            title: Job title
            text: Full job description text
            company: Company name (optional)

        Returns:
            ParsedJobResult with extracted information
        """
        logger.info(f"Starting to parse job {job_id}")

        # Process text with NLP
        processed_text = await self.nlp_processor.process_text(text)

        # Extract information concurrently
        tasks = [
            self.skill_extractor.extract_skills(text),
            self.keyword_extractor.extract_keywords(text),
            self._extract_experience_level(text),
            self._extract_education_level(text),
            self._extract_salary_range(text),
            self._extract_location(text),
            self._extract_job_type(text),
            self._extract_benefits(text),
            self._extract_responsibilities(text),
            self._extract_qualifications(text),
            self._extract_technologies(text),
            self._extract_soft_skills(text),
            self._extract_industry_keywords(text, title, company),
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle results
        skills = results[0] if not isinstance(results[0], Exception) else []
        keywords = results[1] if not isinstance(results[1], Exception) else []
        experience_level = results[2] if not isinstance(results[2], Exception) else None
        education_level = results[3] if not isinstance(results[3], Exception) else None
        salary_range = results[4] if not isinstance(results[4], Exception) else None
        location = results[5] if not isinstance(results[5], Exception) else None
        job_type = results[6] if not isinstance(results[6], Exception) else None
        benefits = results[7] if not isinstance(results[7], Exception) else []
        responsibilities = results[8] if not isinstance(results[8], Exception) else []
        qualifications = results[9] if not isinstance(results[9], Exception) else []
        technologies = results[10] if not isinstance(results[10], Exception) else []
        soft_skills = results[11] if not isinstance(results[11], Exception) else []
        industry_keywords = results[12] if not isinstance(results[12], Exception) else []

        # Calculate confidence scores
        confidence_scores = self._calculate_confidence_scores(
            skills, keywords, text
        )

        result = ParsedJobResult(
            job_id=job_id,
            skills=skills,
            keywords=keywords,
            experience_level=experience_level,
            education_level=education_level,
            salary_range=salary_range,
            location=location,
            job_type=job_type,
            benefits=benefits,
            responsibilities=responsibilities,
            qualifications=qualifications,
            technologies=technologies,
            soft_skills=soft_skills,
            industry_keywords=industry_keywords,
            confidence_scores=confidence_scores,
        )

        logger.info(f"Completed parsing job {job_id}")
        return result

    async def _extract_experience_level(self, text: str) -> Optional[str]:
        """Extract experience level requirements"""
        for pattern in self.experience_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                years = int(match.group(1))
                if years <= 2:
                    return "Entry Level"
                elif years <= 5:
                    return "Mid Level"
                elif years <= 10:
                    return "Senior Level"
                else:
                    return "Executive Level"

        # Fallback based on keywords
        if any(word in text.lower() for word in ['junior', 'entry', 'graduate']):
            return "Entry Level"
        elif any(word in text.lower() for word in ['senior', 'lead', 'principal']):
            return "Senior Level"
        elif any(word in text.lower() for word in ['mid', 'intermediate']):
            return "Mid Level"

        return None

    async def _extract_education_level(self, text: str) -> Optional[str]:
        """Extract education requirements"""
        for pattern in self.education_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                matched_text = match.group(0).lower()
                if 'phd' in matched_text or 'doctorate' in matched_text:
                    return "Doctorate"
                elif 'master' in matched_text:
                    return "Master's Degree"
                elif 'bachelor' in matched_text:
                    return "Bachelor's Degree"
                elif 'associate' in matched_text:
                    return "Associate Degree"

        return None

    async def _extract_salary_range(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract salary information"""
        # This would use more sophisticated NLP for salary extraction
        # For now, return None as salary parsing is complex
        salary_patterns = [
            r'\$?(\d{2,3}(?:,\d{3})*)(?:\s*[-–]\s*\$?(\d{2,3}(?:,\d{3})*))?',
            r'(\d{2,3}(?:,\d{3})*)\s*to\s*(\d{2,3}(?:,\d{3})*)',
        ]

        for pattern in salary_patterns:
            match = re.search(pattern, text)
            if match:
                if match.group(2):
                    return {
                        "min": int(match.group(1).replace(',', '')),
                        "max": int(match.group(2).replace(',', '')),
                        "currency": "USD",
                    }
                else:
                    return {
                        "amount": int(match.group(1).replace(',', '')),
                        "currency": "USD",
                    }

        return None

    async def _extract_location(self, text: str) -> Optional[str]:
        """Extract job location"""
        for pattern in self.location_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip() if match.groups() else match.group(0).strip()

        return None

    async def _extract_job_type(self, text: str) -> Optional[str]:
        """Extract job type (full-time, part-time, etc.)"""
        for pattern in self.job_type_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                job_type = match.group(0).title()
                return job_type

        return None

    async def _extract_benefits(self, text: str) -> List[str]:
        """Extract benefits mentioned in the job description"""
        benefit_keywords = [
            'health insurance', 'dental insurance', 'vision insurance',
            '401k', 'retirement plan', 'paid time off', 'pto', 'vacation',
            'sick leave', 'maternity leave', 'paternity leave',
            'remote work', 'flexible hours', 'work from home',
            'professional development', 'training', 'certification',
            'bonus', 'stock options', 'equity', 'profit sharing',
        ]

        benefits = []
        for benefit in benefit_keywords:
            if benefit.lower() in text.lower():
                benefits.append(benefit.title())

        return list(set(benefits))  # Remove duplicates

    async def _extract_responsibilities(self, text: str) -> List[str]:
        """Extract job responsibilities"""
        # Look for bullet points or numbered lists
        responsibility_patterns = [
            r'•\s*(.+?)(?=•|$)',
            r'\d+\.\s*(.+?)(?=\d+\.|$)',
            r'-\s*(.+?)(?=-|$)',
        ]

        responsibilities = []
        for pattern in responsibility_patterns:
            matches = re.findall(pattern, text, re.DOTALL)
            for match in matches:
                clean_match = re.sub(r'\s+', ' ', match.strip())
                if len(clean_match) > 10:  # Filter out very short items
                    responsibilities.append(clean_match)

        return responsibilities[:10]  # Limit to top 10

    async def _extract_qualifications(self, text: str) -> List[str]:
        """Extract required qualifications"""
        # Similar to responsibilities but look for qualification-specific sections
        qual_patterns = [
            r'(?:requirements?|qualifications?)\s*:?\s*(.+?)(?=\n\n|\n[A-Z]|$)',
        ]

        qualifications = []
        for pattern in qual_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            for match in matches:
                # Split by bullets or line breaks
                items = re.split(r'•|\n|-\s*', match)
                for item in items:
                    clean_item = re.sub(r'\s+', ' ', item.strip())
                    if len(clean_item) > 10:
                        qualifications.append(clean_item)

        return qualifications[:8]  # Limit to top 8

    async def _extract_technologies(self, text: str) -> List[str]:
        """Extract mentioned technologies and tools"""
        # This would use a comprehensive technology dictionary
        # For now, use common tech keywords
        tech_keywords = [
            'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust',
            'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt.js',
            'node.js', 'express', 'fastapi', 'django', 'flask', 'spring',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
            'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
            'git', 'jenkins', 'github', 'gitlab', 'bitbucket',
        ]

        technologies = []
        for tech in tech_keywords:
            if tech.lower() in text.lower():
                technologies.append(tech.title())

        return list(set(technologies))

    async def _extract_soft_skills(self, text: str) -> List[str]:
        """Extract soft skills"""
        soft_skill_keywords = [
            'communication', 'leadership', 'teamwork', 'problem solving',
            'critical thinking', 'adaptability', 'creativity', 'time management',
            'project management', 'customer service', 'collaboration',
            'analytical skills', 'attention to detail', 'flexibility',
            'emotional intelligence', 'conflict resolution', 'mentoring',
        ]

        soft_skills = []
        for skill in soft_skill_keywords:
            if skill.lower() in text.lower():
                soft_skills.append(skill.title())

        return list(set(soft_skills))

    async def _extract_industry_keywords(self, text: str, title: str, company: Optional[str]) -> List[str]:
        """Extract industry-specific keywords"""
        # This would use industry classification models
        # For now, use simple keyword matching
        industry_keywords = []

        # Add title-based keywords
        title_words = re.findall(r'\b\w{4,}\b', title.lower())
        industry_keywords.extend(title_words)

        # Add company-based keywords if available
        if company:
            company_words = re.findall(r'\b\w{4,}\b', company.lower())
            industry_keywords.extend(company_words)

        return list(set(industry_keywords))[:5]  # Limit to top 5

    def _calculate_confidence_scores(
        self,
        skills: List[str],
        keywords: List[str],
        text: str,
    ) -> Dict[str, float]:
        """Calculate confidence scores for extracted information"""
        total_length = len(text)

        # Skills confidence based on number and relevance
        skills_confidence = min(len(skills) / 10, 1.0) if skills else 0.0

        # Keywords confidence based on diversity and length
        keyword_diversity = len(set(keywords)) / len(keywords) if keywords else 0.0
        keywords_confidence = min(len(keywords) / 20, 1.0) * keyword_diversity

        # Experience confidence based on pattern matching
        experience_confidence = 1.0 if re.search(r'\d+\s*years?', text) else 0.5

        # Education confidence based on academic terms
        education_confidence = 1.0 if re.search(r'bachelor|master|phd|degree', text, re.IGNORECASE) else 0.3

        return {
            'skills': skills_confidence,
            'keywords': keywords_confidence,
            'experience': experience_confidence,
            'education': education_confidence,
            'overall': (skills_confidence + keywords_confidence + experience_confidence + education_confidence) / 4,
        }
