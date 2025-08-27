"""
Taxonomy Manager
Manages skill taxonomy data, categories, and relationships.
"""

import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import asyncio
from collections import defaultdict

logger = logging.getLogger(__name__)

class TaxonomyManager:
    """Manages skill taxonomy data and operations"""

    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.taxonomy_data = {}
        self.categories = {}
        self.last_updated = None

        # Default taxonomy structure
        self.default_categories = {
            "programming_languages": {
                "name": "Programming Languages",
                "description": "Programming languages and scripting languages",
                "skills": [],
            },
            "frameworks": {
                "name": "Frameworks & Libraries",
                "description": "Software frameworks and libraries",
                "skills": [],
            },
            "databases": {
                "name": "Databases",
                "description": "Database systems and technologies",
                "skills": [],
            },
            "cloud_platforms": {
                "name": "Cloud Platforms",
                "description": "Cloud computing platforms and services",
                "skills": [],
            },
            "devops": {
                "name": "DevOps & Infrastructure",
                "description": "DevOps tools and infrastructure technologies",
                "skills": [],
            },
            "data_science": {
                "name": "Data Science & Analytics",
                "description": "Data science, machine learning, and analytics tools",
                "skills": [],
            },
            "web_technologies": {
                "name": "Web Technologies",
                "description": "Web development technologies and standards",
                "skills": [],
            },
            "mobile_development": {
                "name": "Mobile Development",
                "description": "Mobile application development",
                "skills": [],
            },
            "soft_skills": {
                "name": "Soft Skills",
                "description": "Interpersonal and professional skills",
                "skills": [],
            },
            "business_skills": {
                "name": "Business & Management",
                "description": "Business analysis and management skills",
                "skills": [],
            },
        }

    async def initialize(self):
        """Initialize the taxonomy manager"""
        try:
            # Load taxonomy data from database or create default
            await self.load_taxonomy_data()

            # Load categories
            self.categories = await self.load_categories()

            logger.info("Taxonomy manager initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize taxonomy manager: {e}")
            # Use default categories as fallback
            self.categories = self.default_categories.copy()

    async def load_taxonomy_data(self):
        """Load taxonomy data from database"""
        try:
            # In production, this would load from PostgreSQL
            # For now, we'll use an in-memory structure

            # Load default taxonomy data
            self.taxonomy_data = await self._load_default_taxonomy()

            # Try to load custom taxonomy data from database
            custom_data = await self._load_custom_taxonomy()
            if custom_data:
                self._merge_taxonomy_data(custom_data)

            self.last_updated = datetime.now()

        except Exception as e:
            logger.warning(f"Failed to load taxonomy data from database: {e}")
            # Use default taxonomy
            self.taxonomy_data = await self._load_default_taxonomy()

    async def _load_default_taxonomy(self) -> Dict[str, Any]:
        """Load default taxonomy data"""
        return {
            "programming_languages": {
                "Python": {
                    "aliases": ["python", "py", "Python3", "Python 3"],
                    "category": "programming_languages",
                    "description": "High-level programming language",
                    "level": "popular",
                },
                "JavaScript": {
                    "aliases": ["javascript", "js", "JS", "ECMAScript"],
                    "category": "programming_languages",
                    "description": "Programming language for web development",
                    "level": "essential",
                },
                "TypeScript": {
                    "aliases": ["typescript", "ts", "TS"],
                    "category": "programming_languages",
                    "description": "Typed superset of JavaScript",
                    "level": "popular",
                },
                "Java": {
                    "aliases": ["java", "JVM"],
                    "category": "programming_languages",
                    "description": "Object-oriented programming language",
                    "level": "popular",
                },
                "C++": {
                    "aliases": ["c++", "cpp", "CPlusPlus"],
                    "category": "programming_languages",
                    "description": "General-purpose programming language",
                    "level": "advanced",
                },
                "C#": {
                    "aliases": ["c#", "csharp", "C Sharp"],
                    "category": "programming_languages",
                    "description": "Multi-paradigm programming language",
                    "level": "popular",
                },
                "Go": {
                    "aliases": ["go", "golang"],
                    "category": "programming_languages",
                    "description": "Compiled programming language",
                    "level": "emerging",
                },
                "Rust": {
                    "aliases": ["rust"],
                    "category": "programming_languages",
                    "description": "Systems programming language",
                    "level": "emerging",
                },
                "PHP": {
                    "aliases": ["php"],
                    "category": "programming_languages",
                    "description": "Server-side scripting language",
                    "level": "popular",
                },
                "Ruby": {
                    "aliases": ["ruby", "rb"],
                    "category": "programming_languages",
                    "description": "Dynamic programming language",
                    "level": "popular",
                },
            },
            "frameworks": {
                "React": {
                    "aliases": ["react", "React.js", "ReactJS"],
                    "category": "frameworks",
                    "description": "JavaScript library for building user interfaces",
                    "level": "essential",
                },
                "Angular": {
                    "aliases": ["angular", "AngularJS", "Angular 2+"],
                    "category": "frameworks",
                    "description": "TypeScript-based web application framework",
                    "level": "popular",
                },
                "Vue.js": {
                    "aliases": ["vue", "vue.js", "Vue"],
                    "category": "frameworks",
                    "description": "Progressive JavaScript framework",
                    "level": "popular",
                },
                "Django": {
                    "aliases": ["django"],
                    "category": "frameworks",
                    "description": "High-level Python web framework",
                    "level": "popular",
                },
                "Flask": {
                    "aliases": ["flask"],
                    "category": "frameworks",
                    "description": "Lightweight Python web framework",
                    "level": "popular",
                },
                "FastAPI": {
                    "aliases": ["fastapi", "Fast API"],
                    "category": "frameworks",
                    "description": "Modern Python web framework",
                    "level": "emerging",
                },
                "Express.js": {
                    "aliases": ["express", "express.js", "Express"],
                    "category": "frameworks",
                    "description": "Node.js web application framework",
                    "level": "popular",
                },
                "Spring Boot": {
                    "aliases": ["spring boot", "springboot"],
                    "category": "frameworks",
                    "description": "Java framework for building microservices",
                    "level": "popular",
                },
                ".NET Core": {
                    "aliases": [".net core", "dotnet core", ".NET"],
                    "category": "frameworks",
                    "description": "Cross-platform .NET framework",
                    "level": "popular",
                },
            },
            "databases": {
                "PostgreSQL": {
                    "aliases": ["postgres", "postgresql", "pg"],
                    "category": "databases",
                    "description": "Advanced open source relational database",
                    "level": "popular",
                },
                "MySQL": {
                    "aliases": ["mysql", "my sql"],
                    "category": "databases",
                    "description": "Open source relational database",
                    "level": "popular",
                },
                "MongoDB": {
                    "aliases": ["mongodb", "mongo"],
                    "category": "databases",
                    "description": "NoSQL document database",
                    "level": "popular",
                },
                "Redis": {
                    "aliases": ["redis"],
                    "category": "databases",
                    "description": "In-memory data structure store",
                    "level": "popular",
                },
                "SQLite": {
                    "aliases": ["sqlite"],
                    "category": "databases",
                    "description": "Self-contained SQL database engine",
                    "level": "popular",
                },
                "Oracle": {
                    "aliases": ["oracle database", "oracle db"],
                    "category": "databases",
                    "description": "Multi-model database management system",
                    "level": "enterprise",
                },
                "SQL Server": {
                    "aliases": ["sql server", "microsoft sql server", "mssql"],
                    "category": "databases",
                    "description": "Relational database management system",
                    "level": "enterprise",
                },
            },
            "cloud_platforms": {
                "Amazon Web Services": {
                    "aliases": ["aws", "AWS", "Amazon Web Services"],
                    "category": "cloud_platforms",
                    "description": "Cloud computing platform",
                    "level": "essential",
                },
                "Microsoft Azure": {
                    "aliases": ["azure", "Azure", "Microsoft Azure"],
                    "category": "cloud_platforms",
                    "description": "Cloud computing platform",
                    "level": "popular",
                },
                "Google Cloud Platform": {
                    "aliases": ["gcp", "GCP", "Google Cloud"],
                    "category": "cloud_platforms",
                    "description": "Cloud computing platform",
                    "level": "popular",
                },
                "Heroku": {
                    "aliases": ["heroku"],
                    "category": "cloud_platforms",
                    "description": "Platform as a Service",
                    "level": "popular",
                },
                "DigitalOcean": {
                    "aliases": ["digital ocean", "digitalocean"],
                    "category": "cloud_platforms",
                    "description": "Cloud infrastructure provider",
                    "level": "emerging",
                },
            },
            "devops": {
                "Docker": {
                    "aliases": ["docker"],
                    "category": "devops",
                    "description": "Containerization platform",
                    "level": "essential",
                },
                "Kubernetes": {
                    "aliases": ["kubernetes", "k8s"],
                    "category": "devops",
                    "description": "Container orchestration system",
                    "level": "popular",
                },
                "Jenkins": {
                    "aliases": ["jenkins"],
                    "category": "devops",
                    "description": "Automation server",
                    "level": "popular",
                },
                "GitLab CI": {
                    "aliases": ["gitlab ci", "gitlab-ci"],
                    "category": "devops",
                    "description": "Continuous integration service",
                    "level": "popular",
                },
                "GitHub Actions": {
                    "aliases": ["github actions", "github-actions"],
                    "category": "devops",
                    "description": "Continuous integration service",
                    "level": "popular",
                },
                "Terraform": {
                    "aliases": ["terraform"],
                    "category": "devops",
                    "description": "Infrastructure as code tool",
                    "level": "popular",
                },
                "Ansible": {
                    "aliases": ["ansible"],
                    "category": "devops",
                    "description": "Configuration management tool",
                    "level": "popular",
                },
            },
        }

    async def _load_custom_taxonomy(self) -> Optional[Dict[str, Any]]:
        """Load custom taxonomy data from database"""
        try:
            # This would query the database for custom taxonomy entries
            # For now, return None to use default taxonomy
            return None
        except Exception:
            return None

    def _merge_taxonomy_data(self, custom_data: Dict[str, Any]):
        """Merge custom taxonomy data with default data"""
        for category, skills in custom_data.items():
            if category in self.taxonomy_data:
                self.taxonomy_data[category].update(skills)
            else:
                self.taxonomy_data[category] = skills

    async def load_categories(self) -> Dict[str, Any]:
        """Load category definitions"""
        try:
            # Use default categories and enhance with taxonomy data
            categories = self.default_categories.copy()

            # Count skills per category from taxonomy data
            for category, skills in self.taxonomy_data.items():
                if category in categories:
                    categories[category]["skills"] = list(skills.keys())

            return categories

        except Exception as e:
            logger.error(f"Failed to load categories: {e}")
            return self.default_categories.copy()

    async def get_all_skills(self) -> List[Dict[str, Any]]:
        """Get all skills from taxonomy"""
        skills = []

        for category, category_skills in self.taxonomy_data.items():
            for skill_name, skill_data in category_skills.items():
                skill_entry = {
                    "name": skill_name,
                    "category": category,
                    "aliases": skill_data.get("aliases", []),
                    "description": skill_data.get("description", ""),
                    "level": skill_data.get("level", "unknown"),
                    "metadata": {k: v for k, v in skill_data.items()
                               if k not in ["aliases", "description", "level"]},
                }
                skills.append(skill_entry)

        return skills

    async def get_skills_by_category(self, category: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get skills for a specific category"""
        if category not in self.taxonomy_data:
            return []

        skills = []
        category_skills = self.taxonomy_data[category]

        for skill_name, skill_data in list(category_skills.items())[offset:offset + limit]:
            skill_entry = {
                "name": skill_name,
                "category": category,
                "aliases": skill_data.get("aliases", []),
                "description": skill_data.get("description", ""),
                "level": skill_data.get("level", "unknown"),
            }
            skills.append(skill_entry)

        return skills

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get all available categories"""
        categories_list = []

        for category_key, category_data in self.categories.items():
            category_info = {
                "key": category_key,
                "name": category_data["name"],
                "description": category_data["description"],
                "skill_count": len(category_data.get("skills", [])),
            }
            categories_list.append(category_info)

        return categories_list

    async def search_skills(
        self,
        query: str,
        category: Optional[str] = None,
        limit: int = 20,
        threshold: float = 0.6,
    ) -> List[Dict[str, Any]]:
        """Search skills in the taxonomy"""
        from fuzzywuzzy import fuzz

        results = []
        query_lower = query.lower()

        search_space = self.taxonomy_data
        if category and category in search_space:
            search_space = {category: search_space[category]}

        for category_name, category_skills in search_space.items():
            for skill_name, skill_data in category_skills.items():
                # Check skill name
                name_score = fuzz.partial_ratio(query_lower, skill_name.lower()) / 100.0
                best_score = name_score

                # Check aliases
                for alias in skill_data.get("aliases", []):
                    alias_score = fuzz.partial_ratio(query_lower, alias.lower()) / 100.0
                    best_score = max(best_score, alias_score)

                if best_score >= threshold:
                    result = {
                        "name": skill_name,
                        "category": category_name,
                        "score": best_score,
                        "aliases": skill_data.get("aliases", []),
                        "description": skill_data.get("description", ""),
                    }
                    results.append(result)

        # Sort by score and limit results
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    async def add_skill(self, skill_data: Dict[str, Any]) -> str:
        """Add a new skill to the taxonomy"""
        try:
            skill_name = skill_data.get("name")
            category = skill_data.get("category")

            if not skill_name or not category:
                raise ValueError("Skill name and category are required")

            if category not in self.taxonomy_data:
                self.taxonomy_data[category] = {}

            # Check if skill already exists
            if skill_name in self.taxonomy_data[category]:
                raise ValueError(f"Skill '{skill_name}' already exists in category '{category}'")

            # Add the skill
            skill_entry = {
                "aliases": skill_data.get("aliases", []),
                "description": skill_data.get("description", ""),
                "level": skill_data.get("level", "unknown"),
                "created_at": datetime.now().isoformat(),
            }

            # Add any additional metadata
            for key, value in skill_data.items():
                if key not in ["name", "category", "aliases", "description", "level"]:
                    skill_entry[key] = value

            self.taxonomy_data[category][skill_name] = skill_entry

            # Update categories
            if category in self.categories:
                if skill_name not in self.categories[category]["skills"]:
                    self.categories[category]["skills"].append(skill_name)

            logger.info(f"Added skill '{skill_name}' to category '{category}'")
            return f"{category}:{skill_name}"

        except Exception as e:
            logger.error(f"Failed to add skill: {e}")
            raise

    async def update_skill(self, skill_id: str, skill_data: Dict[str, Any]) -> bool:
        """Update an existing skill"""
        try:
            # Parse skill_id (format: category:skill_name)
            if ":" not in skill_id:
                raise ValueError("Invalid skill ID format")

            category, skill_name = skill_id.split(":", 1)

            if category not in self.taxonomy_data:
                return False

            if skill_name not in self.taxonomy_data[category]:
                return False

            # Update the skill
            current_data = self.taxonomy_data[category][skill_name]
            current_data.update(skill_data)
            current_data["updated_at"] = datetime.now().isoformat()

            logger.info(f"Updated skill '{skill_name}' in category '{category}'")
            return True

        except Exception as e:
            logger.error(f"Failed to update skill {skill_id}: {e}")
            return False

    async def delete_skill(self, skill_id: str) -> bool:
        """Delete a skill from the taxonomy"""
        try:
            # Parse skill_id (format: category:skill_name)
            if ":" not in skill_id:
                raise ValueError("Invalid skill ID format")

            category, skill_name = skill_id.split(":", 1)

            if category not in self.taxonomy_data:
                return False

            if skill_name not in self.taxonomy_data[category]:
                return False

            # Delete the skill
            del self.taxonomy_data[category][skill_name]

            # Update categories
            if category in self.categories and skill_name in self.categories[category]["skills"]:
                self.categories[category]["skills"].remove(skill_name)

            logger.info(f"Deleted skill '{skill_name}' from category '{category}'")
            return True

        except Exception as e:
            logger.error(f"Failed to delete skill {skill_id}: {e}")
            return False

    async def get_taxonomy_stats(self) -> Dict[str, Any]:
        """Get taxonomy statistics"""
        try:
            total_skills = 0
            category_counts = {}
            normalization_rules = 0

            for category, skills in self.taxonomy_data.items():
                skill_count = len(skills)
                total_skills += skill_count
                category_counts[category] = skill_count

                # Count aliases as normalization rules
                for skill_data in skills.values():
                    normalization_rules += len(skill_data.get("aliases", []))

            # Calculate coverage score (simplified)
            coverage_score = min(total_skills / 100, 1.0)  # Assume 100 skills is good coverage

            return {
                "total_skills": total_skills,
                "categories": category_counts,
                "normalization_rules": normalization_rules,
                "last_updated": self.last_updated.isoformat() if self.last_updated else None,
                "coverage_score": coverage_score,
            }

        except Exception as e:
            logger.error(f"Failed to get taxonomy stats: {e}")
            return {
                "total_skills": 0,
                "categories": {},
                "normalization_rules": 0,
                "last_updated": None,
                "coverage_score": 0.0,
            }

    async def store_normalization_results(
        self,
        original_skills: List[str],
        normalized_results: Dict[str, Any],
        source: Optional[str] = None,
    ):
        """Store normalization results for learning"""
        try:
            # This would store results in database for ML model training
            # For now, we'll just log for analysis

            normalized_count = len(normalized_results.get("normalized_skills", []))
            unmatched_count = len(normalized_results.get("unmatched_skills", []))

            logger.info(
                f"Normalization results: {normalized_count} normalized, "
                f"{unmatched_count} unmatched from source '{source}'"
            )

        except Exception as e:
            logger.warning(f"Failed to store normalization results: {e}")

    async def store_learning_mappings(self, mappings: List[Dict[str, Any]]):
        """Store learning mappings for taxonomy improvement"""
        try:
            # This would store mappings in database for future analysis
            logger.info(f"Stored {len(mappings)} learning mappings for taxonomy improvement")

        except Exception as e:
            logger.warning(f"Failed to store learning mappings: {e}")

    async def import_taxonomy_data(self, taxonomy_data: Dict[str, Any]):
        """Import taxonomy data from external sources"""
        try:
            # Validate taxonomy data structure
            if not isinstance(taxonomy_data, dict):
                raise ValueError("Taxonomy data must be a dictionary")

            # Merge with existing taxonomy
            self._merge_taxonomy_data(taxonomy_data)

            # Update categories
            await self.load_categories()

            logger.info("Taxonomy data imported successfully")

        except Exception as e:
            logger.error(f"Failed to import taxonomy data: {e}")
            raise

    async def export_taxonomy_data(self, format: str = "json") -> Any:
        """Export taxonomy data in specified format"""
        try:
            if format == "json":
                return {
                    "taxonomy": self.taxonomy_data,
                    "categories": self.categories,
                    "exported_at": datetime.now().isoformat(),
                    "version": "1.0",
                }
            else:
                raise ValueError(f"Unsupported export format: {format}")

        except Exception as e:
            logger.error(f"Failed to export taxonomy data: {e}")
            raise
