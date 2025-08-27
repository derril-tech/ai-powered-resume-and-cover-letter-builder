"""
Experience Extractor
Extracts work experience information from resume text using NLP and pattern matching.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

class ExperienceExtractor:
    """Extracts work experience from resume text"""

    def __init__(self):
        # Month names for date parsing
        self.months = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
        }

        # Date patterns
        self.date_patterns = [
            r'(\w+)\s+(\d{4})\s*[-–]\s*(\w+)\s+(\d{4})',  # Jan 2020 - Dec 2021
            r'(\d{4})\s*[-–]\s*(\d{4})',  # 2020 - 2021
            r'(\w+)\s+(\d{4})\s*[-–]\s*Present',  # Jan 2020 - Present
            r'(\w+)\s+(\d{4})\s*[-–]\s*Current',  # Jan 2020 - Current
            r'(\d{1,2})/(\d{4})\s*[-–]\s*(\d{1,2})/(\d{4})',  # 01/2020 - 12/2021
            r'(\d{1,2})/(\d{2})\s*[-–]\s*(\d{1,2})/(\d{2})',  # 01/20 - 12/21
        ]

        # Job title patterns
        self.job_title_patterns = [
            r'^([A-Z][A-Za-z\s,&]+?)(?:\s*[-–]\s*|,\s*|at\s*|with\s*)',
            r'^([A-Z][A-Za-z\s,&]+?)(?:\s*\n|\s*•|\s*$)',
        ]

        # Company patterns
        self.company_patterns = [
            r'(?:at\s+|with\s+|@\s*)([A-Z][A-Za-z\s,&]+?)(?:\s*[-–]|\s*,|\s*\n|\s*$)',
            r'([A-Z][A-Za-z\s,&]+?)(?:\s*[-–]\s*[A-Z]|\s*,\s*[A-Z]|\s*\n)',
        ]

    async def extract_experience(self, text: str, experience_section: str = "") -> List[Dict[str, Any]]:
        """
        Extract work experience from resume text

        Args:
            text: Full resume text
            experience_section: Dedicated experience section text (if available)

        Returns:
            List of experience entries with company, position, dates, description
        """
        experiences = []

        # Use experience section if available, otherwise use full text
        target_text = experience_section.strip() if experience_section.strip() else text

        # Split text into potential job entries
        job_entries = self._split_into_job_entries(target_text)

        for entry in job_entries:
            experience = await self._parse_job_entry(entry)
            if experience and self._validate_experience(experience):
                experiences.append(experience)

        # Sort by end date (most recent first)
        experiences.sort(key=lambda x: x.get('end_date', ''), reverse=True)

        return experiences[:10]  # Limit to top 10 experiences

    def _split_into_job_entries(self, text: str) -> List[str]:
        """Split experience section into individual job entries"""
        # Look for patterns that indicate job boundaries
        lines = text.split('\n')
        entries = []
        current_entry = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Check if this looks like a new job entry
            if self._is_job_header(line):
                if current_entry:
                    entries.append('\n'.join(current_entry))
                    current_entry = []
                current_entry.append(line)
            else:
                current_entry.append(line)

        # Add the last entry
        if current_entry:
            entries.append('\n'.join(current_entry))

        return entries

    def _is_job_header(self, line: str) -> bool:
        """Check if a line looks like a job header (position/company)"""
        # Must be title case or have job title characteristics
        if not line:
            return False

        # Check for common job title patterns
        if re.search(r'^[A-Z][a-z]+\s+[A-Z]', line):  # Title Case
            return True

        # Check for company/job separator patterns
        if re.search(r'at\s+|with\s+|@\s*|-', line, re.IGNORECASE):
            return True

        # Check for date patterns
        if re.search(r'\d{4}|\w+\s+\d{4}', line):
            return True

        return False

    async def _parse_job_entry(self, entry_text: str) -> Optional[Dict[str, Any]]:
        """Parse individual job entry"""
        lines = entry_text.split('\n')
        if not lines:
            return None

        experience = {
            'position': None,
            'company': None,
            'start_date': None,
            'end_date': None,
            'location': None,
            'description': [],
            'achievements': [],
            'technologies': [],
        }

        # Parse first line (usually position and company)
        header_line = lines[0].strip()
        position, company = self._parse_job_header(header_line)

        experience['position'] = position
        experience['company'] = company

        # Look for dates in the entry
        dates_text = ' '.join(lines[:3])  # Check first few lines for dates
        start_date, end_date = self._extract_dates(dates_text)
        experience['start_date'] = start_date
        experience['end_date'] = end_date

        # Extract description and achievements
        description_lines = []
        achievement_lines = []

        for line in lines[1:]:  # Skip header line
            line = line.strip()
            if not line:
                continue

            # Check if it's a bullet point or achievement
            if re.match(r'[•●○▪▫♦-]\s*', line) or line[0].isupper():
                # Try to determine if it's an achievement (starts with action verbs)
                if re.match(r'[•●○▪▫♦-]\s*(?:Led|Developed|Created|Implemented|Managed|Improved|Increased|Reduced|Designed|Built|Launched|Achieved|Won|Awarded)', line, re.IGNORECASE):
                    achievement_lines.append(line)
                else:
                    description_lines.append(line)
            else:
                description_lines.append(line)

        experience['description'] = description_lines
        experience['achievements'] = achievement_lines

        # Extract technologies mentioned
        tech_keywords = [
            'Python', 'JavaScript', 'React', 'Angular', 'Vue', 'Django', 'Flask',
            'AWS', 'Docker', 'Kubernetes', 'SQL', 'PostgreSQL', 'MongoDB',
            'Git', 'Jenkins', 'CI/CD', 'Agile', 'Scrum'
        ]

        technologies = []
        entry_lower = entry_text.lower()
        for tech in tech_keywords:
            if tech.lower() in entry_lower:
                technologies.append(tech)

        experience['technologies'] = technologies

        return experience

    def _parse_job_header(self, header_line: str) -> Tuple[Optional[str], Optional[str]]:
        """Parse job header line to extract position and company"""
        position = None
        company = None

        # Try different patterns
        patterns = [
            # Pattern 1: Position - Company
            r'^([A-Za-z\s,&]+?)\s*[-–]\s*([A-Za-z\s,&]+?)(?:\s*\(|$|\n)',
            # Pattern 2: Position at Company
            r'^([A-Za-z\s,&]+?)\s*(?:at|@|with)\s*([A-Za-z\s,&]+?)(?:\s*,|$|\n)',
            # Pattern 3: Position, Company
            r'^([A-Za-z\s,&]+?)\s*,\s*([A-Za-z\s,&]+?)(?:\s*\(|$|\n)',
        ]

        for pattern in patterns:
            match = re.search(pattern, header_line)
            if match:
                position = match.group(1).strip()
                company = match.group(2).strip()
                break

        # If no pattern matched, try to extract from the line
        if not position:
            # Assume first part is position, look for company indicators
            words = header_line.split()
            if words:
                position = words[0]

            # Look for company after separators
            for separator in ['at', '@', 'with', '-', '–']:
                if separator in header_line:
                    parts = header_line.split(separator, 1)
                    if len(parts) > 1:
                        position = parts[0].strip()
                        company = parts[1].strip()
                        break

        # Clean up extracted values
        if position:
            position = self._clean_job_title(position)
        if company:
            company = self._clean_company_name(company)

        return position, company

    def _extract_dates(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract start and end dates from text"""
        start_date = None
        end_date = None

        for pattern in self.date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if pattern == self.date_patterns[0]:  # Full month year format
                    start_month = match.group(1)
                    start_year = match.group(2)
                    end_month = match.group(3)
                    end_year = match.group(4)

                    start_date = f"{start_month} {start_year}"
                    end_date = f"{end_month} {end_year}"

                elif pattern == self.date_patterns[1]:  # Year only
                    start_date = match.group(1)
                    end_date = match.group(2)

                elif pattern in [self.date_patterns[2], self.date_patterns[3]]:  # Present/Current
                    start_month = match.group(1)
                    start_year = match.group(2)
                    start_date = f"{start_month} {start_year}"
                    end_date = "Present"

                elif pattern == self.date_patterns[4]:  # MM/YYYY format
                    start_date = f"{match.group(1)}/{match.group(2)}"
                    end_date = f"{match.group(3)}/{match.group(4)}"

                elif pattern == self.date_patterns[5]:  # MM/YY format
                    start_date = f"{match.group(1)}/{match.group(2)}"
                    end_date = f"{match.group(3)}/{match.group(4)}"

                break

        return start_date, end_date

    def _clean_job_title(self, title: str) -> str:
        """Clean and standardize job title"""
        if not title:
            return title

        # Remove extra whitespace
        title = re.sub(r'\s+', ' ', title.strip())

        # Capitalize properly
        words = title.split()
        cleaned_words = []

        for word in words:
            # Keep words that are already properly capitalized
            if word[0].isupper() and len(word) > 3:
                cleaned_words.append(word)
            else:
                cleaned_words.append(word.capitalize())

        return ' '.join(cleaned_words)

    def _clean_company_name(self, company: str) -> str:
        """Clean and standardize company name"""
        if not company:
            return company

        # Remove common suffixes and clean up
        company = re.sub(r'\s+', ' ', company.strip())
        company = re.sub(r'\s*[,|\(].*$', '', company)  # Remove trailing commas/brackets

        # Title case for company names
        return company.title()

    def _validate_experience(self, experience: Dict[str, Any]) -> bool:
        """Validate that experience entry has required fields"""
        # Must have at least position or company
        has_position = experience.get('position') is not None
        has_company = experience.get('company') is not None

        if not (has_position or has_company):
            return False

        # Position should be reasonable length
        if has_position and len(experience['position']) < 3:
            return False

        # Company should be reasonable length
        if has_company and len(experience['company']) < 2:
            return False

        return True

    async def calculate_experience_score(self, experiences: List[Dict[str, Any]]) -> float:
        """Calculate overall experience score based on quality and quantity"""
        if not experiences:
            return 0.0

        score = 0
        max_score = 100

        # Quantity score (based on number of experiences)
        quantity_score = min(len(experiences) * 8, 40)
        score += quantity_score

        # Quality score (based on completeness and recency)
        quality_score = 0
        for exp in experiences[:5]:  # Check top 5 experiences
            exp_score = 0

            # Completeness score
            if exp.get('position'):
                exp_score += 15
            if exp.get('company'):
                exp_score += 10
            if exp.get('start_date'):
                exp_score += 10
            if exp.get('end_date'):
                exp_score += 10
            if exp.get('description') and len(exp.get('description', [])) > 0:
                exp_score += 15
            if exp.get('achievements') and len(exp.get('achievements', [])) > 0:
                exp_score += 20

            # Recency bonus
            if exp.get('end_date') == 'Present' or exp.get('end_date') == 'Current':
                exp_score += 10

            quality_score += min(exp_score, 80)  # Cap per experience

        # Average quality score
        avg_quality = quality_score / len(experiences[:5])
        score += min(avg_quality, 60)

        return min(score, max_score)

    async def extract_skills_from_experience(self, experiences: List[Dict[str, Any]]) -> List[str]:
        """Extract skills mentioned in experience descriptions"""
        skills = []

        for exp in experiences:
            # Combine description and achievements
            text_parts = []
            if exp.get('description'):
                text_parts.extend(exp['description'])
            if exp.get('achievements'):
                text_parts.extend(exp['achievements'])

            full_text = ' '.join(text_parts).lower()

            # Common skills that appear in experience descriptions
            experience_skills = [
                'leadership', 'management', 'team building', 'project management',
                'agile', 'scrum', 'kanban', 'sprint planning', 'retrospective',
                'stakeholder management', 'client relations', 'customer service',
                'process improvement', 'optimization', 'automation',
                'data analysis', 'reporting', 'dashboard', 'metrics',
                'budgeting', 'forecasting', 'financial planning',
                'training', 'mentoring', 'coaching', 'team development',
                'strategic planning', 'roadmap development', 'product strategy',
                'vendor management', 'contract negotiation', 'procurement',
                'quality assurance', 'testing', 'debugging', 'troubleshooting',
                'performance tuning', 'scalability', 'reliability',
                'security', 'compliance', 'risk assessment', 'audit',
            ]

            for skill in experience_skills:
                if skill in full_text and skill not in skills:
                    skills.append(skill)

        return skills
