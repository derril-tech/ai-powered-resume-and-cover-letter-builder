"""
Content Analyzer
Evaluates content quality, section presence, and structure risks.
"""

from typing import Dict, Any, List


class ContentAnalyzer:
    REQUIRED = {"contact", "experience", "education", "skills"}

    async def analyze_content(self, resume_content: Dict[str, Any], analysis_type: str = "comprehensive") -> Dict[str, Any]:
        present = set(k.lower() for k in resume_content.keys())
        missing = list(self.REQUIRED - present)

        risks: List[str] = []
        if missing:
            risks.append(f"Missing required sections: {', '.join(missing)}")

        # Basic structure score
        structure_score = 100 - len(missing) * 15
        structure_score = max(0, structure_score)

        return {
            "present_sections": list(present),
            "missing_sections": missing,
            "structure_score": structure_score,
            "risks": risks,
        }


