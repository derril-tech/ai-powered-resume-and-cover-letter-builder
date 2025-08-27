"""
Keyword Optimizer
Optimizes resume content by strategically infusing keywords while maintaining natural readability.
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict, Counter
import math

logger = logging.getLogger(__name__)

class KeywordOptimizer:
    """Optimizes keyword placement and density in resume content"""

    def __init__(self):
        # Optimal keyword density ranges
        self.optimal_density = {
            "low": (0.01, 0.03),      # 1-3% for general keywords
            "medium": (0.03, 0.06),  # 3-6% for important keywords
            "high": (0.06, 0.10),    # 6-10% for critical keywords
        }

        # Stop words to avoid when analyzing keywords
        self.stop_words = {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'were', 'will', 'with', 'i', 'me', 'my', 'myself',
            'we', 'our', 'ours', 'you', 'your', 'yours', 'he', 'him', 'his',
            'she', 'her', 'hers', 'it', 'its', 'they', 'them', 'their', 'theirs',
            'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
            'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'may', 'might', 'must', 'shall', 'can', 'but', 'or', 'nor', 'so',
            'yet', 'than', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because',
            'as', 'until', 'while', 'at', 'by', 'for', 'with', 'about', 'against',
            'between', 'into', 'through', 'during', 'before', 'after', 'above',
            'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over',
            'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
            'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
            'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
            'same', 'so', 'than', 'too', 'very'
        }

        # Keyword infusion strategies
        self.infusions_strategies = [
            "exact_match",      # Use exact keyword
            "synonym",          # Use synonym/antonym
            "phrase_inclusion", # Include in natural phrase
            "contextual",       # Use in relevant context
            "varied_placement", # Vary keyword placement
        ]

    async def optimize_keywords(
        self,
        resume_content: Dict[str, Any],
        target_keywords: List[str],
        job_description: Optional[Dict[str, Any]] = None,
        density_target: float = 0.02,
    ) -> Dict[str, Any]:
        """
        Optimize resume content by infusing target keywords naturally

        Args:
            resume_content: Resume content dictionary
            target_keywords: Keywords to infuse
            job_description: Job description for context
            density_target: Target keyword density

        Returns:
            Optimized content with keyword analysis
        """
        try:
            logger.info(f"Starting keyword optimization for {len(target_keywords)} keywords")

            # Extract text content from resume
            text_content = self._extract_text_from_resume(resume_content)

            # Analyze current keyword presence
            current_analysis = await self._analyze_keyword_presence(text_content, target_keywords)

            # Identify optimization opportunities
            opportunities = await self._identify_optimization_opportunities(
                resume_content, target_keywords, current_analysis
            )

            # Apply keyword optimization
            optimized_content = await self._apply_keyword_optimization(
                resume_content, opportunities, density_target
            )

            # Calculate final metrics
            final_text = self._extract_text_from_resume(optimized_content)
            final_analysis = await self._analyze_keyword_presence(final_text, target_keywords)
            naturalness_score = await self._calculate_naturalness_score(final_text)

            # Prepare result
            result = {
                "optimized_content": optimized_content,
                "keywords_added": opportunities.get("keywords_to_add", []),
                "keyword_density": final_analysis["density"],
                "naturalness_score": naturalness_score,
                "optimization_stats": {
                    "original_density": current_analysis["density"],
                    "target_density": density_target,
                    "keywords_found": current_analysis["found_count"],
                    "keywords_added": len(opportunities.get("keywords_to_add", [])),
                    "sections_optimized": len(opportunities.get("sections", [])),
                },
                "recommendations": await self._generate_keyword_recommendations(
                    final_analysis, density_target
                ),
            }

            logger.info(f"Keyword optimization completed, density: {final_analysis['density']:.3f}")
            return result

        except Exception as e:
            logger.error(f"Failed to optimize keywords: {e}")
            return {
                "optimized_content": resume_content,
                "keywords_added": [],
                "keyword_density": 0.0,
                "naturalness_score": 0.0,
            }

    def _extract_text_from_resume(self, resume_content: Dict[str, Any]) -> str:
        """Extract all text content from resume"""
        text_parts = []

        # Extract from different sections
        for section, content in resume_content.items():
            if isinstance(content, str):
                text_parts.append(content)
            elif isinstance(content, list):
                for item in content:
                    if isinstance(item, str):
                        text_parts.append(item)
                    elif isinstance(item, dict):
                        # Handle nested structures
                        for key, value in item.items():
                            if isinstance(value, str):
                                text_parts.append(value)
                            elif isinstance(value, list):
                                text_parts.extend([str(v) for v in value if v])

        return ' '.join(text_parts)

    async def _analyze_keyword_presence(
        self,
        text: str,
        keywords: List[str],
    ) -> Dict[str, Any]:
        """Analyze current keyword presence in text"""
        text_lower = text.lower()
        total_words = len(text.split())

        found_keywords = []
        keyword_counts = Counter()

        for keyword in keywords:
            keyword_lower = keyword.lower()

            # Count occurrences
            count = text_lower.count(keyword_lower)
            if count > 0:
                found_keywords.append(keyword)
                keyword_counts[keyword] = count

        # Calculate density
        density = sum(keyword_counts.values()) / total_words if total_words > 0 else 0.0

        return {
            "found_keywords": found_keywords,
            "found_count": len(found_keywords),
            "total_keywords": len(keywords),
            "density": density,
            "keyword_counts": dict(keyword_counts),
            "coverage": len(found_keywords) / len(keywords) if keywords else 0.0,
        }

    async def _identify_optimization_opportunities(
        self,
        resume_content: Dict[str, Any],
        target_keywords: List[str],
        current_analysis: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Identify where and how to optimize keywords"""
        opportunities = {
            "keywords_to_add": [],
            "sections": [],
            "strategies": {},
            "insertion_points": [],
        }

        # Find missing keywords
        found_keywords = set(kw.lower() for kw in current_analysis["found_keywords"])
        missing_keywords = [
            kw for kw in target_keywords
            if kw.lower() not in found_keywords
        ]

        opportunities["keywords_to_add"] = missing_keywords

        # Analyze each section for optimization opportunities
        for section_name, section_content in resume_content.items():
            if section_name in ['contact', 'personal_info']:
                continue

            section_text = self._extract_section_text(section_content)
            section_analysis = await self._analyze_section_for_keywords(
                section_text, target_keywords
            )

            if section_analysis["opportunity_score"] > 0.3:
                opportunities["sections"].append({
                    "name": section_name,
                    "content": section_content,
                    "opportunity_score": section_analysis["opportunity_score"],
                    "suggested_keywords": section_analysis["suggested_keywords"],
                })

        # Sort opportunities by priority
        opportunities["sections"].sort(
            key=lambda x: x["opportunity_score"],
            reverse=True
        )

        return opportunities

    def _extract_section_text(self, section_content: Any) -> str:
        """Extract text from a section"""
        if isinstance(section_content, str):
            return section_content
        elif isinstance(section_content, list):
            text_parts = []
            for item in section_content:
                if isinstance(item, str):
                    text_parts.append(item)
                elif isinstance(item, dict):
                    for value in item.values():
                        if isinstance(value, str):
                            text_parts.append(value)
            return ' '.join(text_parts)
        elif isinstance(section_content, dict):
            return ' '.join(str(v) for v in section_content.values() if v)
        return str(section_content)

    async def _analyze_section_for_keywords(
        self,
        section_text: str,
        target_keywords: List[str],
    ) -> Dict[str, Any]:
        """Analyze section for keyword optimization opportunities"""
        words = re.findall(r'\b\w+\b', section_text.lower())
        word_count = len(words)

        # Calculate keyword-friendliness score
        keyword_friendly_words = ['led', 'managed', 'developed', 'created', 'implemented',
                                'designed', 'achieved', 'improved', 'increased', 'reduced']

        friendly_score = sum(1 for word in words if word in keyword_friendly_words) / word_count if word_count > 0 else 0

        # Calculate length score (prefer sections that aren't too short or long)
        length_score = 1.0 - abs(word_count - 50) / 100.0  # Optimal around 50 words
        length_score = max(0, length_score)

        # Combined opportunity score
        opportunity_score = (friendly_score + length_score) / 2.0

        # Suggest keywords that fit this section's context
        suggested_keywords = []
        for keyword in target_keywords:
            keyword_lower = keyword.lower()
            # Simple relevance check based on word similarity
            keyword_words = set(keyword_lower.split())
            section_words = set(words)

            overlap = len(keyword_words.intersection(section_words))
            relevance = overlap / len(keyword_words) if keyword_words else 0

            if relevance > 0.1 or opportunity_score > 0.5:
                suggested_keywords.append(keyword)

        return {
            "opportunity_score": opportunity_score,
            "word_count": word_count,
            "friendly_score": friendly_score,
            "suggested_keywords": suggested_keywords[:3],  # Limit suggestions
        }

    async def _apply_keyword_optimization(
        self,
        resume_content: Dict[str, Any],
        opportunities: Dict[str, Any],
        density_target: float,
    ) -> Dict[str, Any]:
        """Apply keyword optimization to resume content"""
        optimized_content = resume_content.copy()

        # Apply optimizations section by section
        for section_info in opportunities.get("sections", []):
            section_name = section_info["name"]
            suggested_keywords = section_info["suggested_keywords"]

            if section_name in optimized_content and suggested_keywords:
                optimized_content[section_name] = await self._optimize_section(
                    optimized_content[section_name],
                    suggested_keywords,
                    density_target,
                )

        return optimized_content

    async def _optimize_section(
        self,
        section_content: Any,
        target_keywords: List[str],
        density_target: float,
    ) -> Any:
        """Optimize a specific section with keywords"""
        if isinstance(section_content, str):
            return await self._infuse_keywords_into_text(
                section_content, target_keywords, density_target
            )
        elif isinstance(section_content, list):
            optimized_items = []
            for item in section_content:
                if isinstance(item, str):
                    optimized_items.append(
                        await self._infuse_keywords_into_text(
                            item, target_keywords, density_target
                        )
                    )
                elif isinstance(item, dict):
                    optimized_item = {}
                    for key, value in item.items():
                        if isinstance(value, str):
                            optimized_item[key] = await self._infuse_keywords_into_text(
                                value, target_keywords, density_target
                            )
                        else:
                            optimized_item[key] = value
                    optimized_items.append(optimized_item)
                else:
                    optimized_items.append(item)
            return optimized_items

        return section_content

    async def _infuse_keywords_into_text(
        self,
        text: str,
        keywords: List[str],
        target_density: float,
    ) -> str:
        """Infuse keywords into text while maintaining naturalness"""
        if not text or not keywords:
            return text

        current_density = await self._calculate_keyword_density(text, keywords)

        # If density is already good, return as-is
        if abs(current_density - target_density) < 0.01:
            return text

        # If density is too high, don't add more
        if current_density >= target_density:
            return text

        optimized_text = text
        keywords_added = 0

        # Try to add missing keywords naturally
        for keyword in keywords:
            if keyword.lower() in optimized_text.lower():
                continue

            # Try different infusion strategies
            infused_text = await self._try_keyword_infusions(optimized_text, keyword)

            if infused_text != optimized_text:
                optimized_text = infused_text
                keywords_added += 1

                # Check if we've reached target density
                new_density = await self._calculate_keyword_density(optimized_text, keywords)
                if new_density >= target_density:
                    break

        return optimized_text

    async def _try_keyword_infusions(self, text: str, keyword: str) -> str:
        """Try different strategies to infuse a keyword naturally"""
        strategies = [
            self._infuse_as_phrase,
            self._infuse_with_synonym,
            self._infuse_in_context,
            self._infuse_at_end,
        ]

        for strategy in strategies:
            result = await strategy(text, keyword)
            if result != text:
                return result

        return text

    async def _infuse_as_phrase(self, text: str, keyword: str) -> str:
        """Infuse keyword as part of natural phrase"""
        # Look for good insertion points
        insertion_patterns = [
            r'(\b(?:developed|created|built|designed|implemented)\s+)',
            r'(\b(?:managed|led|handled|oversaw)\s+)',
            r'(\b(?:improved|enhanced|optimized)\s+)',
            r'(\b(?:using|with|through)\s+)',
        ]

        for pattern in insertion_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                insertion_point = match.end()
                infused_text = (
                    text[:insertion_point] +
                    keyword + " " +
                    text[insertion_point:]
                )

                # Check if it sounds natural
                if await self._check_naturalness(infused_text, keyword):
                    return infused_text

        return text

    async def _infuse_with_synonym(self, text: str, keyword: str) -> str:
        """Try to use a synonym or related term"""
        # Simple synonym mapping (would be more sophisticated in production)
        synonyms = {
            "python": ["Python programming", "Python development"],
            "javascript": ["JavaScript", "JS development"],
            "react": ["React.js", "React framework"],
            "aws": ["Amazon Web Services", "AWS cloud"],
        }

        keyword_lower = keyword.lower()
        if keyword_lower in synonyms:
            for synonym in synonyms[keyword_lower]:
                if synonym.lower() not in text.lower():
                    # Try to infuse synonym
                    infused = await self._infuse_as_phrase(text, synonym)
                    if infused != text:
                        return infused

        return text

    async def _infuse_in_context(self, text: str, keyword: str) -> str:
        """Infuse keyword in a contextual way"""
        # Look for related words and insert near them
        related_words = await self._find_related_words(text, keyword)

        for related_word in related_words:
            # Insert after related word
            pattern = rf'(\b{re.escape(related_word)}\s+)'
            match = re.search(pattern, text, re.IGNORECASE)

            if match:
                insertion_point = match.end()
                infused_text = (
                    text[:insertion_point] +
                    keyword + " " +
                    text[insertion_point:]
                )

                if await self._check_naturalness(infused_text, keyword):
                    return infused_text

        return text

    async def _infuse_at_end(self, text: str, keyword: str) -> str:
        """Add keyword at the end of the text"""
        if len(text.split()) < 10:  # Only for shorter texts
            return text

        # Add as a natural extension
        extensions = [
            f" utilizing {keyword}",
            f" with {keyword}",
            f" through {keyword}",
            f" using {keyword}",
        ]

        for extension in extensions:
            infused_text = text + extension
            if await self._check_naturalness(infused_text, keyword):
                return infused_text

        return text

    async def _find_related_words(self, text: str, keyword: str) -> List[str]:
        """Find words in text that are related to the keyword"""
        # Simple approach - look for common tech/programming words
        tech_words = ['developed', 'created', 'built', 'designed', 'implemented',
                     'managed', 'led', 'used', 'worked', 'applied']

        words_in_text = re.findall(r'\b\w+\b', text.lower())
        return [word for word in tech_words if word in words_in_text]

    async def _check_naturalness(self, text: str, keyword: str) -> bool:
        """Check if keyword infusion sounds natural"""
        # Simple heuristics for naturalness
        text_lower = text.lower()
        keyword_lower = keyword.lower()

        # Check for obvious repetition
        keyword_count = text_lower.count(keyword_lower)
        if keyword_count > 2:
            return False

        # Check for awkward spacing
        if re.search(rf'\b{keyword_lower}\s+{keyword_lower}\b', text_lower):
            return False

        # Check length - don't make sentences too long
        words = text.split()
        if len(words) > 35:
            return False

        return True

    async def _calculate_keyword_density(self, text: str, keywords: List[str]) -> float:
        """Calculate keyword density in text"""
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

    async def _calculate_naturalness_score(self, text: str) -> float:
        """Calculate naturalness score of optimized text"""
        if not text:
            return 0.0

        score = 1.0
        words = text.split()

        # Penalize very long sentences
        if len(words) > 40:
            score -= 0.3
        elif len(words) > 30:
            score -= 0.1

        # Penalize repetition
        word_counts = Counter(words)
        max_count = max(word_counts.values()) if word_counts else 0
        if max_count > 3:
            score -= 0.2

        # Penalize awkward punctuation
        if re.search(r'[,.]{2,}', text):
            score -= 0.1

        return max(0.0, score)

    async def _generate_keyword_recommendations(
        self,
        analysis: Dict[str, Any],
        target_density: float,
    ) -> List[str]:
        """Generate recommendations for keyword optimization"""
        recommendations = []

        current_density = analysis.get("density", 0.0)
        coverage = analysis.get("coverage", 0.0)

        if current_density < target_density * 0.8:
            recommendations.append(".2f"        elif current_density > target_density * 1.2:
            recommendations.append(".2f"        if coverage < 0.5:
            recommendations.append("Add more relevant keywords from the job description")

        if analysis.get("found_count", 0) == 0:
            recommendations.append("No target keywords found - consider adding key skills naturally")

        return recommendations if recommendations else ["Keyword optimization looks good!"]

    async def validate_keyword_strategy(
        self,
        resume_content: Dict[str, Any],
        keywords: List[str],
        job_description: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate keyword optimization strategy"""
        try:
            # Extract job description keywords
            jd_text = self._extract_text_from_resume(job_description)
            jd_keywords = await self._extract_keywords_from_text(jd_text)

            # Analyze keyword alignment
            alignment = await self._analyze_keyword_alignment(keywords, jd_keywords)

            # Analyze resume optimization potential
            resume_text = self._extract_text_from_resume(resume_content)
            optimization_potential = await self._analyze_optimization_potential(
                resume_text, keywords
            )

            return {
                "alignment_score": alignment["score"],
                "optimization_potential": optimization_potential,
                "recommended_keywords": alignment["recommended_keywords"],
                "strategy_validation": {
                    "keyword_relevance": alignment["relevance_score"],
                    "resume_fit": optimization_potential["fit_score"],
                    "priority_keywords": alignment["priority_keywords"],
                },
            }

        except Exception as e:
            logger.error(f"Failed to validate keyword strategy: {e}")
            return {
                "alignment_score": 0.0,
                "optimization_potential": {},
                "recommended_keywords": [],
            }

    async def _extract_keywords_from_text(self, text: str) -> List[str]:
        """Extract important keywords from text"""
        words = re.findall(r'\b\w+\b', text.lower())

        # Filter out stop words and short words
        filtered_words = [
            word for word in words
            if len(word) > 3 and word not in self.stop_words
        ]

        # Count frequency
        word_counts = Counter(filtered_words)

        # Return most common words
        return [word for word, _ in word_counts.most_common(20)]

    async def _analyze_keyword_alignment(
        self,
        resume_keywords: List[str],
        jd_keywords: List[str],
    ) -> Dict[str, Any]:
        """Analyze alignment between resume and job description keywords"""
        resume_set = set(kw.lower() for kw in resume_keywords)
        jd_set = set(kw.lower() for kw in jd_keywords)

        # Calculate overlap
        overlap = resume_set.intersection(jd_set)
        overlap_score = len(overlap) / len(jd_set) if jd_set else 0.0

        # Identify missing important keywords
        missing_keywords = jd_set - resume_set

        # Calculate relevance score
        relevance_score = overlap_score * 0.7 + (len(missing_keywords) / len(jd_set) if jd_set else 0) * 0.3

        return {
            "score": overlap_score,
            "overlap_keywords": list(overlap),
            "missing_keywords": list(missing_keywords),
            "recommended_keywords": list(missing_keywords)[:10],
            "priority_keywords": list(missing_keywords)[:5],
            "relevance_score": relevance_score,
        }

    async def _analyze_optimization_potential(
        self,
        resume_text: str,
        keywords: List[str],
    ) -> Dict[str, Any]:
        """Analyze how well the resume can accommodate keyword optimization"""
        words = resume_text.split()
        total_words = len(words)

        # Analyze section structure
        sections = resume_text.split('\n\n')
        structured_sections = [s for s in sections if len(s.split()) > 5]

        # Calculate fit score
        fit_score = min(1.0, len(structured_sections) / 5.0)  # Prefer 5+ good sections

        # Analyze keyword insertion opportunities
        opportunities = 0
        for section in structured_sections:
            section_words = section.split()
            if len(section_words) > 10:  # Only count substantial sections
                opportunities += 1

        opportunity_score = opportunities / len(structured_sections) if structured_sections else 0

        return {
            "fit_score": fit_score,
            "opportunity_score": opportunity_score,
            "total_sections": len(sections),
            "structured_sections": len(structured_sections),
            "average_section_length": total_words / len(sections) if sections else 0,
        }
