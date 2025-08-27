"""
Resume Parser
Main orchestrator for parsing resume documents and extracting structured information.
"""

import re
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import asyncio

from .document_processor import DocumentProcessor
from .nlp_processor import NLPProcessor
from .skill_extractor import SkillExtractor
from .experience_extractor import ExperienceExtractor
from .education_extractor import EducationExtractor

logger = logging.getLogger(__name__)

@dataclass
class ParsedResumeResult:
    """Result of parsing a resume"""
    resume_id: str
    filename: Optional[str] = None
    contact_info: Dict[str, Any] = None
    summary: Optional[str] = None
    skills: List[str] = None
    experience: List[Dict[str, Any]] = None
    education: List[Dict[str, Any]] = None
    certifications: List[Dict[str, Any]] = None
    projects: List[Dict[str, Any]] = None
    languages: List[str] = None
    awards: List[Dict[str, Any]] = None
    publications: List[Dict[str, Any]] = None
    references: List[Dict[str, Any]] = None
    sections_found: List[str] = None
    quality_score: float = 0.0
    word_count: int = 0
    confidence_scores: Dict[str, float] = None

    def __post_init__(self):
        if self.contact_info is None:
            self.contact_info = {}
        if self.skills is None:
            self.skills = []
        if self.experience is None:
            self.experience = []
        if self.education is None:
            self.education = []
        if self.certifications is None:
            self.certifications = []
        if self.projects is None:
            self.projects = []
        if self.languages is None:
            self.languages = []
        if self.awards is None:
            self.awards = []
        if self.publications is None:
            self.publications = []
        if self.references is None:
            self.references = []
        if self.sections_found is None:
            self.sections_found = []
        if self.confidence_scores is None:
            self.confidence_scores = {}

