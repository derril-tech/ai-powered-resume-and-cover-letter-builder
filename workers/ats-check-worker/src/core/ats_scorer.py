"""
ATS Scorer
Combines analyzers into a comprehensive ATS score and recommendations.
"""

from typing import Dict, Any, List, Optional

from .length_analyzer import LengthAnalyzer
from .readability_analyzer import ReadabilityAnalyzer
from .keyword_analyzer import KeywordAnalyzer
from .tense_analyzer import TenseAnalyzer
from .content_analyzer import ContentAnalyzer


class ATSScorer:
    def __init__(
        self,
        length_analyzer: LengthAnalyzer,
        readability_analyzer: ReadabilityAnalyzer,
        keyword_analyzer: KeywordAnalyzer,
        tense_analyzer: TenseAnalyzer,
        content_analyzer: ContentAnalyzer,
    ) -> None:
        self.length_analyzer = length_analyzer
        self.readability_analyzer = readability_analyzer
        self.keyword_analyzer = keyword_analyzer
        self.tense_analyzer = tense_analyzer
        self.content_analyzer = content_analyzer

    async def analyze_resume(
        self,
        resume_content: Dict[str, Any],
        job_description: Optional[Dict[str, Any]] = None,
        analysis_type: str = "comprehensive",
    ) -> Dict[str, Any]:
        text = self._extract_text(resume_content)

        length = await self.length_analyzer.analyze_length(text, None, "resume")
        readability = await self.readability_analyzer.analyze_readability(text)
        keywords = await self.keyword_analyzer.analyze_keywords(resume_content, job_description)
        tense = await self.tense_analyzer.analyze_tense(text)
        content = await self.content_analyzer.analyze_content(resume_content)

        detailed = {
            "length": length,
            "readability": readability,
            "keywords": keywords,
            "tense": tense,
            "structure": content,
        }

        ats_score = self._score(detailed)

        recommendations = self._recommendations(detailed)

        summary = {
            "strengths": self._strengths(detailed),
            "risks": recommendations[:3],
        }

        return {
            "ats_score": round(ats_score, 1),
            "detailed_scores": {
                "readability": readability.get("reading_ease", 0),
                "keyword": keywords.get("coverage", 0) * 100,
                "structure": content.get("structure_score", 0),
            },
            "issues_found": self._issues(detailed),
            "recommendations": recommendations,
            "analysis_summary": summary,
        }

    async def quick_score(self, resume_content: Dict[str, Any]) -> Dict[str, Any]:
        text = self._extract_text(resume_content)
        readability = await self.readability_analyzer.analyze_readability(text)
        structure = await self.content_analyzer.analyze_content(resume_content)
        score = (readability.get("reading_ease", 0) * 0.4) + (structure.get("structure_score", 0) * 0.6)
        return {"ats_score": round(score, 1), "breakdown": {"readability": readability.get("reading_ease", 0), "structure": structure.get("structure_score", 0)}}

    async def compare_resumes(
        self,
        resume_a: Dict[str, Any],
        resume_b: Dict[str, Any],
        job_description: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        a = await self.analyze_resume(resume_a, job_description)
        b = await self.analyze_resume(resume_b, job_description)
        winner = "a" if a["ats_score"] > b["ats_score"] else ("b" if b["ats_score"] > a["ats_score"] else "tie")
        return {
            "winner": winner,
            "score_difference": round(abs(a["ats_score"] - b["ats_score"]), 1),
            "comparison_details": {"a": a, "b": b},
            "recommendations": ["Adopt strengths from the higher-scoring resume"],
        }

    async def optimize_for_job(
        self,
        resume_content: Dict[str, Any],
        job_description: Dict[str, Any],
        optimization_focus: str = "keywords",
    ) -> Dict[str, Any]:
        # For now, return the same content with suggestions only (non-destructive)
        analysis = await self.analyze_resume(resume_content, job_description)
        return {
            "optimized_content": resume_content,
            "optimization_score": analysis["ats_score"],
            "changes_made": [],
            "keyword_match_improvement": analysis["detailed_scores"].get("keyword", 0),
        }

    async def benchmark_ats_systems(
        self,
        resume_content: Dict[str, Any],
        job_description: Optional[Dict[str, Any]] = None,
        systems: List[str] = ["general", "workday", "taleo", "icims"],
    ) -> Dict[str, Any]:
        # Heuristic: reuse main score and adjust by small offsets per system
        base = await self.analyze_resume(resume_content, job_description)
        base_score = base["ats_score"]
        offsets = {"workday": -2, "taleo": -4, "icims": -1, "general": 0}
        results = {sys: max(0.0, min(100.0, base_score + offsets.get(sys, 0))) for sys in systems}
        return {"base": base_score, "systems": results}

    def _extract_text(self, resume_content: Dict[str, Any]) -> str:
        parts: List[str] = []
        for v in resume_content.values():
            if isinstance(v, str):
                parts.append(v)
            elif isinstance(v, list):
                for item in v:
                    if isinstance(item, str):
                        parts.append(item)
                    elif isinstance(item, dict):
                        parts.extend(str(iv) for iv in item.values() if iv)
            elif isinstance(v, dict):
                parts.extend(str(iv) for iv in v.values() if iv)
        return " ".join(parts)

    def _score(self, detailed: Dict[str, Any]) -> float:
        readability = detailed["readability"]["reading_ease"]
        keyword = detailed["keywords"]["coverage"] * 100
        structure = detailed["structure"]["structure_score"]
        length_status = detailed["length"]["status"]
        length_mod = 0 if length_status == "ok" else (-5 if length_status == "long" else -5)
        tense_consistency = detailed["tense"]["consistency_score"] * 10
        return max(0.0, min(100.0, readability * 0.3 + keyword * 0.3 + structure * 0.3 + tense_consistency + length_mod))

    def _issues(self, detailed: Dict[str, Any]) -> List[Dict[str, Any]]:
        issues: List[Dict[str, Any]] = []
        if detailed["keywords"]["coverage"] < 0.5:
            issues.append({"type": "keywords", "detail": "Low JD keyword coverage"})
        if detailed["readability"]["reading_ease"] < 50:
            issues.append({"type": "readability", "detail": "Low reading ease score"})
        if detailed["structure"]["missing_sections"]:
            issues.append({"type": "structure", "detail": f"Missing sections: {', '.join(detailed['structure']['missing_sections'])}"})
        return issues

    def _recommendations(self, detailed: Dict[str, Any]) -> List[str]:
        recs: List[str] = []
        recs.extend(detailed["keywords"].get("recommendations", []))
        recs.extend(detailed["readability"].get("recommendations", []))
        if detailed["structure"]["missing_sections"]:
            recs.append("Add the required sections for ATS parsing: " + ", ".join(detailed["structure"]["missing_sections"]))
        if detailed["length"]["status"] != "ok":
            recs.append("Adjust overall length to target range for the role")
        return recs[:10]

    def _strengths(self, detailed: Dict[str, Any]) -> List[str]:
        strengths: List[str] = []
        if detailed["readability"]["reading_ease"] >= 60:
            strengths.append("Good readability and sentence structure")
        if detailed["keywords"]["coverage"] >= 0.7:
            strengths.append("Strong alignment with JD keywords")
        if not detailed["structure"]["missing_sections"]:
            strengths.append("All required sections are present")
        return strengths


