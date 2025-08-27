"""
Length Analyzer
Analyzes resume content length, section distribution, and provides recommendations.
"""

from typing import Dict, Any, List, Optional


class LengthAnalyzer:
    """Provides basic length analytics and guidance"""

    def __init__(self) -> None:
        # Recommended word counts by section (heuristic)
        self.section_targets = {
            "summary": (40, 120),
            "experience": (200, 800),
            "education": (30, 150),
            "skills": (20, 120),
            "projects": (40, 200),
        }

        # Recommended overall word counts by level
        self.level_targets = {
            "entry": (300, 700),
            "mid": (500, 900),
            "senior": (700, 1200),
            "executive": (800, 1500),
        }

    async def analyze_length(
        self,
        text: str,
        target_length: Optional[int] = None,
        content_type: str = "resume",
    ) -> Dict[str, Any]:
        words = text.split()
        word_count = len(words)

        target_min = target_length - 100 if target_length else 0
        target_max = target_length + 100 if target_length else 10_000

        status = "ok"
        if word_count < target_min:
            status = "short"
        elif word_count > target_max:
            status = "long"

        return {
            "content_type": content_type,
            "word_count": word_count,
            "target_length": target_length,
            "status": status,
            "recommendations": self._recommendations(word_count, target_length),
        }

    def analyze_sections(self, resume_content: Dict[str, Any]) -> Dict[str, Any]:
        section_stats: Dict[str, Any] = {"sections": {}, "total_words": 0}

        for section, content in resume_content.items():
            text = self._extract_text(content)
            wc = len(text.split())
            section_stats["sections"][section] = {
                "word_count": wc,
                "target": self.section_targets.get(section),
            }
            section_stats["total_words"] += wc

        return section_stats

    def _extract_text(self, content: Any) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: List[str] = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict):
                    parts.extend(str(v) for v in item.values() if v)
            return " ".join(parts)
        if isinstance(content, dict):
            return " ".join(str(v) for v in content.values() if v)
        return str(content)

    def _recommendations(self, word_count: int, target_length: Optional[int]) -> List[str]:
        recs: List[str] = []
        if target_length:
            if word_count < max(0, target_length - 100):
                recs.append("Add more detail to key sections (experience, impact, metrics)")
            if word_count > target_length + 100:
                recs.append("Condense verbose sections; prefer concise STAR bullets")
        return recs