class ResumeParser:
    """Main parser for resume documents using NLP and ML techniques"""

    def __init__(
        self,
        document_processor: DocumentProcessor,
        nlp_processor: NLPProcessor,
        skill_extractor: SkillExtractor,
        experience_extractor: ExperienceExtractor,
        education_extractor: EducationExtractor,
    ):
        self.document_processor = document_processor
        self.nlp_processor = nlp_processor
        self.skill_extractor = skill_extractor
        self.experience_extractor = experience_extractor
        self.education_extractor = education_extractor

        # Common resume sections
        self.section_headers = {
            'contact': [
                'contact', 'contact information', 'personal information',
                'name', 'address', 'phone', 'email'
            ],
            'summary': [
                'summary', 'objective', 'professional summary', 'profile',
                'about', 'overview', 'introduction'
            ],
            'experience': [
                'experience', 'work experience', 'employment', 'work history',
                'professional experience', 'career history'
            ],
            'education': [
                'education', 'academic background', 'educational background',
                'degree', 'university', 'college', 'school'
            ],
            'skills': [
                'skills', 'technical skills', 'competencies', 'expertise',
                'technologies', 'languages', 'frameworks', 'tools'
            ],
            'projects': [
                'projects', 'personal projects', 'professional projects',
                'portfolio', 'key projects', 'notable projects'
            ],
            'certifications': [
                'certifications', 'certificates', 'credentials', 'licenses',
                'qualifications', 'awards', 'achievements'
            ],
            'languages': [
                'languages', 'language skills', 'linguistic abilities'
            ],
            'awards': [
                'awards', 'honors', 'achievements', 'recognition', 'scholarships'
            ],
            'publications': [
                'publications', 'papers', 'articles', 'research', 'presentations'
            ],
            'references': [
                'references', 'referees', 'recommendations', 'contacts'
            ],
        }

    async def parse(
        self,
        resume_id: str,
        content: str,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
    ) -> ParsedResumeResult:
        """
        Parse a resume and extract structured information.

        Args:
            resume_id: Unique identifier for the resume
            content: Resume text content
            filename: Original filename (optional)
            content_type: Content type (optional)

        Returns:
            ParsedResumeResult with extracted information
        """
        logger.info(f"Starting to parse resume {resume_id}")

        # Clean and preprocess the content
        cleaned_content = self._clean_resume_text(content)

        # Identify sections
        sections = await self._identify_sections(cleaned_content)

        # Extract information concurrently
        tasks = [
            self.extract_contact_info(cleaned_content),
            self.extract_summary(cleaned_content, sections),
            self.skill_extractor.extract_skills(cleaned_content),
            self.experience_extractor.extract_experience(cleaned_content, sections.get('experience', '')),
            self.education_extractor.extract_education(cleaned_content, sections.get('education', '')),
            self.extract_certifications(cleaned_content, sections),
            self.extract_projects(cleaned_content, sections),
            self.extract_languages(cleaned_content, sections),
            self.extract_awards(cleaned_content, sections),
            self.extract_publications(cleaned_content, sections),
            self.extract_references(cleaned_content, sections),
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle results
        contact_info = results[0] if not isinstance(results[0], Exception) else {}
        summary = results[1] if not isinstance(results[1], Exception) else None
        skills = results[2] if not isinstance(results[2], Exception) else []
        experience = results[3] if not isinstance(results[3], Exception) else []
        education = results[4] if not isinstance(results[4], Exception) else []
        certifications = results[5] if not isinstance(results[5], Exception) else []
        projects = results[6] if not isinstance(results[6], Exception) else []
        languages = results[7] if not isinstance(results[7], Exception) else []
        awards = results[8] if not isinstance(results[8], Exception) else []
        publications = results[9] if not isinstance(results[9], Exception) else []
        references = results[10] if not isinstance(results[10], Exception) else []

        # Calculate quality score and confidence
        quality_score = await self.score_resume_quality(cleaned_content, sections, skills, experience, education)
        confidence_scores = self._calculate_confidence_scores(
            contact_info, skills, experience, education, sections
        )

        result = ParsedResumeResult(
            resume_id=resume_id,
            filename=filename,
            contact_info=contact_info,
            summary=summary,
            skills=skills,
            experience=experience,
            education=education,
            certifications=certifications,
            projects=projects,
            languages=languages,
            awards=awards,
            publications=publications,
            references=references,
            sections_found=list(sections.keys()),
            quality_score=quality_score,
            word_count=len(cleaned_content.split()),
            confidence_scores=confidence_scores,
        )

        logger.info(f"Completed parsing resume {resume_id}")
        return result

    def _clean_resume_text(self, text: str) -> str:
        """Clean and normalize resume text"""
        if not text:
            return ""

        # Remove excessive whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())

        # Fix common resume formatting issues
        text = re.sub(r'([a-zA-Z])\s*([.,!?])', r'\1\2', text)  # Fix punctuation spacing
        text = re.sub(r'([.,!?])\s*([a-zA-Z])', r'\1 \2', text)  # Add spaces after punctuation

        # Normalize bullet points
        text = re.sub(r'[•●○▪▫♦]', '•', text)

        # Remove excessive line breaks but preserve paragraph structure
        text = re.sub(r'\n{3,}', '\n\n', text)

        return text

    async def _identify_sections(self, text: str) -> Dict[str, str]:
        """Identify and extract different sections from the resume"""
        sections = {}
        lines = text.split('\n')

        current_section = None
        current_content = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Check if this line is a section header
            section_type = self._is_section_header(line.lower())
            if section_type:
                # Save previous section
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()

                # Start new section
                current_section = section_type
                current_content = []
            elif current_section:
                # Add content to current section
                current_content.append(line)

        # Save the last section
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()

        return sections

    def _is_section_header(self, line: str) -> Optional[str]:
        """Check if a line is a section header"""
        for section_type, headers in self.section_headers.items():
            for header in headers:
                # Use word boundaries and be flexible with formatting
                if re.search(r'\b' + re.escape(header) + r'\b', line, re.IGNORECASE):
                    return section_type

        return None

    async def extract_contact_info(self, text: str) -> Dict[str, Any]:
        """Extract contact information from resume"""
        contact_info = {}

        # Extract email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        email_match = re.search(email_pattern, text)
        if email_match:
            contact_info['email'] = email_match.group()

        # Extract phone numbers (various formats)
        phone_patterns = [
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
            r'\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b',
            r'\b\d{3}\s\d{3}\s\d{4}\b',
            r'\+\d{1,3}\s?\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        ]

        for pattern in phone_patterns:
            phone_match = re.search(pattern, text)
            if phone_match:
                contact_info['phone'] = phone_match.group()
                break

        # Extract name (usually at the top)
        lines = text.split('\n')[:5]  # Check first few lines
        for line in lines:
            line = line.strip()
            if line and not '@' in line and not re.search(r'\d', line):
                # Simple heuristic: line with 2-4 words, no email/phone
                words = line.split()
                if 2 <= len(words) <= 4 and all(len(word) > 1 for word in words):
                    contact_info['name'] = line.title()
                    break

        # Extract LinkedIn/GitHub profiles
        linkedin_pattern = r'linkedin\.com/in/([^\s/]+)'
        linkedin_match = re.search(linkedin_pattern, text, re.IGNORECASE)
        if linkedin_match:
            contact_info['linkedin'] = linkedin_match.group()

        github_pattern = r'github\.com/([^\s/]+)'
        github_match = re.search(github_pattern, text, re.IGNORECASE)
        if github_match:
            contact_info['github'] = github_match.group()

        # Extract address (more complex, look for city, state patterns)
        address_patterns = [
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\s*(\d{5})?\b',
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)\b',
        ]

        for pattern in address_patterns:
            address_match = re.search(pattern, text)
            if address_match:
                contact_info['location'] = address_match.group()
                break

        return contact_info

    async def extract_summary(self, text: str, sections: Dict[str, str]) -> Optional[str]:
        """Extract professional summary/objective"""
        # Check if there's a dedicated summary section
        if 'summary' in sections:
            summary = sections['summary']
            # Clean up and limit length
            summary = re.sub(r'\s+', ' ', summary.strip())
            if len(summary) > 500:
                summary = summary[:500] + '...'
            return summary

        # Try to find summary-like content at the beginning
        lines = text.split('\n')[:10]  # Check first 10 lines
        potential_summary = []

        for line in lines:
            line = line.strip()
            if line and len(line) > 20 and not self._is_section_header(line.lower()):
                potential_summary.append(line)
                if len(' '.join(potential_summary)) > 200:
                    break

        if potential_summary:
            summary = ' '.join(potential_summary)
            if len(summary) > 500:
                summary = summary[:500] + '...'
            return summary

        return None

    async def extract_certifications(self, text: str, sections: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract certifications and credentials"""
        certifications = []

        # Check dedicated certifications section
        cert_text = sections.get('certifications', '') + sections.get('awards', '')

        # Look for certification patterns
        cert_patterns = [
            r'([A-Z][A-Za-z\s,&]+(?:Certification|Certificate|License|Diploma|Accreditation))\s*(?:\(|-|by\s+)([A-Za-z\s,&]+?)(?:\)|$|\n)',
            r'Certified\s+in\s+([A-Za-z\s,&]+?)(?:\s*\(|$|\n)',
            r'([A-Z][A-Za-z\s,&]+)\s+Certification',
        ]

        for pattern in cert_patterns:
            matches = re.finditer(pattern, cert_text, re.IGNORECASE)
            for match in matches:
                cert_name = match.group(1).strip().title()
                issuer = match.group(2).strip().title() if len(match.groups()) > 1 and match.group(2) else None

                if cert_name and len(cert_name) > 3:
                    certifications.append({
                        'name': cert_name,
                        'issuer': issuer,
                        'type': 'certification',
                    })

        return certifications[:10]  # Limit to top 10

    async def extract_projects(self, text: str, sections: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract projects and portfolio items"""
        projects = []

        # Check dedicated projects section
        project_text = sections.get('projects', '')

        # Look for project patterns
        project_patterns = [
            r'([A-Z][A-Za-z\s,&]+?)(?:\s*[-–]\s*)([A-Za-z\s,&]+?)(?:\s*\(|$|\n)',
            r'([A-Z][A-Za-z\s,&]+?)\s*:\s*([A-Za-z\s,&]+?)(?:\s*\(|$|\n)',
        ]

        for pattern in project_patterns:
            matches = re.finditer(pattern, project_text, re.DOTALL)
            for match in matches:
                project_name = match.group(1).strip()
                description = match.group(2).strip() if len(match.groups()) > 1 else ""

                if project_name and len(project_name) > 3:
                    projects.append({
                        'name': project_name.title(),
                        'description': description,
                        'type': 'project',
                    })

        return projects[:8]  # Limit to top 8

    async def extract_languages(self, text: str, sections: Dict[str, str]) -> List[str]:
        """Extract language skills"""
        languages = []

        # Check dedicated languages section
        lang_text = sections.get('languages', '')

        # Common languages
        common_languages = [
            'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
            'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian',
            'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish',
        ]

        for language in common_languages:
            if language.lower() in lang_text.lower() or language.lower() in text.lower():
                languages.append(language)

        # Look for proficiency levels
        proficiency_patterns = [
            r'([A-Za-z]+)\s*\(\s*(native|fluent|proficient|intermediate|beginner|conversational)\s*\)',
            r'([A-Za-z]+)\s*:\s*(native|fluent|proficient|intermediate|beginner|conversational)',
        ]

        for pattern in proficiency_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                lang = match.group(1).title()
                level = match.group(2).title()
                if lang not in [l for l in languages if l != lang]:
                    languages.append(f"{lang} ({level})")

        return languages[:5]  # Limit to top 5

    async def extract_awards(self, text: str, sections: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract awards and honors"""
        awards = []

        # Check awards section
        award_text = sections.get('awards', '') + sections.get('certifications', '')

        # Look for award patterns
        award_patterns = [
            r'([A-Z][A-Za-z\s,&]+?(?:Award|Prize|Honor|Scholarship|Grant))\s*(?:\(|-|by\s+)([A-Za-z\s,&]+?)(?:\)|$|\n)',
            r'([A-Z][A-Za-z\s,&]+?)\s+Award',
            r'Received\s+([A-Za-z\s,&]+?)(?:\s+award|\s+prize|\s+honor)',
        ]

        for pattern in award_patterns:
            matches = re.finditer(pattern, award_text, re.IGNORECASE)
            for match in matches:
                award_name = match.group(1).strip().title()
                organization = match.group(2).strip().title() if len(match.groups()) > 1 and match.group(2) else None

                if award_name and len(award_name) > 3:
                    awards.append({
                        'name': award_name,
                        'organization': organization,
                        'type': 'award',
                    })

        return awards[:5]  # Limit to top 5

    async def extract_publications(self, text: str, sections: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract publications and research"""
        publications = []

        # Check publications section
        pub_text = sections.get('publications', '')

        # Look for publication patterns
        pub_patterns = [
            r'"([^"]+)"\s*,?\s*([A-Za-z\s,&]+?)(?:\s*,?\s*(\d{4}))?',
            r'([A-Z][A-Za-z\s,&]+?)\s*,?\s*([A-Za-z\s,&]+?)(?:\s*,?\s*(\d{4}))?',
        ]

        for pattern in pub_patterns:
            matches = re.finditer(pattern, pub_text, re.DOTALL)
            for match in matches:
                title = match.group(1).strip()
                publication = match.group(2).strip() if len(match.groups()) > 1 else None
                year = match.group(3) if len(match.groups()) > 2 and match.group(3) else None

                if title and len(title) > 10:
                    publications.append({
                        'title': title,
                        'publication': publication,
                        'year': year,
                        'type': 'publication',
                    })

        return publications[:5]  # Limit to top 5

    async def extract_references(self, text: str, sections: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract references"""
        references = []

        # Check references section
        ref_text = sections.get('references', '')

        # Look for reference patterns
        ref_patterns = [
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,?\s*([^,\n]{1,50})?,?\s*([^,\n]{1,50})?',
            r'([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[-–]\s*([A-Za-z\s,&]+)',
        ]

        for pattern in ref_patterns:
            matches = re.finditer(pattern, ref_text)
            for match in matches:
                name = match.group(1).strip()
                title = match.group(2).strip() if len(match.groups()) > 1 and match.group(2) else None
                company = match.group(3).strip() if len(match.groups()) > 2 and match.group(3) else None

                if name and len(name.split()) >= 2:
                    references.append({
                        'name': name,
                        'title': title,
                        'company': company,
                        'type': 'reference',
                    })

        return references[:3]  # Limit to top 3

    async def score_resume_quality(
        self,
        text: str,
        sections: Dict[str, str],
        skills: List[str],
        experience: List[Dict[str, Any]],
        education: List[Dict[str, Any]],
    ) -> float:
        """Score resume quality on a scale of 0-100"""
        score = 0
        max_score = 100

        # Section completeness (25 points)
        required_sections = ['contact', 'summary', 'experience', 'education', 'skills']
        found_sections = [s for s in required_sections if s in sections]
        score += (len(found_sections) / len(required_sections)) * 25

        # Content length (15 points)
        word_count = len(text.split())
        if word_count > 600:
            score += 15
        elif word_count > 400:
            score += 10
        elif word_count > 200:
            score += 5

        # Skills count (20 points)
        if len(skills) > 15:
            score += 20
        elif len(skills) > 10:
            score += 15
        elif len(skills) > 5:
            score += 10
        elif len(skills) > 2:
            score += 5

        # Experience details (20 points)
        if experience:
            exp_score = 0
            for exp in experience[:3]:  # Check first 3 experiences
                if exp.get('company') and exp.get('position'):
                    exp_score += 5
                if exp.get('description'):
                    exp_score += 3
                if exp.get('start_date') and exp.get('end_date'):
                    exp_score += 2
            score += min(exp_score, 20)

        # Education details (10 points)
        if education:
            edu_score = 0
            for edu in education[:2]:  # Check first 2 educations
                if edu.get('institution') and edu.get('degree'):
                    edu_score += 5
            score += min(edu_score, 10)

        # Contact information (5 points)
        contact_info = await self.extract_contact_info(text)
        if contact_info.get('email'):
            score += 2.5
        if contact_info.get('phone'):
            score += 2.5

        # Formatting quality (5 points)
        if re.search(r'\n\n', text):  # Has paragraph breaks
            score += 2.5
        if re.search(r'[•●○▪▫♦]', text):  # Has bullet points
            score += 2.5

        return min(score, max_score)

    def _calculate_confidence_scores(
        self,
        contact_info: Dict[str, Any],
        skills: List[str],
        experience: List[Dict[str, Any]],
        education: List[Dict[str, Any]],
        sections: Dict[str, str],
    ) -> Dict[str, float]:
        """Calculate confidence scores for different extraction types"""
        scores = {}

        # Contact info confidence
        contact_score = 0
        if contact_info.get('email'):
            contact_score += 0.4
        if contact_info.get('phone'):
            contact_score += 0.4
        if contact_info.get('name'):
            contact_score += 0.2
        scores['contact'] = min(contact_score, 1.0)

        # Skills confidence based on count and specificity
        if skills:
            avg_skill_length = sum(len(skill) for skill in skills) / len(skills)
            skills_confidence = min(len(skills) / 10, 1.0) * (avg_skill_length / 20)
            scores['skills'] = min(skills_confidence, 1.0)
        else:
            scores['skills'] = 0.0

        # Experience confidence
        if experience:
            exp_confidence = 0
            for exp in experience:
                if exp.get('company') and exp.get('position'):
                    exp_confidence += 1
            scores['experience'] = min(exp_confidence / len(experience), 1.0)
        else:
            scores['experience'] = 0.0

        # Education confidence
        if education:
            edu_confidence = 0
            for edu in education:
                if edu.get('institution') and edu.get('degree'):
                    edu_confidence += 1
            scores['education'] = min(edu_confidence / len(education), 1.0)
        else:
            scores['education'] = 0.0

        # Overall confidence
        scores['overall'] = sum(scores.values()) / len(scores)

        return scores
