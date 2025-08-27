"""
Education Extractor
Extracts educational background information from resume text.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

class EducationExtractor:
    """Extracts education information from resume text"""

    def __init__(self):
        # Degree patterns
        self.degree_patterns = [
            r'(?:Bachelor|B\.S\.|B\.A\.|B\.E\.|B\.Tech|Bachelor\'s|B\.Sc\.)\s*(?:of\s+)?(?:Science|Arts|Engineering|Technology|Business|Commerce|Mathematics|Physics|Chemistry|Biology|Computer\s+Science|Information\s+Technology|Software\s+Engineering|Data\s+Science|Mechanical\s+Engineering|Electrical\s+Engineering|Civil\s+Engineering|Chemical\s+Engineering|Biomedical\s+Engineering|Aerospace\s+Engineering|Computer\s+Engineering)?(?:\s+in\s+[\w\s]+)?',
            r'(?:Master|M\.S\.|M\.A\.|M\.E\.|M\.Tech|M\.Sc\.|MBA|Master\'s|Masters)\s*(?:of\s+)?(?:Science|Arts|Engineering|Technology|Business|Administration|Commerce|Mathematics|Physics|Chemistry|Biology|Computer\s+Science|Information\s+Technology|Software\s+Engineering|Data\s+Science|Mechanical\s+Engineering|Electrical\s+Engineering|Civil\s+Engineering|Chemical\s+Engineering|Biomedical\s+Engineering|Aerospace\s+Engineering|Computer\s+Engineering)?(?:\s+in\s+[\w\s]+)?',
            r'(?:Doctorate|Ph\.?D\.?|Doctor|Dr\.)\s*(?:of\s+)?(?:Philosophy|Science|Engineering|Business|Medicine|Dentistry|Law|Psychology|Education|Sociology|History|Literature|Economics|Political\s+Science|International\s+Relations|Environmental\s+Science)?(?:\s+in\s+[\w\s]+)?',
            r'(?:Associate|A\.S\.|A\.A\.)\s*(?:of\s+)?(?:Science|Arts|Applied\s+Science|Applied\s+Arts)?(?:\s+in\s+[\w\s]+)?',
            r'(?:Certificate|Diploma|Certification)\s+in\s+[\w\s]+',
        ]

        # Institution patterns
        self.institution_patterns = [
            r'([A-Z][A-Za-z\s,&]+?(?:University|College|Institute|School|Academy|Center|Centre))\s*(?:\(|$|\n|,)',
            r'([A-Z][A-Za-z\s,&]+?(?:State|Technical|Community|Junior|Senior|High))\s+School',
            r'([A-Z][A-Za-z\s,&]+?(?:College|University|Institute))\s*(?:\(|$|\n|,)',
        ]

        # GPA patterns
        self.gpa_patterns = [
            r'GPA\s*:\s*([\d.]+)(?:\s*/\s*(\d+))?',
            r'Grade\s+Point\s+Average\s*:\s*([\d.]+)',
            r'([\d.]+)\s*/\s*(\d+)\s*GPA',
            r'([\d.]+)\s*GPA',
        ]

        # Graduation year patterns
        self.year_patterns = [
            r'(?:Graduated|Expected|Class\s+of|Completed)\s+(\d{4})',
            r'(\d{4})\s*(?:Graduation|Expected|Completion)',
            r'(?:May|June|August|December)\s+(\d{4})',
        ]

        # Major/field of study patterns
        self.major_patterns = [
            r'(?:Major|Concentration|Specialization|Field|Focus)\s*:\s*([A-Za-z\s]+?)(?:\s*,|\s*\n|\s*$)',
            r'(?:in\s+|of\s+)([A-Za-z\s]+?)(?:\s*,|\s*\n|\s*$)',
        ]

    async def extract_education(self, text: str, education_section: str = "") -> List[Dict[str, Any]]:
        """
        Extract education information from resume text

        Args:
            text: Full resume text
            education_section: Dedicated education section text (if available)

        Returns:
            List of education entries
        """
        educations = []

        # Use education section if available, otherwise search full text
        target_text = education_section.strip() if education_section.strip() else text

        # Split into potential education entries
        edu_entries = self._split_into_education_entries(target_text)

        for entry in edu_entries:
            education = await self._parse_education_entry(entry)
            if education and self._validate_education(education):
                educations.append(education)

        # If no structured entries found, try to extract from full text
        if not educations:
            educations = await self._extract_education_from_text(text)

        # Sort by graduation year (most recent first)
        educations.sort(key=lambda x: x.get('graduation_year', 0), reverse=True)

        return educations[:5]  # Limit to top 5 education entries

    def _split_into_education_entries(self, text: str) -> List[str]:
        """Split education section into individual entries"""
        lines = text.split('\n')
        entries = []
        current_entry = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Check if this looks like a new education entry
            if self._is_education_header(line):
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

    def _is_education_header(self, line: str) -> bool:
        """Check if a line looks like an education header"""
        if not line:
            return False

        # Check for degree patterns
        for pattern in self.degree_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                return True

        # Check for institution patterns
        for pattern in self.institution_patterns:
            if re.search(pattern, line):
                return True

        # Check for year patterns
        for pattern in self.year_patterns:
            if re.search(pattern, line):
                return True

        return False

    async def _parse_education_entry(self, entry_text: str) -> Optional[Dict[str, Any]]:
        """Parse individual education entry"""
        lines = entry_text.split('\n')
        if not lines:
            return None

        education = {
            'degree': None,
            'institution': None,
            'major': None,
            'graduation_year': None,
            'gpa': None,
            'honors': [],
            'description': [],
        }

        # Parse first line (usually degree and institution)
        header_line = lines[0].strip()

        # Extract degree
        degree = self._extract_degree(header_line)
        education['degree'] = degree

        # Extract institution
        institution = self._extract_institution(header_line)
        education['institution'] = institution

        # Look for additional information in other lines
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue

            # Try to extract major/field of study
            if not education['major']:
                major = self._extract_major(line)
                if major:
                    education['major'] = major
                    continue

            # Try to extract graduation year
            if not education['graduation_year']:
                year = self._extract_year(line)
                if year:
                    education['graduation_year'] = year
                    continue

            # Try to extract GPA
            if not education['gpa']:
                gpa = self._extract_gpa(line)
                if gpa:
                    education['gpa'] = gpa
                    continue

            # Check for honors/awards
            if re.search(r'(?:summa|cum|laude|magna|honors|dean|president)', line, re.IGNORECASE):
                education['honors'].append(line.strip())
                continue

            # Add as description
            education['description'].append(line)

        return education

    def _extract_degree(self, text: str) -> Optional[str]:
        """Extract degree from text"""
        for pattern in self.degree_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                degree = match.group(0).strip()
                # Clean up the degree name
                degree = re.sub(r'\s+', ' ', degree)
                return degree.title()

        return None

    def _extract_institution(self, text: str) -> Optional[str]:
        """Extract institution from text"""
        for pattern in self.institution_patterns:
            match = re.search(pattern, text)
            if match:
                institution = match.group(1).strip()
                return institution

        return None

    def _extract_major(self, text: str) -> Optional[str]:
        """Extract major/field of study from text"""
        for pattern in self.major_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                major = match.group(1).strip()
                return major.title()

        return None

    def _extract_year(self, text: str) -> Optional[int]:
        """Extract graduation year from text"""
        for pattern in self.year_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                year = int(match.group(1))
                # Validate year (reasonable range)
                if 1950 <= year <= 2030:
                    return year

        return None

    def _extract_gpa(self, text: str) -> Optional[str]:
        """Extract GPA from text"""
        for pattern in self.gpa_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if match.group(2):  # Has scale (e.g., 3.8/4.0)
                    return f"{match.group(1)}/{match.group(2)}"
                else:
                    return match.group(1)

        return None

    def _validate_education(self, education: Dict[str, Any]) -> bool:
        """Validate that education entry has required fields"""
        # Must have at least degree or institution
        has_degree = education.get('degree') is not None
        has_institution = education.get('institution') is not None

        if not (has_degree or has_institution):
            return False

        # Degree should be reasonable length
        if has_degree and len(education['degree']) < 5:
            return False

        # Institution should be reasonable length
        if has_institution and len(education['institution']) < 3:
            return False

        return True

    async def _extract_education_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Extract education information from full text when no structured section exists"""
        educations = []

        # Find all degree mentions
        for pattern in self.degree_patterns:
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            for match in matches:
                degree = match.group(0).strip()

                # Look for institution near this degree
                start_pos = max(0, match.start() - 200)
                end_pos = min(len(text), match.end() + 200)
                context = text[start_pos:end_pos]

                institution = self._extract_institution(context)
                year = self._extract_year(context)
                major = self._extract_major(context)

                education = {
                    'degree': degree.title(),
                    'institution': institution,
                    'major': major,
                    'graduation_year': year,
                    'gpa': None,
                    'honors': [],
                    'description': [],
                }

                if self._validate_education(education):
                    educations.append(education)

        # Remove duplicates
        unique_educations = []
        seen_degrees = set()

        for edu in educations:
            degree_key = edu.get('degree', '').lower()
            if degree_key not in seen_degrees:
                unique_educations.append(edu)
                seen_degrees.add(degree_key)

        return unique_educations

    async def calculate_education_score(self, educations: List[Dict[str, Any]]) -> float:
        """Calculate education score based on degrees and institutions"""
        if not educations:
            return 0.0

        score = 0
        max_score = 100

        for education in educations[:3]:  # Check top 3 education entries
            edu_score = 0

            # Degree level score
            degree = education.get('degree', '').lower()
            if 'doctorate' in degree or 'phd' in degree:
                edu_score += 30
            elif 'master' in degree or 'mba' in degree:
                edu_score += 25
            elif 'bachelor' in degree:
                edu_score += 20
            elif 'associate' in degree:
                edu_score += 15
            elif 'certificate' in degree or 'diploma' in degree:
                edu_score += 10

            # Institution prestige (basic heuristic)
            institution = education.get('institution', '').lower()
            if any(word in institution for word in ['harvard', 'stanford', 'mit', 'caltech', 'princeton']):
                edu_score += 10
            elif any(word in institution for word in ['university', 'college', 'institute']):
                edu_score += 5

            # GPA bonus
            if education.get('gpa'):
                try:
                    gpa_value = float(education['gpa'].split('/')[0])
                    if gpa_value >= 3.5:
                        edu_score += 5
                except (ValueError, IndexError):
                    pass

            # Honors bonus
            if education.get('honors'):
                edu_score += 5

            score += min(edu_score, 50)  # Cap per education

        return min(score, max_score)

    async def extract_skills_from_education(self, educations: List[Dict[str, Any]]) -> List[str]:
        """Extract skills mentioned in education descriptions"""
        skills = []

        for education in educations:
            # Combine all text fields
            text_parts = []
            if education.get('degree'):
                text_parts.append(education['degree'])
            if education.get('major'):
                text_parts.append(education['major'])
            if education.get('description'):
                text_parts.extend(education['description'])

            full_text = ' '.join(text_parts).lower()

            # Academic skills
            academic_skills = [
                'research', 'data analysis', 'statistical analysis', 'mathematics',
                'programming', 'algorithm design', 'machine learning', 'artificial intelligence',
                'database design', 'system design', 'software engineering',
                'project management', 'team leadership', 'communication',
                'technical writing', 'presentation skills', 'problem solving',
            ]

            for skill in academic_skills:
                if skill in full_text and skill not in skills:
                    skills.append(skill)

        return skills

    async def get_education_level(self, educations: List[Dict[str, Any]]) -> str:
        """Determine overall education level"""
        if not educations:
            return "Unknown"

        # Find highest degree
        degree_hierarchy = {
            'doctorate': 6,
            'phd': 6,
            'masters': 5,
            'mba': 5,
            'bachelors': 4,
            'associate': 3,
            'certificate': 2,
            'diploma': 2,
        }

        highest_level = 0
        for education in educations:
            degree = education.get('degree', '').lower()
            for degree_type, level in degree_hierarchy.items():
                if degree_type in degree:
                    highest_level = max(highest_level, level)
                    break

        level_names = {
            0: "Unknown",
            2: "Certificate/Diploma",
            3: "Associate Degree",
            4: "Bachelor's Degree",
            5: "Master's Degree/MBA",
            6: "Doctorate/PhD",
        }

        return level_names.get(highest_level, "Bachelor's Degree")
