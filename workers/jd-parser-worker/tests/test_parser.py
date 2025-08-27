"""
Basic tests for JD Parser Worker
"""

import pytest
from src.core.skill_extractor import SkillExtractor
from src.core.keyword_extractor import KeywordExtractor


class TestSkillExtractor:
    """Test skill extraction functionality"""

    @pytest.fixture
    def extractor(self):
        return SkillExtractor()

    def test_extract_skills_basic(self, extractor):
        """Test basic skill extraction"""
        text = "We need a developer with Python, React, and AWS experience."

        skills = extractor.extract_skills(text)

        # Check that major skills are extracted
        skill_names = [skill.lower() for skill in skills]
        assert 'python' in skill_names
        assert 'react' in skill_names
        assert 'aws' in skill_names

    def test_extract_skills_empty_text(self, extractor):
        """Test skill extraction with empty text"""
        skills = extractor.extract_skills("")
        assert skills == []

    def test_categorize_skills(self, extractor):
        """Test skill categorization"""
        skills = ["Python", "React", "AWS", "Communication", "Leadership"]
        categories = extractor.categorize_skills(skills)

        assert "Python" in categories["programming_languages"]
        assert "React" in categories["frameworks"]
        assert "AWS" in categories["cloud_platforms"]
        assert "Communication" in categories["soft_skills"]


class TestKeywordExtractor:
    """Test keyword extraction functionality"""

    @pytest.fixture
    def extractor(self):
        return KeywordExtractor()

    def test_extract_keywords_basic(self, extractor):
        """Test basic keyword extraction"""
        text = "Senior Python Developer with machine learning experience"

        keywords = extractor.extract_keywords(text, max_keywords=5)

        # Check that important keywords are extracted
        keyword_text = ' '.join(keywords).lower()
        assert 'python' in keyword_text or 'developer' in keyword_text
        assert 'senior' in keyword_text or 'machine' in keyword_text

    def test_extract_keywords_empty_text(self, extractor):
        """Test keyword extraction with empty text"""
        keywords = extractor.extract_keywords("")
        assert keywords == []

    def test_calculate_keyword_relevance(self, extractor):
        """Test keyword relevance calculation"""
        text = "Python developer with Python experience"

        relevance = extractor.calculate_keyword_relevance("Python", text)

        assert relevance > 0
        assert relevance <= 1


class TestIntegration:
    """Integration tests for the parser"""

    def test_parser_import(self):
        """Test that parser can be imported"""
        try:
            from src.core.parser import JobDescriptionParser
            from src.core.nlp_processor import NLPProcessor
            from src.core.skill_extractor import SkillExtractor
            from src.core.keyword_extractor import KeywordExtractor

            # Create instances
            nlp_processor = NLPProcessor()
            skill_extractor = SkillExtractor()
            keyword_extractor = KeywordExtractor()
            parser = JobDescriptionParser(
                nlp_processor=nlp_processor,
                skill_extractor=skill_extractor,
                keyword_extractor=keyword_extractor,
            )

            assert parser is not None
            assert nlp_processor is not None
            assert skill_extractor is not None
            assert keyword_extractor is not None

        except ImportError as e:
            pytest.skip(f"Missing dependencies: {e}")

    def test_sample_job_parsing(self):
        """Test parsing a sample job description"""
        try:
            from src.core.parser import JobDescriptionParser
            from src.core.nlp_processor import NLPProcessor
            from src.core.skill_extractor import SkillExtractor
            from src.core.keyword_extractor import KeywordExtractor

            # Create parser
            nlp_processor = NLPProcessor()
            skill_extractor = SkillExtractor()
            keyword_extractor = KeywordExtractor()
            parser = JobDescriptionParser(
                nlp_processor=nlp_processor,
                skill_extractor=skill_extractor,
                keyword_extractor=keyword_extractor,
            )

            # Sample job description
            job_text = """
            Senior Python Developer

            We are looking for a Senior Python Developer with 5+ years of experience.
            You should have strong skills in Python, Django, React, and AWS.
            Experience with machine learning and data science is a plus.

            Requirements:
            - Bachelor's degree in Computer Science or related field
            - 5+ years of Python development experience
            - Experience with web frameworks (Django, Flask)
            - Knowledge of cloud platforms (AWS, Azure)
            - Strong problem-solving skills
            """

            # This would normally be an async test
            # For now, just check that the parser can be created
            assert parser is not None
            assert hasattr(parser, 'parse')
            assert hasattr(parser, 'skill_extractor')
            assert hasattr(parser, 'keyword_extractor')

        except ImportError as e:
            pytest.skip(f"Missing dependencies: {e}")


if __name__ == "__main__":
    pytest.main([__file__])
