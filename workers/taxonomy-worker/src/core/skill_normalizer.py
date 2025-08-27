"""
Skill Normalizer
Normalizes skills using taxonomy rules, fuzzy matching, and machine learning.
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict
import asyncio
from dataclasses import dataclass
from fuzzywuzzy import fuzz
from rapidfuzz import fuzz as rfuzz, process
import json

from .taxonomy_manager import TaxonomyManager

logger = logging.getLogger(__name__)

@dataclass
class NormalizedSkill:
    """Represents a normalized skill with metadata"""
    original_skill: str
    normalized_skill: str
    category: str
    confidence: float
    aliases: List[str] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.aliases is None:
            self.aliases = []
        if self.metadata is None:
            self.metadata = {}

class SkillNormalizer:
    """Normalizes skills using various matching strategies"""

    def __init__(self, taxonomy_manager: TaxonomyManager):
        self.taxonomy_manager = taxonomy_manager
        self.cache = {}  # Simple in-memory cache

        # Common normalization patterns
        self.normalization_patterns = [
            # Remove extra whitespace and normalize case
            (r'\s+', ' '),
            (r'^[a-z]', lambda m: m.group(0).upper()),

            # Common abbreviations
            (r'\bJS\b', 'JavaScript'),
            (r'\bTS\b', 'TypeScript'),
            (r'\bPY\b', 'Python'),
            (r'\bRB\b', 'Ruby'),
            (r'\bGO\b', 'Go'),
            (r'\bC\+\+', 'C++'),
            (r'\bC\#', 'C#'),
            (r'\b\.NET', '.NET'),
            (r'\bASP\.NET', 'ASP.NET'),
            (r'\bNode\.js', 'Node.js'),
            (r'\bReact\.js', 'React'),
            (r'\bVue\.js', 'Vue.js'),
            (r'\bAngularJS', 'Angular'),
            (r'\bNext\.js', 'Next.js'),
            (r'\bNuxt\.js', 'Nuxt.js'),

            # Framework abbreviations
            (r'\bDJ\b', 'Django'),
            (r'\bFL\b', 'Flask'),
            (r'\bFB\b', 'FastAPI'),
            (r'\bRQ\b', 'Redis'),
            (r'\bPG\b', 'PostgreSQL'),
            (r'\bMY\b', 'MySQL'),
            (r'\bMONGO\b', 'MongoDB'),
            (r'\bAWS\b', 'Amazon Web Services'),
            (r'\bGCP\b', 'Google Cloud Platform'),
            (r'\bAZ\b', 'Microsoft Azure'),
        ]

        # Similarity thresholds
        self.exact_match_threshold = 0.95
        self.fuzzy_match_threshold = 0.85
        self.semantic_match_threshold = 0.75

    async def normalize_skills(
        self,
        skills: List[str],
        source: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Normalize a list of skills using the taxonomy system

        Args:
            skills: List of raw skills to normalize
            source: Source of skills (jd, resume, manual)
            context: Additional context for normalization

        Returns:
            Dictionary with normalized skills, unmatched skills, and confidence
        """
        if not skills:
            return {
                "normalized_skills": [],
                "unmatched_skills": [],
                "confidence_score": 0.0,
            }

        logger.info(f"Normalizing {len(skills)} skills")

        normalized_skills = []
        unmatched_skills = []
        total_confidence = 0.0

        # Process skills concurrently
        tasks = [self._normalize_single_skill(skill, source, context) for skill in skills]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(f"Failed to normalize skill '{skills[i]}': {result}")
                unmatched_skills.append(skills[i])
                continue

            skill_result = result
            if skill_result:
                normalized_skills.append(skill_result)
                total_confidence += skill_result.confidence
            else:
                unmatched_skills.append(skills[i])

        # Calculate average confidence
        avg_confidence = total_confidence / len(normalized_skills) if normalized_skills else 0.0

        # Convert to response format
        response_skills = []
        for skill in normalized_skills:
            response_skills.append({
                "original_skill": skill.original_skill,
                "normalized_skill": skill.normalized_skill,
                "category": skill.category,
                "confidence": skill.confidence,
                "aliases": skill.aliases,
                "metadata": skill.metadata,
            })

        result = {
            "normalized_skills": response_skills,
            "unmatched_skills": unmatched_skills,
            "confidence_score": avg_confidence,
        }

        logger.info(f"Normalized {len(normalized_skills)} skills, {len(unmatched_skills)} unmatched")
        return result

    async def _normalize_single_skill(
        self,
        skill: str,
        source: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Optional[NormalizedSkill]:
        """Normalize a single skill"""
        if not skill or not skill.strip():
            return None

        original_skill = skill.strip()
        normalized_skill = self._preprocess_skill(original_skill)

        # Check cache first
        cache_key = f"{normalized_skill}:{source or 'unknown'}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        # Try exact match first
        exact_match = await self._find_exact_match(normalized_skill)
        if exact_match:
            normalized = NormalizedSkill(
                original_skill=original_skill,
                normalized_skill=exact_match["skill"],
                category=exact_match["category"],
                confidence=self.exact_match_threshold,
                aliases=exact_match.get("aliases", []),
                metadata={"match_type": "exact", "source": source},
            )
            self.cache[cache_key] = normalized
            return normalized

        # Try fuzzy matching
        fuzzy_match = await self._find_fuzzy_match(normalized_skill)
        if fuzzy_match and fuzzy_match["score"] >= self.fuzzy_match_threshold:
            normalized = NormalizedSkill(
                original_skill=original_skill,
                normalized_skill=fuzzy_match["skill"],
                category=fuzzy_match["category"],
                confidence=fuzzy_match["score"],
                aliases=fuzzy_match.get("aliases", []),
                metadata={"match_type": "fuzzy", "source": source},
            )
            self.cache[cache_key] = normalized
            return normalized

        # Try semantic matching
        semantic_match = await self._find_semantic_match(normalized_skill, context)
        if semantic_match and semantic_match["score"] >= self.semantic_match_threshold:
            normalized = NormalizedSkill(
                original_skill=original_skill,
                normalized_skill=semantic_match["skill"],
                category=semantic_match["category"],
                confidence=semantic_match["score"],
                aliases=semantic_match.get("aliases", []),
                metadata={"match_type": "semantic", "source": source},
            )
            self.cache[cache_key] = normalized
            return normalized

        # Try pattern-based normalization
        pattern_match = self._apply_normalization_patterns(normalized_skill)
        if pattern_match != normalized_skill:
            # Check if the pattern result exists in taxonomy
            pattern_check = await self._find_exact_match(pattern_match)
            if pattern_check:
                normalized = NormalizedSkill(
                    original_skill=original_skill,
                    normalized_skill=pattern_match,
                    category=pattern_check["category"],
                    confidence=0.8,  # Lower confidence for pattern matches
                    aliases=pattern_check.get("aliases", []),
                    metadata={"match_type": "pattern", "source": source},
                )
                self.cache[cache_key] = normalized
                return normalized

        # No match found, return None to indicate unmatched
        return None

    def _preprocess_skill(self, skill: str) -> str:
        """Preprocess a skill string"""
        if not skill:
            return skill

        # Convert to title case
        skill = skill.strip().title()

        # Remove common prefixes/suffixes that don't affect meaning
        skill = re.sub(r'^(Basic|Advanced|Senior|Junior|Expert|Proficient in)\s+', '', skill, flags=re.IGNORECASE)
        skill = re.sub(r'\s+(Expert|Specialist|Developer|Engineer|Analyst|Manager)$', '', skill, flags=re.IGNORECASE)

        # Normalize common variations
        skill = re.sub(r'\s*&\s*', ' and ', skill, flags=re.IGNORECASE)
        skill = re.sub(r'\s*/\s*', ' or ', skill, flags=re.IGNORECASE)

        return skill.strip()

    async def _find_exact_match(self, skill: str) -> Optional[Dict[str, Any]]:
        """Find exact match in taxonomy"""
        try:
            # Check primary skills
            all_skills = await self.taxonomy_manager.get_all_skills()
            for skill_data in all_skills:
                if skill_data["name"].lower() == skill.lower():
                    return {
                        "skill": skill_data["name"],
                        "category": skill_data["category"],
                        "aliases": skill_data.get("aliases", []),
                    }

                # Check aliases
                for alias in skill_data.get("aliases", []):
                    if alias.lower() == skill.lower():
                        return {
                            "skill": skill_data["name"],
                            "category": skill_data["category"],
                            "aliases": skill_data.get("aliases", []),
                        }

        except Exception as e:
            logger.warning(f"Error finding exact match for '{skill}': {e}")

        return None

    async def _find_fuzzy_match(self, skill: str) -> Optional[Dict[str, Any]]:
        """Find fuzzy match using string similarity"""
        try:
            all_skills = await self.taxonomy_manager.get_all_skills()

            best_match = None
            best_score = 0.0

            # Extract skill names and aliases for matching
            candidates = []
            for skill_data in all_skills:
                candidates.append((skill_data["name"], skill_data))
                for alias in skill_data.get("aliases", []):
                    candidates.append((alias, skill_data))

            # Find best fuzzy match
            for candidate_name, skill_data in candidates:
                # Use multiple fuzzy matching algorithms
                ratio_score = fuzz.ratio(skill.lower(), candidate_name.lower()) / 100.0
                partial_score = fuzz.partial_ratio(skill.lower(), candidate_name.lower()) / 100.0
                token_score = fuzz.token_sort_ratio(skill.lower(), candidate_name.lower()) / 100.0

                # Use the best score from any algorithm
                score = max(ratio_score, partial_score, token_score)

                if score > best_score:
                    best_score = score
                    best_match = {
                        "skill": skill_data["name"],
                        "category": skill_data["category"],
                        "aliases": skill_data.get("aliases", []),
                        "score": score,
                    }

            return best_match if best_score >= self.fuzzy_match_threshold else None

        except Exception as e:
            logger.warning(f"Error finding fuzzy match for '{skill}': {e}")

        return None

    async def _find_semantic_match(
        self,
        skill: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Find semantic match using meaning-based similarity"""
        try:
            # This is a simplified semantic matching
            # In production, you'd use word embeddings or transformer models

            # Get skill embeddings/vectors (simplified approach)
            skill_vector = await self._get_skill_vector(skill)

            all_skills = await self.taxonomy_manager.get_all_skills()
            best_match = None
            best_score = 0.0

            for skill_data in all_skills:
                # Compare with main skill name
                candidate_vector = await self._get_skill_vector(skill_data["name"])
                score = await self._calculate_vector_similarity(skill_vector, candidate_vector)

                if score > best_score:
                    best_score = score
                    best_match = {
                        "skill": skill_data["name"],
                        "category": skill_data["category"],
                        "aliases": skill_data.get("aliases", []),
                        "score": score,
                    }

                # Compare with aliases
                for alias in skill_data.get("aliases", []):
                    candidate_vector = await self._get_skill_vector(alias)
                    score = await self._calculate_vector_similarity(skill_vector, candidate_vector)

                    if score > best_score:
                        best_score = score
                        best_match = {
                            "skill": skill_data["name"],
                            "category": skill_data["category"],
                            "aliases": skill_data.get("aliases", []),
                            "score": score,
                        }

            return best_match if best_score >= self.semantic_match_threshold else None

        except Exception as e:
            logger.warning(f"Error finding semantic match for '{skill}': {e}")

        return None

    def _apply_normalization_patterns(self, skill: str) -> str:
        """Apply normalization patterns to skill"""
        normalized = skill

        for pattern, replacement in self.normalization_patterns:
            if callable(replacement):
                normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)
            else:
                normalized = re.sub(pattern, replacement, normalized, flags=re.IGNORECASE)

        return normalized

    async def _get_skill_vector(self, skill: str) -> List[float]:
        """Get vector representation of a skill (simplified)"""
        # In production, this would use actual embeddings
        # For now, we'll use a simple character-based approach

        # Convert skill to lowercase and remove spaces
        clean_skill = re.sub(r'\W+', '', skill.lower())

        # Create a simple vector based on character frequencies
        vector = [0.0] * 26  # One dimension per letter
        for char in clean_skill:
            if char.isalpha():
                index = ord(char.lower()) - ord('a')
                vector[index] += 1.0

        # Normalize vector
        total = sum(vector)
        if total > 0:
            vector = [v / total for v in vector]

        return vector

    async def _calculate_vector_similarity(self, vector1: List[float], vector2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        try:
            import math

            # Calculate dot product
            dot_product = sum(a * b for a, b in zip(vector1, vector2))

            # Calculate magnitudes
            magnitude1 = math.sqrt(sum(a * a for a in vector1))
            magnitude2 = math.sqrt(sum(b * b for b in vector2))

            # Avoid division by zero
            if magnitude1 == 0 or magnitude2 == 0:
                return 0.0

            return dot_product / (magnitude1 * magnitude2)

        except Exception:
            return 0.0

    async def suggest_aliases(self, skill: str, max_suggestions: int = 10) -> List[str]:
        """Suggest aliases for a given skill"""
        try:
            aliases = []

            # Generate common variations
            variations = self._generate_skill_variations(skill)

            # Filter out existing aliases and get unique suggestions
            existing_aliases = await self._get_existing_aliases(skill)
            existing_set = set(alias.lower() for alias in existing_aliases)

            for variation in variations:
                if variation.lower() not in existing_set and variation.lower() != skill.lower():
                    aliases.append(variation)

            return aliases[:max_suggestions]

        except Exception as e:
            logger.warning(f"Error suggesting aliases for '{skill}': {e}")
            return []

    def _generate_skill_variations(self, skill: str) -> List[str]:
        """Generate common variations of a skill"""
        variations = []
        skill_lower = skill.lower()

        # Common abbreviations
        if skill_lower == "javascript":
            variations.extend(["JS", "js", "JavaScript"])
        elif skill_lower == "typescript":
            variations.extend(["TS", "ts", "TypeScript"])
        elif skill_lower == "python":
            variations.extend(["Python", "python", "Py"])
        elif skill_lower == "amazon web services":
            variations.extend(["AWS", "aws", "Amazon Web Services"])

        # Framework variations
        if "react" in skill_lower:
            variations.extend([skill, skill.replace("React", "React.js")])
        elif "vue" in skill_lower:
            variations.extend([skill, skill.replace("Vue", "Vue.js")])
        elif "angular" in skill_lower:
            variations.extend([skill, skill.replace("Angular", "AngularJS")])

        # General variations
        variations.extend([
            skill.title(),
            skill.upper(),
            skill.lower(),
            skill.replace(" ", ""),
            skill.replace(" ", "_"),
            skill.replace(" ", "-"),
        ])

        return list(set(variations))  # Remove duplicates

    async def _get_existing_aliases(self, skill: str) -> List[str]:
        """Get existing aliases for a skill"""
        try:
            skill_data = await self._find_exact_match(skill)
            if skill_data:
                return skill_data.get("aliases", [])
        except Exception:
            pass
        return []

    async def learn_from_mappings(
        self,
        source_skills: List[str],
        target_skills: List[str],
    ):
        """Learn from skill normalization patterns"""
        try:
            # This would implement machine learning to improve normalization
            # For now, we'll just log the mappings for manual review
            logger.info(f"Learning from {len(source_skills)} -> {len(target_skills)} skill mappings")

            # Store mappings for future use
            mappings = []
            for source, target in zip(source_skills, target_skills):
                mappings.append({
                    "source": source,
                    "target": target,
                    "timestamp": asyncio.get_event_loop().time(),
                })

            # In production, this would update ML models or rules
            # For now, we'll store in the taxonomy manager for review
            await self.taxonomy_manager.store_learning_mappings(mappings)

        except Exception as e:
            logger.error(f"Error learning from mappings: {e}")

    def clear_cache(self):
        """Clear the normalization cache"""
        self.cache.clear()
        logger.info("Normalization cache cleared")
