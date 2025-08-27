"""
Keyword Analyzer
Analyzes keyword coverage, density, and distribution versus a job description.
"""

from typing import Dict, Any, List, Set
import re
from collections import Counter


class KeywordAnalyzer:
    """Keyword coverage and density analysis"""

    async def analyze_keywords(
        self,
        resume_content: Dict[str, Any],
        job_description: Dict[str, Any] | None = None,
        target_density: float = 0.02,
    ) -> Dict[str, Any]:
        text = self._extract_text(resume_content).lower()

        jd_keywords: List[str] = []
        if job_description:
            jd_keywords = self._extract_keywords_from_jd(job_description)

        words = re.findall(r"\b\w+\b", text)
        total_words = max(1, len(words))
        counts = Counter(words)

        present = [kw for kw in jd_keywords if counts.get(kw.lower(), 0) > 0]
        missing = [kw for kw in jd_keywords if kw.lower() not in counts]

        density = sum(counts.get(kw.lower(), 0) for kw in jd_keywords) / total_words

        recommendations: List[str] = []
        if density < target_density:
            recommendations.append("Increase presence of critical keywords naturally in relevant sections")
        if missing:
            recommendations.append(f"Consider adding missing keywords: {', '.join(missing[:10])}")

        return {
            "target_keywords": jd_keywords,
            "present_keywords": present,
            "missing_keywords": missing,
            "keyword_density": round(density, 4),
            "coverage": round(len(present) / max(1, len(jd_keywords)), 3),
            "recommendations": recommendations,
        }

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

    def _extract_keywords_from_jd(self, jd: Dict[str, Any]) -> List[str]:
        text = self._extract_text(jd).lower()
        terms = re.findall(r"\b[a-z][a-z0-9+.#-]{2,}\b", text)
        # Heuristic: keep capitalized tech terms and frequent tokens
        freq = Counter(terms)
        common = [t for t, c in freq.items() if c >= 2]
        # Ensure core tech nouns are included once
        return list(dict.fromkeys(common))[:50]


