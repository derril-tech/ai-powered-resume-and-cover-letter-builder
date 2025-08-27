"""
Skill Clusterer
Groups similar skills together using clustering algorithms.
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict
import asyncio
from enum import Enum

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics.pairwise import cosine_similarity

from .taxonomy_manager import TaxonomyManager

logger = logging.getLogger(__name__)

class ClusteringMethod(Enum):
    """Clustering method types"""
    SEMANTIC = "semantic"
    SIMILARITY = "similarity"
    CATEGORY = "category"
    HYBRID = "hybrid"

class SkillClusterer:
    """Clusters skills using various algorithms"""

    def __init__(self, taxonomy_manager: TaxonomyManager):
        self.taxonomy_manager = taxonomy_manager

        # Clustering parameters
        self.default_min_cluster_size = 2
        self.default_max_clusters = 10

        # Initialize vectorizer for text-based clustering
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            max_features=1000,
            ngram_range=(1, 2)
        )

    async def cluster_skills(
        self,
        skills: List[str],
        method: str = "semantic",
        min_cluster_size: int = 2,
        max_clusters: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Cluster skills using specified method

        Args:
            skills: List of skills to cluster
            method: Clustering method (semantic, similarity, category, hybrid)
            min_cluster_size: Minimum skills per cluster
            max_clusters: Maximum number of clusters

        Returns:
            List of clusters with skills and metadata
        """
        try:
            if not skills or len(skills) < min_cluster_size:
                return []

            clustering_method = ClusteringMethod(method.lower())

            if clustering_method == ClusteringMethod.SEMANTIC:
                clusters = await self._semantic_clustering(skills, max_clusters)
            elif clustering_method == ClusteringMethod.SIMILARITY:
                clusters = await self._similarity_clustering(skills, max_clusters)
            elif clustering_method == ClusteringMethod.CATEGORY:
                clusters = await self._category_clustering(skills)
            elif clustering_method == ClusteringMethod.HYBRID:
                clusters = await self._hybrid_clustering(skills, max_clusters)
            else:
                raise ValueError(f"Unknown clustering method: {method}")

            # Filter clusters by minimum size
            filtered_clusters = []
            for cluster in clusters:
                if len(cluster["skills"]) >= min_cluster_size:
                    filtered_clusters.append(cluster)

            # Sort clusters by size (largest first)
            filtered_clusters.sort(key=lambda x: len(x["skills"]), reverse=True)

            logger.info(f"Created {len(filtered_clusters)} clusters from {len(skills)} skills")
            return filtered_clusters

        except Exception as e:
            logger.error(f"Failed to cluster skills: {e}")
            return []

    async def _semantic_clustering(
        self,
        skills: List[str],
        max_clusters: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Cluster skills using semantic similarity"""
        try:
            # Get embeddings for all skills
            embeddings = []
            for skill in skills:
                embedding = await self._get_skill_embedding(skill)
                embeddings.append(embedding)

            # Convert to numpy array
            embeddings_array = np.array(embeddings)

            # Determine number of clusters
            n_clusters = min(max_clusters or self.default_max_clusters, len(skills))

            # Perform K-means clustering
            kmeans = KMeans(
                n_clusters=n_clusters,
                random_state=42,
                n_init=10
            )
            cluster_labels = kmeans.fit_predict(embeddings_array)

            # Group skills by cluster
            clusters = defaultdict(list)
            for i, label in enumerate(cluster_labels):
                clusters[label].append(skills[i])

            # Convert to cluster format
            cluster_list = []
            for cluster_id, cluster_skills in clusters.items():
                cluster_list.append({
                    "cluster_id": f"semantic_{cluster_id}",
                    "skills": cluster_skills,
                    "method": "semantic",
                    "centroid": kmeans.cluster_centers_[cluster_id].tolist(),
                    "size": len(cluster_skills),
                    "representative_skill": await self._get_cluster_representative(cluster_skills),
                })

            return cluster_list

        except Exception as e:
            logger.warning(f"Semantic clustering failed: {e}")
            return []

    async def _similarity_clustering(
        self,
        skills: List[str],
        max_clusters: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Cluster skills using text similarity"""
        try:
            # Create TF-IDF vectors
            tfidf_matrix = self.vectorizer.fit_transform(skills)

            # Calculate similarity matrix
            similarity_matrix = cosine_similarity(tfidf_matrix)

            # Use DBSCAN for density-based clustering
            # Convert similarity to distance
            distance_matrix = 1 - similarity_matrix

            # DBSCAN parameters
            eps = 0.5  # Maximum distance between points
            min_samples = 2

            dbscan = DBSCAN(
                eps=eps,
                min_samples=min_samples,
                metric='precomputed'
            )
            cluster_labels = dbscan.fit_predict(distance_matrix)

            # Group skills by cluster
            clusters = defaultdict(list)
            for i, label in enumerate(cluster_labels):
                if label != -1:  # -1 indicates noise points
                    clusters[label].append(skills[i])

            # Convert to cluster format
            cluster_list = []
            for cluster_id, cluster_skills in clusters.items():
                cluster_list.append({
                    "cluster_id": f"similarity_{cluster_id}",
                    "skills": cluster_skills,
                    "method": "similarity",
                    "size": len(cluster_skills),
                    "representative_skill": await self._get_cluster_representative(cluster_skills),
                })

            return cluster_list

        except Exception as e:
            logger.warning(f"Similarity clustering failed: {e}")
            return []

    async def _category_clustering(self, skills: List[str]) -> List[Dict[str, Any]]:
        """Cluster skills by their taxonomy categories"""
        try:
            # Get taxonomy information for skills
            skill_categories = {}
            all_taxonomy_skills = await self.taxonomy_manager.get_all_skills()

            # Create lookup map
            taxonomy_lookup = {}
            for taxonomy_skill in all_taxonomy_skills:
                skill_name = taxonomy_skill["name"].lower()
                taxonomy_lookup[skill_name] = taxonomy_skill["category"]

                # Also check aliases
                for alias in taxonomy_skill.get("aliases", []):
                    taxonomy_lookup[alias.lower()] = taxonomy_skill["category"]

            # Categorize skills
            for skill in skills:
                skill_lower = skill.lower()
                category = taxonomy_lookup.get(skill_lower, "unknown")
                skill_categories[skill] = category

            # Group by category
            category_clusters = defaultdict(list)
            for skill, category in skill_categories.items():
                category_clusters[category].append(skill)

            # Convert to cluster format
            cluster_list = []
            for category, cluster_skills in category_clusters.items():
                cluster_list.append({
                    "cluster_id": f"category_{category}",
                    "skills": cluster_skills,
                    "method": "category",
                    "category": category,
                    "size": len(cluster_skills),
                    "representative_skill": await self._get_cluster_representative(cluster_skills),
                })

            return cluster_list

        except Exception as e:
            logger.warning(f"Category clustering failed: {e}")
            return []

    async def _hybrid_clustering(
        self,
        skills: List[str],
        max_clusters: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Hybrid clustering combining multiple methods"""
        try:
            # First try category clustering
            category_clusters = await self._category_clustering(skills)

            # If we have good category clusters, use them
            if category_clusters and len(category_clusters) <= (max_clusters or self.default_max_clusters):
                return category_clusters

            # Otherwise, fall back to semantic clustering
            return await self._semantic_clustering(skills, max_clusters)

        except Exception as e:
            logger.warning(f"Hybrid clustering failed: {e}")
            return []

    async def _get_skill_embedding(self, skill: str) -> List[float]:
        """Get vector embedding for a skill"""
        # Simplified embedding - in production, you'd use actual embeddings
        skill = skill.lower()
        embedding = [0.0] * 128

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

    async def _get_cluster_representative(self, skills: List[str]) -> str:
        """Get representative skill for a cluster"""
        try:
            if not skills:
                return ""

            # Simple approach: return the shortest skill as representative
            # In production, you might use centrality measures
            return min(skills, key=len)

        except Exception:
            return skills[0] if skills else ""

    async def analyze_clusters(
        self,
        clusters: List[Dict[str, Any]],
        original_skills: List[str],
    ) -> Dict[str, Any]:
        """Analyze clustering results"""
        try:
            analysis = {
                "total_clusters": len(clusters),
                "total_skills": sum(len(cluster["skills"]) for cluster in clusters),
                "average_cluster_size": 0.0,
                "cluster_sizes": [],
                "coverage": 0.0,
                "cluster_quality_score": 0.0,
            }

            if clusters:
                cluster_sizes = [len(cluster["skills"]) for cluster in clusters]
                analysis["average_cluster_size"] = sum(cluster_sizes) / len(cluster_sizes)
                analysis["cluster_sizes"] = cluster_sizes

                # Calculate coverage
                clustered_skills = set()
                for cluster in clusters:
                    clustered_skills.update(cluster["skills"])

                analysis["coverage"] = len(clustered_skills) / len(original_skills) if original_skills else 0.0

                # Calculate quality score (simplified)
                # Higher score for balanced clusters
                if len(clusters) > 1:
                    size_variance = np.var(cluster_sizes)
                    balance_score = 1.0 / (1.0 + size_variance)
                    coverage_bonus = min(analysis["coverage"], 1.0)
                    analysis["cluster_quality_score"] = (balance_score + coverage_bonus) / 2.0

            return analysis

        except Exception as e:
            logger.warning(f"Failed to analyze clusters: {e}")
            return {
                "total_clusters": len(clusters),
                "total_skills": sum(len(cluster["skills"]) for cluster in clusters),
                "average_cluster_size": 0.0,
                "cluster_sizes": [],
                "coverage": 0.0,
                "cluster_quality_score": 0.0,
            }

    async def merge_similar_clusters(
        self,
        clusters: List[Dict[str, Any]],
        similarity_threshold: float = 0.7,
    ) -> List[Dict[str, Any]]:
        """Merge clusters that are too similar"""
        try:
            if len(clusters) <= 1:
                return clusters

            merged_clusters = []
            processed_indices = set()

            for i, cluster1 in enumerate(clusters):
                if i in processed_indices:
                    continue

                current_cluster = cluster1.copy()
                current_skills = set(cluster1["skills"])

                for j, cluster2 in enumerate(clusters):
                    if j <= i or j in processed_indices:
                        continue

                    # Calculate similarity between clusters
                    cluster_similarity = await self._calculate_cluster_similarity(
                        cluster1, cluster2
                    )

                    if cluster_similarity >= similarity_threshold:
                        # Merge clusters
                        current_skills.update(cluster2["skills"])
                        processed_indices.add(j)

                # Update cluster
                current_cluster["skills"] = list(current_skills)
                current_cluster["size"] = len(current_skills)
                merged_clusters.append(current_cluster)
                processed_indices.add(i)

            return merged_clusters

        except Exception as e:
            logger.warning(f"Failed to merge similar clusters: {e}")
            return clusters

    async def _calculate_cluster_similarity(
        self,
        cluster1: Dict[str, Any],
        cluster2: Dict[str, Any],
    ) -> float:
        """Calculate similarity between two clusters"""
        try:
            skills1 = set(cluster1["skills"])
            skills2 = set(cluster2["skills"])

            # Jaccard similarity
            intersection = len(skills1.intersection(skills2))
            union = len(skills1.union(skills2))

            if union == 0:
                return 0.0

            return intersection / union

        except Exception:
            return 0.0

    async def suggest_cluster_names(
        self,
        clusters: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Suggest names for clusters based on their content"""
        try:
            named_clusters = []

            for cluster in clusters:
                cluster_copy = cluster.copy()

                # Simple name suggestion based on most common words
                skills_text = " ".join(cluster["skills"]).lower()
                words = re.findall(r'\b\w+\b', skills_text)

                # Count word frequencies
                word_counts = defaultdict(int)
                for word in words:
                    if len(word) > 3:  # Only consider meaningful words
                        word_counts[word] += 1

                # Get top words
                top_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:3]
                suggested_name = " ".join(word[0] for word in top_words)

                cluster_copy["suggested_name"] = suggested_name.title()
                named_clusters.append(cluster_copy)

            return named_clusters

        except Exception as e:
            logger.warning(f"Failed to suggest cluster names: {e}")
            return clusters
