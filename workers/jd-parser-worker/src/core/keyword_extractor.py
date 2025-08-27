"""
Keyword Extractor
Extracts important keywords and key phrases from job descriptions using NLP techniques.
"""

import re
import logging
from typing import List, Dict, Tuple, Set
from collections import Counter
import asyncio
from functools import lru_cache

logger = logging.getLogger(__name__)

class KeywordExtractor:
    """Extracts keywords and key phrases from job descriptions"""

    def __init__(self):
        self.common_words = self._load_common_words()
        self.industry_terms = self._load_industry_terms()
        self.phrase_patterns = self._load_phrase_patterns()

    async def extract_keywords(self, text: str, max_keywords: int = 15) -> List[str]:
        """
        Extract keywords from job description text

        Args:
            text: Job description text
            max_keywords: Maximum number of keywords to extract

        Returns:
            List of extracted keywords
        """
        if not text:
            return []

        # Extract different types of keywords
        single_keywords = await self._extract_single_keywords(text)
        phrase_keywords = await self._extract_phrase_keywords(text)
        industry_keywords = await self._extract_industry_keywords(text)

        # Combine and rank all keywords
        all_keywords = set(single_keywords + phrase_keywords + industry_keywords)
        ranked_keywords = await self._rank_keywords(list(all_keywords), text)

        # Return top keywords
        top_keywords = ranked_keywords[:max_keywords]

        logger.info(f"Extracted {len(top_keywords)} keywords from job description")

        return top_keywords

    async def _extract_single_keywords(self, text: str) -> List[str]:
        """Extract single word keywords"""
        # Clean and tokenize text
        cleaned_text = re.sub(r'[^\w\s]', ' ', text.lower())
        words = re.findall(r'\b\w{4,}\b', cleaned_text)  # Words with 4+ characters

        # Remove common words
        filtered_words = [word for word in words if word not in self.common_words]

        # Count frequency
        word_freq = Counter(filtered_words)

        # Return most common words
        return [word for word, _ in word_freq.most_common(20)]

    async def _extract_phrase_keywords(self, text: str) -> List[str]:
        """Extract multi-word phrases and key terms"""
        phrases = []

        # Extract noun phrases using patterns
        for pattern_name, pattern in self.phrase_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                phrase = match.strip()
                if len(phrase) > 6 and len(phrase) < 50:  # Reasonable length
                    phrases.append(phrase.title())

        # Extract technical terms
        technical_patterns = [
            r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b',  # Title Case terms
            r'\b[a-z]+(?:[-][a-z]+)+\b',  # Hyphenated terms
            r'\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b',  # Acronyms
        ]

        for pattern in technical_patterns:
            matches = re.findall(pattern, text)
            phrases.extend([match.title() for match in matches if len(match) > 2])

        # Remove duplicates and clean
        unique_phrases = list(set(phrases))
        return unique_phrases

    async def _extract_industry_keywords(self, text: str) -> List[str]:
        """Extract industry-specific keywords"""
        keywords = []

        for term in self.industry_terms:
            if term.lower() in text.lower():
                keywords.append(term)

        return keywords

    async def _rank_keywords(self, keywords: List[str], text: str) -> List[str]:
        """Rank keywords by relevance and importance"""
        if not keywords:
            return []

        # Calculate relevance scores
        keyword_scores = {}
        text_lower = text.lower()

        for keyword in keywords:
            score = 0
            keyword_lower = keyword.lower()

            # Base frequency score
            frequency = text_lower.count(keyword_lower)
            score += frequency

            # Length bonus (prefer longer, more specific terms)
            word_count = len(keyword.split())
            if word_count > 1:
                score += word_count * 0.5

            # Position bonus (keywords appearing earlier are more important)
            first_occurrence = text_lower.find(keyword_lower)
            if first_occurrence >= 0:
                position_bonus = max(0, 1000 - first_occurrence) / 100
                score += position_bonus

            # Capitalization bonus (proper nouns, titles)
            if keyword[0].isupper() and len(keyword) > 3:
                score += 0.3

            # Technical term bonus
            if any(char in keyword for char in ['#', '+', '.', '-']):
                score += 0.5

            keyword_scores[keyword] = score

        # Sort by score and return
        ranked_keywords = sorted(keyword_scores.items(), key=lambda x: x[1], reverse=True)
        return [keyword for keyword, _ in ranked_keywords]

    def _load_common_words(self) -> Set[str]:
        """Load common words to filter out"""
        return {
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
            'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its',
            'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its',
            'let', 'put', 'say', 'she', 'too', 'use', 'work', 'year', 'about', 'after',
            'back', 'been', 'call', 'come', 'each', 'find', 'give', 'good', 'hand', 'have',
            'here', 'home', 'just', 'keep', 'kind', 'know', 'last', 'left', 'life', 'live',
            'look', 'made', 'make', 'many', 'most', 'move', 'much', 'name', 'need', 'next',
            'only', 'open', 'over', 'part', 'play', 'right', 'same', 'seem', 'show', 'side',
            'take', 'tell', 'that', 'them', 'then', 'they', 'this', 'time', 'want', 'well',
            'went', 'were', 'what', 'when', 'will', 'with', 'word', 'work', 'year', 'your',
            'team', 'company', 'business', 'project', 'client', 'customer', 'product',
            'service', 'system', 'process', 'management', 'development', 'design',
            'application', 'software', 'solution', 'platform', 'technology', 'data',
            'information', 'experience', 'skill', 'ability', 'knowledge', 'understanding',
            'responsibility', 'requirement', 'opportunity', 'position', 'role', 'job',
            'candidate', 'employee', 'organization', 'department', 'office', 'location',
            'remote', 'flexible', 'full-time', 'part-time', 'contract', 'temporary',
            'permanent', 'excellent', 'strong', 'good', 'great', 'best', 'high', 'low',
            'new', 'current', 'previous', 'future', 'long-term', 'short-term', 'daily',
            'weekly', 'monthly', 'yearly', 'annual', 'quarterly', 'regular', 'frequent',
            'occasional', 'immediate', 'urgent', 'important', 'critical', 'essential',
            'required', 'necessary', 'optional', 'preferred', 'desired', 'ideal',
        }

    def _load_industry_terms(self) -> List[str]:
        """Load industry-specific terms"""
        return [
            # Tech Industry
            'Artificial Intelligence', 'Machine Learning', 'Deep Learning',
            'Natural Language Processing', 'Computer Vision', 'Data Science',
            'Big Data', 'Cloud Computing', 'DevOps', 'Agile Methodology',
            'Scrum', 'Kanban', 'Microservices', 'API', 'REST', 'GraphQL',
            'Containerization', 'Orchestration', 'CI/CD', 'Version Control',

            # Business Terms
            'Business Intelligence', 'Data Analytics', 'Digital Transformation',
            'Customer Experience', 'User Experience', 'Product Management',
            'Project Management', 'Quality Assurance', 'Risk Management',
            'Change Management', 'Stakeholder Management', 'Strategic Planning',

            # Technical Skills
            'Software Development', 'Web Development', 'Mobile Development',
            'Database Administration', 'System Administration', 'Network Engineering',
            'Security Engineering', 'Quality Engineering', 'Performance Engineering',
            'Technical Architecture', 'Solution Architecture', 'Enterprise Architecture',

            # Domain Expertise
            'Financial Services', 'Healthcare', 'E-commerce', 'Education',
            'Manufacturing', 'Retail', 'Logistics', 'Real Estate', 'Insurance',
            'Telecommunications', 'Energy', 'Utilities', 'Government', 'Non-profit',
        ]

    def _load_phrase_patterns(self) -> Dict[str, str]:
        """Load regex patterns for extracting phrases"""
        return {
            'technical_skills': r'\b(?:proficient|experienced|skilled|expert|advanced|intermediate)\s+in\s+([A-Za-z\s+#.]+?)(?:\s*,|\s*and|\s*or|\s*with|\s*for|\s*\.|\s*$)',
            'tools_frameworks': r'\b(?:experience|knowledge|understanding)\s+(?:with|of|using)\s+([A-Za-z\s+#.]+?)(?:\s*,|\s*and|\s*or|\s*including|\s*\.|\s*$)',
            'responsibilities': r'\b(?:responsible|accountable)\s+for\s+([A-Za-z\s]+?)(?:\s*,|\s*and|\s*or|\s*including|\s*\.|\s*$)',
            'qualifications': r'\b(?:must|should|required|preferred)\s+(?:have|possess|demonstrate)\s+([A-Za-z\s]+?)(?:\s*,|\s*and|\s*or|\s*including|\s*\.|\s*$)',
            'technical_terms': r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b',
            'acronyms': r'\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b',
        }

    async def extract_key_phrases(self, text: str) -> List[str]:
        """Extract key phrases using advanced NLP techniques"""
        # This would use more sophisticated NLP for phrase extraction
        # For now, use pattern-based extraction
        phrases = []

        # Extract phrases with specific patterns
        patterns = [
            r'\b\d+\+?\s+(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp\.?)\s+(?:in|with)\s+([A-Za-z\s]+?)(?:\s*,|\s*and|\s*or|\s*$)',
            r'\b(?:bachelor|master|doctorate)\s*(?:of\s+)?(?:science|arts|engineering|business)\s+(?:in\s+)?([A-Za-z\s]+?)(?:\s*,|\s*and|\s*or|\s*$)',
            r'\b(?:certified|certification)\s+in\s+([A-Za-z\s]+?)(?:\s*,|\s*and|\s*or|\s*$)',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            phrases.extend([match.title() for match in matches if len(match.strip()) > 3])

        return list(set(phrases))  # Remove duplicates

    async def calculate_keyword_relevance(self, keyword: str, text: str) -> float:
        """Calculate how relevant a keyword is to the text"""
        keyword_lower = keyword.lower()
        text_lower = text.lower()

        # Frequency score
        frequency = text_lower.count(keyword_lower)
        if frequency == 0:
            return 0.0

        # Length score (longer keywords are generally more specific)
        length_score = min(len(keyword) / 50, 1.0)

        # Position score (keywords appearing earlier are more important)
        first_position = text_lower.find(keyword_lower)
        position_score = max(0, 1 - (first_position / len(text))) if first_position >= 0 else 0

        # Uniqueness score (keywords that appear less frequently are more unique)
        total_words = len(text.split())
        uniqueness_score = min(frequency / total_words, 1.0)

        # Combine scores
        relevance = (frequency * 0.4) + (length_score * 0.3) + (position_score * 0.2) + (uniqueness_score * 0.1)

        return min(relevance, 1.0)

    async def get_keyword_context(self, keyword: str, text: str, context_window: int = 50) -> List[str]:
        """Get context around keyword occurrences"""
        contexts = []
        keyword_lower = keyword.lower()
        text_lower = text.lower()

        start = 0
        while True:
            pos = text_lower.find(keyword_lower, start)
            if pos == -1:
                break

            # Extract context around the keyword
            start_idx = max(0, pos - context_window)
            end_idx = min(len(text), pos + len(keyword) + context_window)

            context = text[start_idx:end_idx]
            contexts.append(context.strip())

            start = pos + 1

        return contexts

    async def extract_entities(self, text: str) -> List[Tuple[str, str]]:
        """Extract named entities from text"""
        # This would use NER (Named Entity Recognition) models
        # For now, use simple pattern-based extraction
        entities = []

        # Extract email addresses
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        entities.extend([(email, 'EMAIL') for email in emails])

        # Extract URLs
        urls = re.findall(r'https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:\w*))*)?', text)
        entities.extend([(url, 'URL') for url in urls])

        # Extract phone numbers (basic pattern)
        phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text)
        entities.extend([(phone, 'PHONE') for phone in phones])

        return entities
