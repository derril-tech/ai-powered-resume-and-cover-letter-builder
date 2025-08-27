"""
Similarity Matcher
Handles various similarity matching algorithms for skills comparison.
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict
import asyncio
from enum import Enum

from fuzzywuzzy import fuzz
from rapidfuzz import fuzz as rfuzz, process
import numpy as np

from .taxonomy_manager import TaxonomyManager

logger = logging.getLogger(__name__)

class MatchType(Enum):
    """Types of similarity matching"""
    EXACT = "exact"
    FUZZY = "fuzzy"
    SEMANTIC = "semantic"
    HYBRID = "hybrid"

class SimilarityMatcher:
    """Handles similarity matching between skills using various algorithms"""

    def __init__(self, taxonomy_manager: TaxonomyManager):
        self.taxonomy_manager = taxonomy_manager

        # Matching thresholds
        self.thresholds = {
            MatchType.EXACT: 0.95,
            MatchType.FUZZY: 0.80,
            MatchType.SEMANTIC: 0.70,
            MatchType.HYBRID: 0.75,
        }

        # Algorithm weights for hybrid matching
        self.hybrid_weights = {
            "exact": 0.4,
            "fuzzy_ratio": 0.3,
            "fuzzy_partial": 0.2,
            "semantic": 0.1,
        }

    async def match_skills(
        self,
        source_skills: List[str],
        target_skills: List[str],
        threshold: float = 0.7,
        match_type: str = "hybrid",
    ) -> Dict[str, Any]:
        """
        Match source skills against target skills using specified algorithm

        Args:
            source_skills: Skills to find matches for
            target_skills: Skills to match against
            threshold: Similarity threshold (0-1)
            match_type: Type of matching algorithm

        Returns:
            Dictionary with matches, unmatched sources, and unmatched targets
        """
        try:
            match_type_enum = MatchType(match_type.lower())

            # Preprocess skills
            processed_sources = [self._preprocess_skill(skill) for skill in source_skills]
            processed_targets = [self._preprocess_skill(skill) for skill in target_skills]

            matches = []
            matched_sources = set()
            matched_targets = set()

            # Match skills based on algorithm
            if match_type_enum == MatchType.EXACT:
                matches, matched_sources, matched_targets = await self._exact_matching(
                    processed_sources, processed_targets, threshold
                )
            elif match_type_enum == MatchType.FUZZY:
                matches, matched_sources, matched_targets = await self._fuzzy_matching(
                    processed_sources, processed_targets, threshold
                )
            elif match_type_enum == MatchType.SEMANTIC:
                matches, matched_sources, matched_targets = await self._semantic_matching(
                    processed_sources, processed_targets, threshold
                )
            elif match_type_enum == MatchType.HYBRID:
                matches, matched_sources, matched_targets = await self._hybrid_matching(
                    processed_sources, processed_targets, threshold
                )

            # Find unmatched skills
            unmatched_sources = [
                source_skills[i] for i, source in enumerate(processed_sources)
                if i not in matched_sources
            ]

            unmatched_targets = [
                target_skills[i] for i, target in enumerate(processed_targets)
                if i not in matched_targets
            ]

            # Calculate average confidence
            avg_confidence = (
                sum(match["confidence"] for match in matches) / len(matches)
                if matches else 0.0
            )

            return {
                "matches": matches,
                "unmatched_source": unmatched_sources,
                "unmatched_target": unmatched_targets,
                "average_confidence": avg_confidence,
            }

        except Exception as e:
            logger.error(f"Failed to match skills: {e}")
            return {
                "matches": [],
                "unmatched_source": source_skills,
                "unmatched_target": target_skills,
                "average_confidence": 0.0,
            }

    async def _exact_matching(
        self,
        source_skills: List[str],
        target_skills: List[str],
        threshold: float,
    ) -> Tuple[List[Dict[str, Any]], set, set]:
        """Exact string matching"""
        matches = []
        matched_sources = set()
        matched_targets = set()

        # Create lookup for faster matching
        target_lookup = {skill.lower(): (i, skill) for i, skill in enumerate(target_skills)}

        for i, source in enumerate(source_skills):
            source_lower = source.lower()

            if source_lower in target_lookup:
                target_idx, target = target_lookup[source_lower]

                match = {
                    "source_skill": source,
                    "target_skill": target,
                    "confidence": 1.0,
                    "match_type": "exact",
                    "algorithms": ["exact"],
                }

                matches.append(match)
                matched_sources.add(i)
                matched_targets.add(target_idx)

        return matches, matched_sources, matched_targets

    async def _fuzzy_matching(
        self,
        source_skills: List[str],
        target_skills: List[str],
        threshold: float,
    ) -> Tuple[List[Dict[str, Any]], set, set]:
        """Fuzzy string matching using multiple algorithms"""
        matches = []
        matched_sources = set()
        matched_targets = set()

        for i, source in enumerate(source_skills):
            best_match = None
            best_score = 0.0
            best_target_idx = -1

            for j, target in enumerate(target_skills):
                if j in matched_targets:
                    continue

                # Calculate multiple fuzzy similarity scores
                ratio_score = fuzz.ratio(source, target) / 100.0
                partial_score = fuzz.partial_ratio(source, target) / 100.0
                sort_score = fuzz.token_sort_ratio(source, target) / 100.0
                set_score = fuzz.token_set_ratio(source, target) / 100.0

                # Use weighted combination
                combined_score = (
                    ratio_score * 0.4 +
                    partial_score * 0.3 +
                    sort_score * 0.2 +
                    set_score * 0.1
                )

                if combined_score > best_score and combined_score >= threshold:
                    best_score = combined_score
                    best_target_idx = j
                    best_match = {
                        "source_skill": source,
                        "target_skill": target,
                        "confidence": combined_score,
                        "match_type": "fuzzy",
                        "algorithms": {
                            "ratio": ratio_score,
                            "partial": partial_score,
                            "sort": sort_score,
                            "set": set_score,
                        },
                    }

            if best_match:
                matches.append(best_match)
                matched_sources.add(i)
                matched_targets.add(best_target_idx)

        return matches, matched_sources, matched_targets

    async def _semantic_matching(
        self,
        source_skills: List[str],
        target_skills: List[str],
        threshold: float,
    ) -> Tuple[List[Dict[str, Any]], set, set]:
        """Semantic similarity matching using embeddings"""
        matches = []
        matched_sources = set()
        matched_targets = set()

        # Get embeddings for all skills
        source_embeddings = []
        target_embeddings = []

        for source in source_skills:
            embedding = await self._get_skill_embedding(source)
            source_embeddings.append(embedding)

        for target in target_skills:
            embedding = await self._get_skill_embedding(target)
            target_embeddings.append(embedding)

        # Calculate similarities
        for i, source_embedding in enumerate(source_embeddings):
            for j, target_embedding in enumerate(target_embeddings):
                if j in matched_targets:
                    continue

                similarity = await self._calculate_embedding_similarity(
                    source_embedding, target_embedding
                )

                if similarity >= threshold:
                    # Check if this is the best match for both skills
                    is_best_for_source = True
                    is_best_for_target = True

                    # Check if there's a better match for source
                    for k, other_target_embedding in enumerate(target_embeddings):
                        if k != j and k not in matched_targets:
                            other_similarity = await self._calculate_embedding_similarity(
                                source_embedding, other_target_embedding
                            )
                            if other_similarity > similarity:
                                is_best_for_source = False
                                break

                    # Check if there's a better match for target
                    for k, other_source_embedding in enumerate(source_embeddings):
                        if k != i and k not in matched_sources:
                            other_similarity = await self._calculate_embedding_similarity(
                                other_source_embedding, target_embedding
                            )
                            if other_similarity > similarity:
                                is_best_for_target = False
                                break

                    if is_best_for_source and is_best_for_target:
                        match = {
                            "source_skill": source_skills[i],
                            "target_skill": target_skills[j],
                            "confidence": similarity,
                            "match_type": "semantic",
                            "algorithms": ["embedding_similarity"],
                        }

                        matches.append(match)
                        matched_sources.add(i)
                        matched_targets.add(j)
                        break  # Move to next source skill

        return matches, matched_sources, matched_targets

    async def _hybrid_matching(
        self,
        source_skills: List[str],
        target_skills: List[str],
        threshold: float,
    ) -> Tuple[List[Dict[str, Any]], set, set]:
        """Hybrid matching combining multiple algorithms"""
        matches = []
        matched_sources = set()
        matched_targets = set()

        # First try exact matching
        exact_matches, exact_sources, exact_targets = await self._exact_matching(
            source_skills, target_skills, self.thresholds[MatchType.EXACT]
        )

        matches.extend(exact_matches)
        matched_sources.update(exact_sources)
        matched_targets.update(exact_targets)

        # Then try fuzzy matching for remaining skills
        remaining_sources = [
            (i, skill) for i, skill in enumerate(source_skills)
            if i not in matched_sources
        ]
        remaining_targets = [
            (j, skill) for j, skill in enumerate(target_skills)
            if j not in matched_targets
        ]

        if remaining_sources and remaining_targets:
            remaining_source_skills = [skill for _, skill in remaining_sources]
            remaining_target_skills = [skill for _, skill in remaining_targets]

            fuzzy_matches, fuzzy_matched_sources, fuzzy_matched_targets = await self._fuzzy_matching(
                remaining_source_skills, remaining_target_skills, threshold
            )

            # Map back to original indices
            for match in fuzzy_matches:
                source_idx = remaining_sources[
                    remaining_source_skills.index(match["source_skill"])
                ][0]
                target_idx = remaining_targets[
                    remaining_target_skills.index(match["target_skill"])
                ][0]

                match_copy = match.copy()
                matches.append(match_copy)
                matched_sources.add(source_idx)
                matched_targets.add(target_idx)

        return matches, matched_sources, matched_targets

    def _preprocess_skill(self, skill: str) -> str:
        """Preprocess skill for matching"""
        if not skill:
            return skill

        # Convert to lowercase
        skill = skill.lower().strip()

        # Remove extra whitespace
        skill = re.sub(r'\s+', ' ', skill)

        # Remove common punctuation that doesn't affect meaning
        skill = re.sub(r'[^\w\s]', '', skill)

        # Normalize common variations
        skill = re.sub(r'\bjavascript\b', 'js', skill)
        skill = re.sub(r'\btypescript\b', 'ts', skill)
        skill = re.sub(r'\bpython\b', 'py', skill)

        return skill.strip()

    async def _get_skill_embedding(self, skill: str) -> List[float]:
        """Get vector embedding for a skill"""
        # Simplified embedding - in production, you'd use actual embeddings
        # This creates a basic vector based on character patterns

        skill = skill.lower()
        embedding = [0.0] * 128  # 128-dimensional embedding

        # Character-level features
        for i, char in enumerate(skill[:128]):
            if char.isalpha():
                embedding[i % 128] += ord(char) / 255.0

        # Word-level features
        words = skill.split()
        for i, word in enumerate(words):
            word_hash = hash(word) % 128
            embedding[word_hash] += 1.0

        # Normalize
        magnitude = sum(x * x for x in embedding) ** 0.5
        if magnitude > 0:
            embedding = [x / magnitude for x in embedding]

        return embedding

    async def _calculate_embedding_similarity(
        self,
        embedding1: List[float],
        embedding2: List[float]
    ) -> float:
        """Calculate cosine similarity between embeddings"""
        try:
            import math

            # Calculate dot product
            dot_product = sum(a * b for a, b in zip(embedding1, embedding2))

            # Calculate magnitudes
            magnitude1 = math.sqrt(sum(a * a for a in embedding1))
            magnitude2 = math.sqrt(sum(b * b for b in embedding2))

            # Avoid division by zero
            if magnitude1 == 0 or magnitude2 == 0:
                return 0.0

            return dot_product / (magnitude1 * magnitude2)

        except Exception:
            return 0.0

    async def find_best_matches(
        self,
        skill: str,
        candidates: List[str],
        top_k: int = 5,
        threshold: float = 0.6,
    ) -> List[Dict[str, Any]]:
        """Find best matches for a skill from candidates"""
        try:
            matches = []

            for candidate in candidates:
                # Try multiple matching algorithms
                exact_score = 1.0 if skill.lower() == candidate.lower() else 0.0
                fuzzy_score = fuzz.ratio(skill, candidate) / 100.0
                partial_score = fuzz.partial_ratio(skill, candidate) / 100.0

                # Use best score
                confidence = max(exact_score, fuzzy_score, partial_score)

                if confidence >= threshold:
                    matches.append({
                        "skill": candidate,
                        "confidence": confidence,
                        "match_type": "exact" if exact_score == 1.0 else "fuzzy",
                    })

            # Sort by confidence and return top-k
            matches.sort(key=lambda x: x["confidence"], reverse=True)
            return matches[:top_k]

        except Exception as e:
            logger.warning(f"Failed to find best matches for '{skill}': {e}")
            return []

    async def calculate_skill_overlap(
        self,
        skills1: List[str],
        skills2: List[str],
    ) -> Dict[str, Any]:
        """Calculate overlap between two skill sets"""
        try:
            # Match skills between the two sets
            match_result = await self.match_skills(
                skills1, skills2, threshold=0.7, match_type="hybrid"
            )

            matched_count = len(match_result["matches"])
            total_skills1 = len(skills1)
            total_skills2 = len(skills2)

            # Calculate overlap metrics
            overlap_score = matched_count / max(total_skills1, total_skills2) if max(total_skills1, total_skills2) > 0 else 0.0
            precision = matched_count / total_skills1 if total_skills1 > 0 else 0.0
            recall = matched_count / total_skills2 if total_skills2 > 0 else 0.0
            f1_score = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

            return {
                "overlap_score": overlap_score,
                "precision": precision,
                "recall": recall,
                "f1_score": f1_score,
                "matched_count": matched_count,
                "total_skills1": total_skills1,
                "total_skills2": total_skills2,
                "matches": match_result["matches"],
            }

        except Exception as e:
            logger.error(f"Failed to calculate skill overlap: {e}")
            return {
                "overlap_score": 0.0,
                "precision": 0.0,
                "recall": 0.0,
                "f1_score": 0.0,
                "matched_count": 0,
                "total_skills1": len(skills1),
                "total_skills2": len(skills2),
                "matches": [],
            }
