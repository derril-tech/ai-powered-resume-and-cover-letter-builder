"""
ATS Optimizer
Optimizes resumes for Applicant Tracking Systems with improved parsing, keyword matching, and formatting.
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ATSRule(Enum):
    """Common ATS rules and requirements"""
    KEYWORD_MATCHING = "keyword_matching"
    FORMAT_COMPATIBILITY = "format_compatibility"
    STRUCTURE_PARSING = "structure_parsing"
    CONTENT_OPTIMIZATION = "content_optimization"
    FILE_FORMAT = "file_format"

@dataclass
class ATSIssue:
    """Represents an ATS compatibility issue"""
    rule: ATSRule
    severity: str  # 'critical', 'warning', 'info'
    description: str
    location: str  # section name or 'general'
    suggestion: str

@dataclass
class ATSRecommendation:
    """Represents an ATS optimization recommendation"""
    priority: int  # 1-10, higher is more important
    category: str
    description: str
    action: str
    expected_impact: str

class ATSOptimizer:
    """Optimizes resumes for ATS compatibility and parsing"""

    def __init__(self):
        # Common ATS parsing issues and solutions
        self.parsing_issues = {
            "graphics": {
                "patterns": [r'\b(?:logo|graphic|image|diagram|chart)\b'],
                "solution": "Replace graphics with text descriptions",
            },
            "tables": {
                "patterns": [r'\b(?:table|column|row|cell)\b'],
                "solution": "Convert tables to plain text format",
            },
            "columns": {
                "patterns": [r'\b(?:column|multi-column|sidebar)\b'],
                "solution": "Use single column layout",
            },
            "headers_footers": {
                "patterns": [r'\b(?:header|footer|page\s+number)\b'],
                "solution": "Remove headers, footers, and page numbers",
            },
            "text_boxes": {
                "patterns": [r'\b(?:text\s+box|callout|shape)\b'],
                "solution": "Convert text boxes to regular paragraphs",
            },
        }

        # ATS-friendly formatting rules
        self.formatting_rules = {
            "fonts": ["Arial", "Calibri", "Times New Roman", "Helvetica"],
            "font_sizes": [10, 11, 12],
            "line_spacing": [1.0, 1.15, 1.5],
            "margins": [0.5, 0.75, 1.0],  # inches
        }

        # Keyword optimization for ATS
        self.keyword_rules = {
            "exact_matches": True,
            "synonyms": True,
            "variations": True,
            "skill_context": True,
        }

        # Section parsing optimization
        self.section_keywords = {
            "contact": ["contact", "personal", "information", "details"],
            "summary": ["summary", "objective", "profile", "overview", "about"],
            "experience": ["experience", "work", "employment", "history", "background"],
            "education": ["education", "academic", "degree", "university", "college"],
            "skills": ["skills", "competencies", "expertise", "technologies", "abilities"],
            "certifications": ["certifications", "certificates", "credentials", "licenses"],
            "projects": ["projects", "portfolio", "work samples", "achievements"],
        }

    async def optimize_for_ats(
        self,
        resume_content: Dict[str, Any],
        ats_rules: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Optimize resume for ATS compatibility

        Args:
            resume_content: Resume content to optimize
            ats_rules: Specific ATS rules to follow

        Returns:
            Optimized content with ATS analysis
        """
        try:
            logger.info("Starting ATS optimization")

            # Analyze current ATS compatibility
            analysis = await self._analyze_ats_compatibility(resume_content)

            # Generate optimization recommendations
            recommendations = await self._generate_ats_recommendations(analysis)

            # Apply ATS optimizations
            optimized_content = await self._apply_ats_optimizations(
                resume_content, analysis, ats_rules
            )

            # Calculate ATS score
            ats_score = await self._calculate_ats_score(optimized_content)

            # Prepare result
            result = {
                "optimized_content": optimized_content,
                "ats_score": ats_score,
                "issues_fixed": [issue.description for issue in analysis.get("issues", [])],
                "recommendations": [
                    {
                        "priority": rec.priority,
                        "category": rec.category,
                        "description": rec.description,
                        "action": rec.action,
                    }
                    for rec in recommendations
                ],
                "optimization_stats": {
                    "original_score": analysis.get("score", 0),
                    "improvements_made": len(analysis.get("issues", [])),
                    "sections_optimized": len(optimized_content),
                    "ats_friendly_score": ats_score,
                },
            }

            logger.info(f"ATS optimization completed, score: {ats_score:.1f}")
            return result

        except Exception as e:
            logger.error(f"Failed to optimize for ATS: {e}")
            return {
                "optimized_content": resume_content,
                "ats_score": 0.0,
                "issues_fixed": [],
                "recommendations": [],
            }

    async def _analyze_ats_compatibility(self, resume_content: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze resume for ATS compatibility issues"""
        issues = []
        score = 100  # Start with perfect score

        # Extract text content
        text_content = self._extract_resume_text(resume_content)

        # Check for parsing issues
        for issue_type, issue_config in self.parsing_issues.items():
            for pattern in issue_config["patterns"]:
                if re.search(pattern, text_content, re.IGNORECASE):
                    issues.append(ATSIssue(
                        rule=ATSRule.FORMAT_COMPATIBILITY,
                        severity="critical" if issue_type in ["graphics", "tables"] else "warning",
                        description=f"Found {issue_type} that may confuse ATS parsing",
                        location="general",
                        suggestion=issue_config["solution"],
                    ))
                    score -= 15 if issue_type in ["graphics", "tables"] else 5

        # Check section structure
        section_score = await self._analyze_section_structure(resume_content)
        score -= (100 - section_score)

        # Check keyword optimization
        keyword_score = await self._analyze_keyword_optimization(text_content)
        score -= (100 - keyword_score)

        # Check content formatting
        format_score = await self._analyze_content_formatting(text_content)
        score -= (100 - format_score)

        return {
            "score": max(0, score),
            "issues": issues,
            "section_score": section_score,
            "keyword_score": keyword_score,
            "format_score": format_score,
        }

    def _extract_resume_text(self, resume_content: Dict[str, Any]) -> str:
        """Extract all text from resume content"""
        text_parts = []

        for section, content in resume_content.items():
            if isinstance(content, str):
                text_parts.append(content)
            elif isinstance(content, list):
                for item in content:
                    if isinstance(item, str):
                        text_parts.append(item)
                    elif isinstance(item, dict):
                        text_parts.extend(str(v) for v in item.values() if v)

        return ' '.join(text_parts)

    async def _analyze_section_structure(self, resume_content: Dict[str, Any]) -> float:
        """Analyze section structure for ATS compatibility"""
        score = 100
        found_sections = set()

        # Check for standard sections
        for section_name, keywords in self.section_keywords.items():
            if section_name in resume_content:
                found_sections.add(section_name)
            else:
                # Check if section exists with different name
                for content_key in resume_content.keys():
                    content_text = str(resume_content[content_key]).lower()
                    if any(keyword in content_text for keyword in keywords):
                        found_sections.add(section_name)
                        break

        # Score based on found sections
        required_sections = {"contact", "experience", "education", "skills"}
        found_required = found_sections.intersection(required_sections)

        if len(found_required) < len(required_sections):
            missing = required_sections - found_required
            score -= len(missing) * 10

        # Check section ordering (conventional order is better for ATS)
        conventional_order = ["contact", "summary", "experience", "education", "skills"]
        section_order = list(resume_content.keys())

        order_score = 0
        for i, section in enumerate(conventional_order):
            if section in section_order:
                order_score += 1

        order_score = (order_score / len(conventional_order)) * 20
        score += order_score

        return max(0, min(100, score))

    async def _analyze_keyword_optimization(self, text_content: str) -> float:
        """Analyze keyword optimization for ATS"""
        score = 100

        # Check for keyword stuffing (too many repetitions)
        words = re.findall(r'\b\w+\b', text_content.lower())
        word_counts = {}

        for word in words:
            if len(word) > 3:  # Only count meaningful words
                word_counts[word] = word_counts.get(word, 0) + 1

        # Penalize excessive repetition
        stuffing_penalty = 0
        for word, count in word_counts.items():
            if count > 5:  # More than 5 occurrences
                stuffing_penalty += (count - 5) * 2

        score -= min(stuffing_penalty, 30)

        # Check keyword distribution
        sections = re.split(r'\n\s*\n', text_content)
        sections_with_keywords = 0

        for section in sections:
            section_words = set(re.findall(r'\b\w+\b', section.lower()))
            # Simple heuristic: sections with diverse vocabulary are better
            if len(section_words) > 10:
                sections_with_keywords += 1

        distribution_score = (sections_with_keywords / len(sections)) * 20 if sections else 0
        score += distribution_score

        return max(0, min(100, score))

    async def _analyze_content_formatting(self, text_content: str) -> float:
        """Analyze content formatting for ATS compatibility"""
        score = 100

        # Check for problematic characters
        problematic_chars = ['•', '●', '○', '▪', '▫', '♦', '★', '☆']
        char_penalty = 0

        for char in problematic_chars:
            if char in text_content:
                char_penalty += 5

        score -= min(char_penalty, 25)

        # Check text structure
        lines = text_content.split('\n')
        structured_lines = 0

        for line in lines:
            line = line.strip()
            if line:
                # Check if line looks structured (starts with bullet or number)
                if re.match(r'^[-\*\•\d]+\.?\s', line):
                    structured_lines += 1

        structure_score = (structured_lines / len([l for l in lines if l.strip()])) * 15 if lines else 0
        score += structure_score

        # Check for consistent formatting
        bullet_patterns = [r'^[-\*\•]', r'^\d+\.', r'^[a-zA-Z]\.']
        bullet_consistency = 0

        for pattern in bullet_patterns:
            if re.search(pattern, text_content, re.MULTILINE):
                bullet_consistency += 1

        if bullet_consistency > 1:  # Mixed bullet styles
            score -= 10

        return max(0, min(100, score))

    async def _generate_ats_recommendations(self, analysis: Dict[str, Any]) -> List[ATSRecommendation]:
        """Generate ATS optimization recommendations"""
        recommendations = []

        # Recommendations based on issues found
        for issue in analysis.get("issues", []):
            recommendations.append(ATSRecommendation(
                priority=8 if issue.severity == "critical" else 5,
                category=issue.rule.value,
                description=issue.description,
                action=issue.suggestion,
                expected_impact="Improved ATS parsing and keyword recognition",
            ))

        # General recommendations
        if analysis.get("section_score", 100) < 80:
            recommendations.append(ATSRecommendation(
                priority=9,
                category="structure_parsing",
                description="Resume sections may not be clearly defined for ATS parsing",
                action="Use standard section headers and clear formatting",
                expected_impact="Better section identification by ATS",
            ))

        if analysis.get("keyword_score", 100) < 80:
            recommendations.append(ATSRecommendation(
                priority=7,
                category="keyword_matching",
                description="Keyword distribution could be improved",
                action="Distribute keywords naturally across different sections",
                expected_impact="Higher keyword match scores",
            ))

        if analysis.get("format_score", 100) < 80:
            recommendations.append(ATSRecommendation(
                priority=6,
                category="format_compatibility",
                description="Resume formatting may cause parsing issues",
                action="Use ATS-friendly fonts and remove special characters",
                expected_impact="Improved text extraction and parsing",
            ))

        # Sort by priority
        recommendations.sort(key=lambda x: x.priority, reverse=True)

        return recommendations[:10]  # Return top 10

    async def _apply_ats_optimizations(
        self,
        resume_content: Dict[str, Any],
        analysis: Dict[str, Any],
        ats_rules: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Apply ATS optimizations to resume content"""
        optimized_content = resume_content.copy()

        # Fix section headers
        optimized_content = await self._optimize_section_headers(optimized_content)

        # Clean formatting issues
        optimized_content = await self._clean_formatting_issues(optimized_content)

        # Optimize content structure
        optimized_content = await self._optimize_content_structure(optimized_content)

        # Apply custom ATS rules if provided
        if ats_rules:
            optimized_content = await self._apply_custom_ats_rules(optimized_content, ats_rules)

        return optimized_content

    async def _optimize_section_headers(self, resume_content: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize section headers for ATS parsing"""
        optimized = resume_content.copy()

        # Standardize section headers
        header_mappings = {
            "work experience": "EXPERIENCE",
            "professional experience": "EXPERIENCE",
            "work history": "EXPERIENCE",
            "employment": "EXPERIENCE",
            "academic background": "EDUCATION",
            "educational background": "EDUCATION",
            "school": "EDUCATION",
            "technical skills": "SKILLS",
            "competencies": "SKILLS",
            "expertise": "SKILLS",
            "technologies": "SKILLS",
            "certifications": "CERTIFICATIONS",
            "credentials": "CERTIFICATIONS",
            "licenses": "CERTIFICATIONS",
            "projects": "PROJECTS",
            "portfolio": "PROJECTS",
        }

        for section_name in list(optimized.keys()):
            section_lower = section_name.lower()
            if section_lower in header_mappings:
                # Rename section to standard format
                standard_name = header_mappings[section_lower]
                if standard_name != section_name:
                    optimized[standard_name] = optimized.pop(section_name)

        return optimized

    async def _clean_formatting_issues(self, resume_content: Dict[str, Any]) -> Dict[str, Any]:
        """Clean common formatting issues that confuse ATS"""
        optimized = {}

        for section_name, section_content in resume_content.items():
            if isinstance(section_content, str):
                cleaned_content = await self._clean_text_formatting(section_content)
                optimized[section_name] = cleaned_content
            elif isinstance(section_content, list):
                cleaned_items = []
                for item in section_content:
                    if isinstance(item, str):
                        cleaned_items.append(await self._clean_text_formatting(item))
                    elif isinstance(item, dict):
                        cleaned_item = {}
                        for key, value in item.items():
                            if isinstance(value, str):
                                cleaned_item[key] = await self._clean_text_formatting(value)
                            else:
                                cleaned_item[key] = value
                        cleaned_items.append(cleaned_item)
                    else:
                        cleaned_items.append(item)
                optimized[section_name] = cleaned_items
            else:
                optimized[section_name] = section_content

        return optimized

    async def _clean_text_formatting(self, text: str) -> str:
        """Clean text formatting for ATS compatibility"""
        # Replace fancy bullets with standard ones
        text = re.sub(r'[•●○▪▫♦★☆]', '•', text)

        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)

        # Clean up line breaks
        text = re.sub(r'\n{3,}', '\n\n', text)

        # Remove page breaks and special characters
        text = re.sub(r'\f', '', text)

        # Standardize quotes
        text = re.sub(r'["""]', '"', text)
        text = re.sub(r'[''']', "'", text)

        return text.strip()

    async def _optimize_content_structure(self, resume_content: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize content structure for better ATS parsing"""
        optimized = resume_content.copy()

        # Ensure consistent bullet formatting
        for section_name, section_content in optimized.items():
            if section_name.upper() in ["EXPERIENCE", "SKILLS", "PROJECTS"]:
                if isinstance(section_content, list):
                    optimized_items = []
                    for item in section_content:
                        if isinstance(item, str):
                            # Ensure consistent bullet format
                            cleaned = re.sub(r'^[-\*\•\d]+\.?\s*', '• ', item.strip())
                            optimized_items.append(cleaned)
                        else:
                            optimized_items.append(item)
                    optimized[section_name] = optimized_items

        return optimized

    async def _apply_custom_ats_rules(self, resume_content: Dict[str, Any], ats_rules: Dict[str, Any]) -> Dict[str, Any]:
        """Apply custom ATS rules"""
        optimized = resume_content.copy()

        # Apply custom formatting rules
        if ats_rules.get("font_family"):
            # Note: This is informational, actual font changes would need document processing
            pass

        if ats_rules.get("remove_tables", False):
            # Remove table-like content
            for section_name, section_content in optimized.items():
                if isinstance(section_content, str):
                    # Remove table-like patterns
                    optimized[section_name] = re.sub(r'\|\s*\|', ' ', section_content)

        if ats_rules.get("standardize_dates", False):
            # Standardize date formats
            for section_name, section_content in optimized.items():
                if isinstance(section_content, str):
                    # Convert various date formats to MM/YYYY
                    optimized[section_name] = re.sub(
                        r'(\w+)\s+(\d{4})',
                        lambda m: f"{m.group(2)}",
                        section_content
                    )

        return optimized

    async def _calculate_ats_score(self, resume_content: Dict[str, Any]) -> float:
        """Calculate ATS compatibility score"""
        try:
            # Re-analyze the optimized content
            analysis = await self._analyze_ats_compatibility(resume_content)

            # Weight different factors
            weights = {
                "section_score": 0.4,
                "keyword_score": 0.3,
                "format_score": 0.3,
            }

            score = (
                analysis.get("section_score", 0) * weights["section_score"] +
                analysis.get("keyword_score", 0) * weights["keyword_score"] +
                analysis.get("format_score", 0) * weights["format_score"]
            )

            return round(min(100.0, max(0.0, score)), 1)

        except Exception as e:
            logger.warning(f"Failed to calculate ATS score: {e}")
            return 0.0

    async def validate_ats_compatibility(
        self,
        resume_content: Dict[str, Any],
        ats_system: str = "general",
    ) -> Dict[str, Any]:
        """Validate resume against specific ATS system requirements"""
        try:
            # Base analysis
            analysis = await self._analyze_ats_compatibility(resume_content)

            # ATS-specific validations
            ats_specific = await self._check_ats_specific_requirements(
                resume_content, ats_system
            )

            # Combine results
            compatibility_score = (
                analysis["score"] * 0.7 +
                ats_specific["score"] * 0.3
            )

            return {
                "compatibility_score": round(compatibility_score, 1),
                "ats_system": ats_system,
                "general_analysis": analysis,
                "ats_specific": ats_specific,
                "recommendations": ats_specific.get("recommendations", []),
            }

        except Exception as e:
            logger.error(f"Failed to validate ATS compatibility: {e}")
            return {
                "compatibility_score": 0.0,
                "ats_system": ats_system,
                "error": str(e),
            }

    async def _check_ats_specific_requirements(
        self,
        resume_content: Dict[str, Any],
        ats_system: str,
    ) -> Dict[str, Any]:
        """Check requirements specific to particular ATS systems"""
        score = 100
        recommendations = []

        # Common ATS system requirements
        requirements = {
            "workday": {
                "max_sections": 15,
                "preferred_format": "docx",
                "section_headers": ["experience", "education", "skills"],
            },
            "taleo": {
                "max_file_size": 5 * 1024 * 1024,  # 5MB
                "avoid_tables": True,
                "simple_formatting": True,
            },
            "icims": {
                "max_sections": 10,
                "standard_headers": True,
                "keyword_focus": True,
            },
            "greenhouse": {
                "parsing_focus": True,
                "section_structure": True,
                "contact_info": True,
            },
        }

        system_reqs = requirements.get(ats_system.lower(), {})

        if system_reqs.get("max_sections"):
            section_count = len(resume_content)
            if section_count > system_reqs["max_sections"]:
                score -= 20
                recommendations.append(
                    f"Reduce sections from {section_count} to {system_reqs['max_sections']} or fewer"
                )

        if system_reqs.get("avoid_tables"):
            # Check for table-like content
            text_content = self._extract_resume_text(resume_content)
            if re.search(r'\|\s*\|', text_content):
                score -= 15
                recommendations.append("Remove table formatting")

        if system_reqs.get("standard_headers"):
            # Check for standard section headers
            standard_headers = {"experience", "education", "skills", "summary"}
            found_headers = set(resume_content.keys())
            missing_headers = standard_headers - found_headers

            if missing_headers:
                score -= len(missing_headers) * 5
                recommendations.append(f"Add standard headers: {', '.join(missing_headers)}")

        return {
            "score": max(0, score),
            "requirements_checked": list(system_reqs.keys()),
            "recommendations": recommendations,
        }
