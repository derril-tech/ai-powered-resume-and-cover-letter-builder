"""
Skill Extractor
Extracts technical and soft skills from job descriptions using NLP and pattern matching.
"""

import re
import logging
from typing import List, Dict, Set, Tuple
import asyncio
from functools import lru_cache

logger = logging.getLogger(__name__)

class SkillExtractor:
    """Extracts skills from job descriptions using multiple techniques"""

    def __init__(self):
        # Comprehensive skill database
        self.technical_skills = self._load_technical_skills()
        self.soft_skills = self._load_soft_skills()
        self.skill_patterns = self._load_skill_patterns()

        # Skill categories for better organization
        self.skill_categories = {
            'programming_languages': [],
            'frameworks': [],
            'databases': [],
            'cloud_platforms': [],
            'tools': [],
            'methodologies': [],
            'soft_skills': [],
        }

    async def extract_skills(self, text: str) -> List[str]:
        """
        Extract skills from job description text

        Args:
            text: Job description text

        Returns:
            List of extracted skills
        """
        if not text:
            return []

        # Normalize text for better matching
        normalized_text = text.lower().strip()

        # Extract skills using multiple methods
        pattern_skills = await self._extract_by_patterns(normalized_text)
        keyword_skills = await self._extract_by_keywords(normalized_text)
        context_skills = await self._extract_by_context(normalized_text, text)

        # Combine and deduplicate
        all_skills = set(pattern_skills + keyword_skills + context_skills)

        # Filter and rank skills
        filtered_skills = await self._filter_and_rank_skills(list(all_skills), normalized_text)

        logger.info(f"Extracted {len(filtered_skills)} skills from job description")

        return filtered_skills

    async def _extract_by_patterns(self, text: str) -> List[str]:
        """Extract skills using regex patterns"""
        skills = []

        for skill, patterns in self.skill_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text, re.IGNORECASE):
                    skills.append(skill)
                    break  # Only add skill once per pattern set

        return skills

    async def _extract_by_keywords(self, text: str) -> List[str]:
        """Extract skills by matching against keyword database"""
        skills = []

        # Check technical skills
        for skill in self.technical_skills:
            if skill.lower() in text:
                skills.append(skill)

        # Check soft skills
        for skill in self.soft_skills:
            if skill.lower() in text:
                skills.append(skill)

        return skills

    async def _extract_by_context(self, normalized_text: str, original_text: str) -> List[str]:
        """Extract skills based on context and surrounding words"""
        skills = []

        # Look for skill mentions with qualifiers
        context_patterns = [
            r'(?:proficient|experienced|skilled|expert|advanced|intermediate|beginner)\s+in\s+([a-zA-Z\s+#]+)',
            r'(?:knowledge|experience|understanding)\s+of\s+([a-zA-Z\s+#]+)',
            r'(?:strong|solid|good|excellent)\s+([a-zA-Z\s+#]+)\s+skills?',
            r'([a-zA-Z\s+#]+)\s+(?:development|programming|engineering|design)',
        ]

        for pattern in context_patterns:
            matches = re.findall(pattern, original_text, re.IGNORECASE)
            for match in matches:
                skill = match.strip()
                if len(skill) > 2 and len(skill) < 50:
                    # Clean up the skill name
                    skill = re.sub(r'\s+', ' ', skill)
                    if skill not in skills:
                        skills.append(skill.title())

        return skills

    async def _filter_and_rank_skills(self, skills: List[str], text: str) -> List[str]:
        """Filter and rank extracted skills by relevance"""
        if not skills:
            return []

        # Remove duplicates and clean
        cleaned_skills = []
        seen = set()

        for skill in skills:
            # Clean skill name
            clean_skill = re.sub(r'\s+', ' ', skill.strip())
            clean_skill = clean_skill.title()

            if clean_skill and len(clean_skill) > 1 and clean_skill not in seen:
                cleaned_skills.append(clean_skill)
                seen.add(clean_skill)

        # Rank by relevance (simple frequency-based ranking)
        skill_scores = {}
        for skill in cleaned_skills:
            # Count occurrences in text
            count = text.count(skill.lower())
            if count == 0:
                # Try partial matching for compound skills
                words = skill.lower().split()
                count = sum(1 for word in words if word in text)

            skill_scores[skill] = count

        # Sort by score and return top skills
        ranked_skills = sorted(skill_scores.items(), key=lambda x: x[1], reverse=True)

        # Return all skills, but prioritize higher-scoring ones
        return [skill for skill, _ in ranked_skills]

    def _load_technical_skills(self) -> List[str]:
        """Load comprehensive list of technical skills"""
        return [
            # Programming Languages
            'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust',
            'PHP', 'Ruby', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl',
            'Bash', 'PowerShell', 'SQL', 'HTML', 'CSS', 'SASS', 'SCSS',

            # Frameworks & Libraries
            'React', 'Angular', 'Vue.js', 'Svelte', 'Next.js', 'Nuxt.js', 'Gatsby',
            'Express.js', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Laravel',
            'Ruby on Rails', '.NET', 'ASP.NET', 'TensorFlow', 'PyTorch', 'Keras',
            'Scikit-learn', 'Pandas', 'NumPy', 'Jupyter', 'Streamlit',

            # Databases
            'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra',
            'DynamoDB', 'Firebase', 'SQLite', 'Oracle', 'SQL Server', 'MariaDB',
            'CouchDB', 'Neo4j', 'InfluxDB', 'ClickHouse',

            # Cloud Platforms
            'AWS', 'Azure', 'Google Cloud', 'GCP', 'Heroku', 'DigitalOcean', 'Linode',
            'Vercel', 'Netlify', 'Cloudflare', 'AWS Lambda', 'Azure Functions',
            'Google Cloud Functions', 'AWS S3', 'Azure Blob Storage',

            # DevOps & Tools
            'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'GitHub Actions', 'Travis CI',
            'CircleCI', 'Terraform', 'Ansible', 'Puppet', 'Chef', 'Git', 'SVN',
            'Webpack', 'Babel', 'ESLint', 'Prettier', 'Jest', 'Cypress', 'Selenium',

            # Big Data & Analytics
            'Hadoop', 'Spark', 'Kafka', 'Airflow', 'Tableau', 'Power BI', 'Looker',
            'Snowflake', 'Redshift', 'BigQuery', 'Databricks', 'Apache Flink',

            # Mobile Development
            'React Native', 'Flutter', 'Xamarin', 'Ionic', 'Cordova', 'SwiftUI',
            'Jetpack Compose', 'Android SDK', 'iOS SDK',

            # Other Technologies
            'GraphQL', 'REST', 'gRPC', 'WebSocket', 'OAuth', 'JWT', 'Linux', 'Windows',
            'macOS', 'Nginx', 'Apache', 'RabbitMQ', 'ActiveMQ', 'ZeroMQ',
        ]

    def _load_soft_skills(self) -> List[str]:
        """Load list of soft skills"""
        return [
            'Communication', 'Leadership', 'Teamwork', 'Problem Solving',
            'Critical Thinking', 'Adaptability', 'Creativity', 'Time Management',
            'Project Management', 'Customer Service', 'Collaboration', 'Mentoring',
            'Analytical Skills', 'Attention to Detail', 'Flexibility', 'Emotional Intelligence',
            'Conflict Resolution', 'Decision Making', 'Strategic Planning', 'Negotiation',
            'Presentation Skills', 'Public Speaking', 'Networking', 'Relationship Building',
            'Self-Motivation', 'Work Ethic', 'Reliability', 'Accountability',
            'Continuous Learning', 'Openness to Feedback', 'Cultural Awareness',
            'Change Management', 'Crisis Management', 'Risk Assessment',
        ]

    def _load_skill_patterns(self) -> Dict[str, List[str]]:
        """Load regex patterns for skill extraction"""
        return {
            # Programming patterns
            'JavaScript': [r'\bjs\b', r'javascript', r'es6', r'es2015'],
            'TypeScript': [r'typescript', r'\bts\b'],
            'Python': [r'python', r'\bpy\b'],
            'Java': [r'\bjava\b(?!script)'],
            'C++': [r'c\+\+', r'cpp'],
            'C#': [r'c#', r'csharp'],

            # Framework patterns
            'React': [r'react', r'reactjs', r'react\.js'],
            'Angular': [r'angular', r'angularjs'],
            'Vue.js': [r'vue', r'vue\.js'],
            'Django': [r'django'],
            'Flask': [r'flask'],
            'Express.js': [r'express', r'express\.js'],

            # Database patterns
            'PostgreSQL': [r'postgres', r'postgresql'],
            'MongoDB': [r'mongodb', r'mongo'],
            'Redis': [r'redis'],
            'MySQL': [r'mysql'],

            # Cloud patterns
            'AWS': [r'amazon web services', r'aws'],
            'Azure': [r'microsoft azure', r'azure'],
            'Google Cloud': [r'google cloud', r'gcp'],

            # DevOps patterns
            'Docker': [r'docker'],
            'Kubernetes': [r'kubernetes', r'k8s'],
            'Jenkins': [r'jenkins'],
            'Terraform': [r'terraform'],

            # Data Science patterns
            'Machine Learning': [r'machine learning', r'ml'],
            'Deep Learning': [r'deep learning'],
            'Natural Language Processing': [r'nlp', r'natural language processing'],
            'Computer Vision': [r'computer vision', r'cv'],
        }

    async def categorize_skills(self, skills: List[str]) -> Dict[str, List[str]]:
        """Categorize skills into different categories"""
        categories = {
            'programming_languages': [],
            'frameworks': [],
            'databases': [],
            'cloud_platforms': [],
            'tools': [],
            'soft_skills': [],
            'other': [],
        }

        # Programming languages
        programming_languages = [
            'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust',
            'PHP', 'Ruby', 'Swift', 'Kotlin', 'Scala', 'R', 'Perl', 'Bash'
        ]

        # Frameworks
        frameworks = [
            'React', 'Angular', 'Vue.js', 'Django', 'Flask', 'Express.js', 'Spring Boot',
            'Laravel', 'Ruby on Rails', '.NET', 'ASP.NET'
        ]

        # Databases
        databases = [
            'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Oracle'
        ]

        # Cloud platforms
        cloud_platforms = [
            'AWS', 'Azure', 'Google Cloud', 'Heroku', 'DigitalOcean'
        ]

        # Tools
        tools = [
            'Docker', 'Kubernetes', 'Jenkins', 'Git', 'Webpack', 'Jest'
        ]

        for skill in skills:
            skill_lower = skill.lower()

            if any(lang.lower() in skill_lower for lang in programming_languages):
                categories['programming_languages'].append(skill)
            elif any(fw.lower() in skill_lower for fw in frameworks):
                categories['frameworks'].append(skill)
            elif any(db.lower() in skill_lower for db in databases):
                categories['databases'].append(skill)
            elif any(cloud.lower() in skill_lower for cloud in cloud_platforms):
                categories['cloud_platforms'].append(skill)
            elif any(tool.lower() in skill_lower for tool in tools):
                categories['tools'].append(skill)
            elif skill in self.soft_skills:
                categories['soft_skills'].append(skill)
            else:
                categories['other'].append(skill)

        return categories

    async def get_skill_synonyms(self, skill: str) -> List[str]:
        """Get synonyms or alternative names for a skill"""
        synonyms = {
            'JavaScript': ['JS', 'ECMAScript'],
            'TypeScript': ['TS'],
            'Python': ['Py'],
            'PostgreSQL': ['Postgres'],
            'MongoDB': ['Mongo'],
            'Kubernetes': ['K8s'],
            'Machine Learning': ['ML'],
            'Artificial Intelligence': ['AI'],
        }

        return synonyms.get(skill, [])

    async def validate_skill(self, skill: str) -> bool:
        """Validate if a skill name is legitimate"""
        # Basic validation rules
        if len(skill) < 2 or len(skill) > 50:
            return False

        # Should not contain too many numbers
        if len(re.findall(r'\d', skill)) > len(skill) * 0.3:
            return False

        # Should not be just punctuation
        if re.match(r'^[^\w]+$', skill):
            return False

        # Should not contain excessive whitespace
        if re.search(r'\s{3,}', skill):
            return False

        return True
