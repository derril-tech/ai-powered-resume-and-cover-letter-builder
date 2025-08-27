"""
Cover Letter Generator (template + heuristic filling)
"""

from typing import List, Tuple, Optional


class CoverLetterGenerator:
    def __init__(self) -> None:
        self.templates = {
            "professional": (
                "Dear Hiring Manager,\n\n"
                "I am excited to apply for the {role} position at {company}. "
                "With experience in {highlights}, I bring a strong track record of delivering results that align with your needs.\n\n"
                "In prior roles, I {impact_lines}. I believe these experiences, combined with my commitment to excellence, make me a strong fit for {company}.\n\n"
                "Thank you for your time and consideration. I would welcome the opportunity to discuss how I can contribute to your team.\n\n"
                "Sincerely,\n"
            ),
            "warm": (
                "Hello {company} team,\n\n"
                "I'm thrilled about the {role} role. My background in {highlights} and passion for crafting meaningful outcomes would help drive impact at {company}.\n\n"
                "Previously, I {impact_lines}. I admire your mission and would love to contribute to it.\n\n"
                "Warmly,\n"
            ),
            "concise": (
                "Dear Hiring Manager,\n\n"
                "Applying for {role} at {company}. Experience: {highlights}. "
                "Recent impact: {impact_lines}. I'd be glad to discuss fit.\n\n"
                "Best regards,\n"
            ),
            "impact": (
                "Dear Hiring Manager,\n\n"
                "At {company}, the {role} needs measurable outcomes. I've delivered: {impact_lines}. "
                "With strengths in {highlights}, I can accelerate results from day one.\n\n"
                "Regards,\n"
            ),
            "enthusiastic": (
                "Hello {company} Hiring Team,\n\n"
                "I'm excited to apply for {role}. I love working on {highlights} and have recently {impact_lines}. "
                "I'd be thrilled to bring this energy to {company}.\n\n"
                "Thank you,\n"
            ),
        }

    async def generate(
        self,
        resume_summary: Optional[str],
        experience_highlights: List[str],
        company: str,
        role: str,
        job_requirements: List[str],
        tone: str,
        word_limit: int,
    ) -> Tuple[str, List[str]]:
        t = tone if tone in self.templates else "professional"

        highlights = self._summarize_highlights(experience_highlights, job_requirements)
        impact_lines = self._compose_impact_lines(experience_highlights, job_requirements)

        draft = self.templates[t].format(
            role=role,
            company=company,
            highlights=highlights,
            impact_lines=impact_lines,
        )

        # Enforce word limit
        words = draft.split()
        if len(words) > word_limit:
            draft = " ".join(words[:word_limit - 10]) + " ..."

        suggestions = self._suggestions(draft, job_requirements)
        return draft, suggestions

    def _summarize_highlights(self, highlights: List[str], jd: List[str]) -> str:
        items = [h for h in highlights if h]
        if jd:
            # Prefer highlights that overlap JD terms
            jd_lower = " ".join(jd).lower()
            items.sort(key=lambda x: sum(1 for w in x.lower().split() if w in jd_lower), reverse=True)
        return ", ".join(items[:3]) or "relevant experience"

    def _compose_impact_lines(self, highlights: List[str], jd: List[str]) -> str:
        # Turn highlights into impact statements heuristically
        statements: List[str] = []
        for h in highlights[:3]:
            if not h:
                continue
            stmt = h
            if any(ch.isdigit() for ch in h):
                stmt = f"achieved {h}"
            elif any(k in h.lower() for k in ["improved", "reduced", "increased", "optimized"]):
                stmt = h
            else:
                stmt = f"delivered results in {h}"
            statements.append(stmt)
        return "; ".join(statements) or "delivered measurable results"

    def _suggestions(self, draft: str, jd: List[str]) -> List[str]:
        recs: List[str] = []
        if "Dear Hiring Manager" in draft:
            recs.append("Personalize greeting with a name if available")
        if jd:
            recs.append("Align one paragraph to the top 2–3 JD requirements explicitly")
        if len(draft.split()) < 180:
            recs.append("Consider adding a short paragraph linking past results to company goals")
        return recs


