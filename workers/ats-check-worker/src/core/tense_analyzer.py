"""
Tense Analyzer
Checks tense consistency and suggests improvements.
"""

from typing import Dict, Any
import re


class TenseAnalyzer:
    """Simple tense heuristics"""

    PAST_VERBS = {"led", "managed", "built", "created", "delivered", "shipped", "improved", "reduced", "increased", "optimized"}
    PRESENT_VERBS = {"lead", "manage", "build", "create", "deliver", "ship", "improve", "reduce", "increase", "optimize"}

    async def analyze_tense(self, text: str) -> Dict[str, Any]:
        tokens = re.findall(r"\b\w+\b", text.lower())

        past = sum(1 for t in tokens if t in self.PAST_VERBS)
        present = sum(1 for t in tokens if t in self.PRESENT_VERBS)

        total = past + present or 1
        consistency = 1 - abs(past - present) / total

        recommendations = []
        if consistency < 0.5:
            recommendations.append("Use past tense for past roles and present tense for current role consistently")

        return {
            "past_count": past,
            "present_count": present,
            "consistency_score": round(consistency, 2),
            "recommendations": recommendations,
        }


