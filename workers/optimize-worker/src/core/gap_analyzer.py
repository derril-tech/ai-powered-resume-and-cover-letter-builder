"""
Gap Analyzer
Computes gaps between a resume and a job description (missing must-haves & coverage).
"""

from typing import Dict, Any, List, Set
import re


class GapAnalyzer:
    def __init__(self) -> None:
        # Phrases indicating must-have requirements
        self.must_have_markers = [
            r"must\s+have",
            r"required",
            r"minimum\s+of",
            r"at\s+least",
            r"strong\s+experience",
            r"proficiency\s+in",
        ]

    async def analyze(
        self,
        resume_content: Dict[str, Any],
        job_description: Dict[str, Any],
    ) -> Dict[str, Any]:
        jd_text = self._extract_text(job_description).lower()
        resume_text = self._extract_text(resume_content).lower()

        jd_must_haves = self._extract_must_haves(jd_text)
        resume_skills = self._extract_resume_skills(resume_content, resume_text)

        present: List[str] = []
        missing: List[str] = []
        partial: List[str] = []

        for req in jd_must_haves:
            if self._match_exact_or_alias(req, resume_skills):
                present.append(req)
            else:
                # partial match if any token overlaps
                req_tokens = set(re.findall(r"[a-z0-9+.#-]+", req))
                if req_tokens & resume_skills:
                    partial.append(req)
                else:
                    missing.append(req)

        total = len(jd_must_haves) or 1
        coverage = (len(present) + 0.5 * len(partial)) / total

        recommendations: List[str] = []
        if missing:
            recommendations.append(
                f"Address missing must-haves: {', '.join(missing[:8])}"
            )
        if partial:
            recommendations.append(
                "Strengthen evidence for partially covered requirements with concrete examples"
            )

        return {
            "must_haves": jd_must_haves,
            "present": present,
            "partial": partial,
            "missing": missing,
            "coverage_score": round(coverage, 3),
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

    def _extract_must_haves(self, jd_text: str) -> List[str]:
        # Collect sentences/lines that contain must-have markers
        candidates: List[str] = []
        lines = re.split(r"[\n\r.]+", jd_text)
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if any(re.search(marker, line) for marker in self.must_have_markers):
                candidates.append(line)

        # Extract noun-phrases-like tokens (simple heuristic)
        reqs: Set[str] = set()
        for c in candidates:
            # Find tech/tool/skill-like tokens
            tokens = re.findall(r"[a-z][a-z0-9+.#-]{2,}", c)
            # Keep top 1-3 salient tokens per sentence
            for t in tokens[:3]:
                reqs.add(t)
        # Return sorted for consistency
        return sorted(reqs)

    def _extract_resume_skills(self, resume: Dict[str, Any], resume_text: str) -> Set[str]:
        skills: Set[str] = set()
        if isinstance(resume.get("skills"), list):
            for s in resume.get("skills", []):
                if isinstance(s, str):
                    for tok in re.findall(r"[a-z][a-z0-9+.#-]{2,}", s.lower()):
                        skills.add(tok)
        # Also extract from full text as fallback
        for tok in re.findall(r"[a-z][a-z0-9+.#-]{2,}", resume_text):
            skills.add(tok)
        return skills

    def _match_exact_or_alias(self, requirement: str, skills: Set[str]) -> bool:
        # Simple normalization & common aliases
        aliases = {requirement}
        if requirement == "javascript":
            aliases |= {"js", "ecmascript"}
        if requirement == "typescript":
            aliases |= {"ts"}
        if requirement == "aws":
            aliases |= {"amazon", "amazonwebservices"}
        if requirement == "node.js" or requirement == "nodejs":
            aliases |= {"node", "nodejs", "node.js"}
        if requirement == "react":
            aliases |= {"reactjs", "react.js"}
        return any(a in skills for a in aliases)


