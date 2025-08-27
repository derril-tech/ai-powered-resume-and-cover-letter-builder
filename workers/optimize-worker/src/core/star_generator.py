"""
STAR Generator
Generates STAR (Situation, Task, Action, Result) format bullet points from resume experience descriptions.
"""

import re
import logging
from typing import Dict, List, Optional, Any, Tuple
import asyncio
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class Tone(Enum):
    """Writing tone for STAR bullets"""
    PROFESSIONAL = "professional"
    ACHIEVEMENT = "achievement"
    IMPACT = "impact"
    CONCISE = "concise"

@dataclass
class STARComponents:
    """Components of a STAR bullet"""
    situation: str = ""
    task: str = ""
    action: str = ""
    result: str = ""
    impact_metrics: List[str] = None
    keywords: List[str] = None

    def __post_init__(self):
        if self.impact_metrics is None:
            self.impact_metrics = []
        if self.keywords is None:
            self.keywords = []

class STARGenerator:
    """Generates STAR format bullets from experience descriptions"""

    def __init__(self):
        # STAR templates for different tones
        self.templates = {
            Tone.PROFESSIONAL: {
                "full": "In {situation}, {task} by {action}, resulting in {result}",
                "compact": "Led {task} through {action} in {situation}, achieving {result}",
                "metric": "Improved {metric} by {percentage}% through {action} in {situation}",
            },
            Tone.ACHIEVEMENT: {
                "full": "Spearheaded {task} initiative in {situation} by {action}, delivering {result}",
                "compact": "Achieved {result} by {action} when {task} in {situation}",
                "metric": "Boosted {metric} by {percentage}% via {action} during {situation}",
            },
            Tone.IMPACT: {
                "full": "Transformed {situation} by {action} to {task}, generating {result}",
                "compact": "Drove {result} impact by {action} while handling {task} in {situation}",
                "metric": "Delivered {percentage}% improvement in {metric} through {action}",
            },
            Tone.CONCISE: {
                "full": "{Task} in {situation}: {action} → {result}",
                "compact": "{Result} achieved via {action} for {task}",
                "metric": "{Percentage}% {metric} increase from {action}",
            },
        }

        # Action verbs for different contexts
        self.action_verbs = {
            "leadership": ["led", "managed", "directed", "supervised", "guided", "mentored"],
            "technical": ["developed", "implemented", "designed", "built", "created", "engineered"],
            "analytical": ["analyzed", "optimized", "improved", "enhanced", "streamlined", "refined"],
            "sales": ["achieved", "closed", "negotiated", "expanded", "penetrated", "converted"],
            "communication": ["presented", "collaborated", "coordinated", "liaised", "facilitated"],
            "problem_solving": ["resolved", "troubleshooted", "diagnosed", "rectified", "corrected"],
        }

        # Impact keywords
        self.impact_keywords = [
            "increased", "decreased", "improved", "reduced", "enhanced", "boosted",
            "grew", "expanded", "optimized", "streamlined", "accelerated", "achieved",
            "delivered", "generated", "drove", "spearheaded", "transformed", "revolutionized",
        ]

        # Metric patterns
        self.metric_patterns = [
            r'(\d+(?:\.\d+)?%?)',  # Percentage or number
            r'\$[\d,]+(?:\.\d{2})?',  # Currency
            r'(\d+)\s*(?:users?|customers?|clients?|employees?|hours?|days?|weeks?|months?)',  # Quantities
        ]

    async def generate_star_bullets(
        self,
        experience_item: Dict[str, Any],
        job_requirements: Optional[List[str]] = None,
        tone: str = "achievement",
        max_bullets: int = 3,
    ) -> Dict[str, Any]:
        """
        Generate STAR format bullets from experience description

        Args:
            experience_item: Experience item with description, company, position, etc.
            job_requirements: Job requirements to align bullets with
            tone: Writing tone (professional, achievement, impact, concise)
            max_bullets: Maximum number of bullets to generate

        Returns:
            Dictionary with STAR bullets and metadata
        """
        try:
            tone_enum = Tone(tone.lower())

            description = experience_item.get("description", "")
            if isinstance(description, list):
                description = " ".join(description)

            if not description.strip():
                return {"star_bullets": [], "keyword_infused": False, "impact_score": 0.0}

            logger.info(f"Generating STAR bullets for experience")

            # Extract components from description
            components = await self._extract_star_components(description)

            # Generate multiple STAR bullets
            bullets = []
            for i in range(min(max_bullets, len(components) if components else 1)):
                bullet = await self._generate_single_star_bullet(
                    components[i] if i < len(components) else components[0] if components else None,
                    experience_item,
                    tone_enum,
                    job_requirements,
                )
                if bullet:
                    bullets.append(bullet)

            # Calculate keyword infusion
            keyword_infused = await self._check_keyword_infused(bullets, job_requirements)

            # Calculate impact score
            impact_score = await self._calculate_impact_score(bullets)

            return {
                "star_bullets": bullets,
                "keyword_infused": keyword_infused,
                "impact_score": impact_score,
                "tone": tone,
                "components_found": len(components) if components else 0,
            }

        except Exception as e:
            logger.error(f"Failed to generate STAR bullets: {e}")
            return {"star_bullets": [], "keyword_infused": False, "impact_score": 0.0}

    async def _extract_star_components(self, description: str) -> List[STARComponents]:
        """Extract STAR components from description"""
        components = []

        # Split description into sentences
        sentences = re.split(r'[.!?]+', description)
        sentences = [s.strip() for s in sentences if s.strip()]

        for sentence in sentences:
            component = STARComponents()

            # Extract situation (context, background)
            situation_patterns = [
                r'(?:during|in|at|when|while|as)\s+([^,.;]+?)(?:\s*,|\s*;|\s*\.)',
                r'(?:responsible\s+for|worked\s+on|handled|managed)\s+([^,.;]+?)(?:\s*,|\s*;|\s*\.)',
            ]

            for pattern in situation_patterns:
                match = re.search(pattern, sentence, re.IGNORECASE)
                if match:
                    component.situation = match.group(1).strip()
                    break

            # Extract task (what was done)
            task_patterns = [
                r'(?:to|for)\s+([^,.;]+?)(?:\s*,|\s*;|\s*\.)',
                r'(?:developed|created|built|designed|implemented|managed)\s+([^,.;]+?)(?:\s*,|\s*;|\s*\.)',
            ]

            for pattern in task_patterns:
                match = re.search(pattern, sentence, re.IGNORECASE)
                if match:
                    component.task = match.group(1).strip()
                    break

            # Extract action (how it was done)
            action_patterns = [
                r'(?:by|through|using|via|with)\s+([^,.;]+?)(?:\s*,|\s*;|\s*\.|resulting|leading)',
            ]

            for pattern in action_patterns:
                match = re.search(pattern, sentence, re.IGNORECASE)
                if match:
                    component.action = match.group(1).strip()
                    break

            # Extract result (outcome)
            result_patterns = [
                r'(?:resulting\s+in|leading\s+to|achieving|delivering|generating)\s+([^,.;]+?)(?:\s*,|\s*;|\s*\.|$)'
            ]

            for pattern in result_patterns:
                match = re.search(pattern, sentence, re.IGNORECASE)
                if match:
                    component.result = match.group(1).strip()
                    break

            # Extract metrics
            for pattern in self.metric_patterns:
                matches = re.findall(pattern, sentence)
                component.impact_metrics.extend(matches)

            # Extract keywords (important terms)
            words = re.findall(r'\b\w+\b', sentence.lower())
            important_words = [word for word in words if len(word) > 4 and word not in ['that', 'this', 'with', 'from']]
            component.keywords.extend(important_words[:5])  # Limit to 5 keywords

            # Only add if we have meaningful components
            if component.task or component.action or component.result:
                components.append(component)

        return components

    async def _generate_single_star_bullet(
        self,
        component: STARComponents,
        experience_item: Dict[str, Any],
        tone: Tone,
        job_requirements: Optional[List[str]] = None,
    ) -> Optional[str]:
        """Generate a single STAR bullet"""
        try:
            if not component:
                return None

            # Use appropriate template based on available components
            template_key = "compact"  # Default

            if component.situation and component.task and component.action and component.result:
                template_key = "full"
            elif component.impact_metrics:
                template_key = "metric"

            template = self.templates[tone][template_key]

            # Fill template with components
            bullet = template

            # Replace placeholders
            replacements = {
                "{situation}": component.situation or experience_item.get("company", "the role"),
                "{task}": component.task or "key responsibilities",
                "{action}": component.action or "implementing strategic initiatives",
                "{result}": component.result or "significant business impact",
            }

            if "{metric}" in bullet and component.impact_metrics:
                replacements["{metric}"] = "performance"
                replacements["{percentage}"] = component.impact_metrics[0]

            for placeholder, value in replacements.items():
                bullet = bullet.replace(placeholder, value)

            # Add impact metrics if available
            if component.impact_metrics and not any(metric in bullet for metric in component.impact_metrics):
                bullet += f" ({', '.join(component.impact_metrics[:2])})"

            # Ensure proper formatting
            bullet = self._format_star_bullet(bullet, tone)

            return bullet

        except Exception as e:
            logger.warning(f"Failed to generate STAR bullet: {e}")
            return None

    def _format_star_bullet(self, bullet: str, tone: Tone) -> str:
        """Format bullet according to tone and best practices"""
        # Capitalize first letter
        bullet = bullet[0].upper() + bullet[1:] if bullet else bullet

        # Ensure ends with period
        if bullet and not bullet.endswith('.'):
            bullet += '.'

        # Apply tone-specific formatting
        if tone == Tone.CONCISE:
            # Keep concise bullets as-is
            pass
        elif tone in [Tone.ACHIEVEMENT, Tone.IMPACT]:
            # Add strong action verbs
            bullet = re.sub(r'\b(managed|handled|worked)\b', lambda m: self._get_stronger_verb(m.group(0)), bullet)

        return bullet

    def _get_stronger_verb(self, verb: str) -> str:
        """Get a stronger action verb"""
        verb_map = {
            "managed": "orchestrated",
            "handled": "spearheaded",
            "worked": "executed",
        }
        return verb_map.get(verb.lower(), verb)

    async def _check_keyword_infused(self, bullets: List[str], job_requirements: Optional[List[str]]) -> bool:
        """Check if job requirements keywords are infused in bullets"""
        if not job_requirements or not bullets:
            return False

        bullet_text = " ".join(bullets).lower()
        job_text = " ".join(job_requirements).lower()

        # Extract key terms from job requirements
        job_words = set(re.findall(r'\b\w+\b', job_text))
        job_words = {word for word in job_words if len(word) > 3}  # Filter short words

        # Check coverage in bullets
        bullet_words = set(re.findall(r'\b\w+\b', bullet_text))

        # Calculate keyword coverage
        matched_keywords = job_words.intersection(bullet_words)
        coverage = len(matched_keywords) / len(job_words) if job_words else 0

        return coverage >= 0.3  # At least 30% keyword coverage

    async def _calculate_impact_score(self, bullets: List[str]) -> float:
        """Calculate impact score of STAR bullets"""
        if not bullets:
            return 0.0

        total_score = 0.0

        for bullet in bullets:
            score = 0.0

            # Check for impact keywords
            bullet_lower = bullet.lower()
            for keyword in self.impact_keywords:
                if keyword in bullet_lower:
                    score += 0.5
                    break

            # Check for metrics
            for pattern in self.metric_patterns:
                if re.search(pattern, bullet):
                    score += 1.0
                    break

            # Check for action verbs
            for category, verbs in self.action_verbs.items():
                for verb in verbs:
                    if verb in bullet_lower:
                        score += 0.3
                        break

            # Check length (optimal 15-25 words)
            word_count = len(bullet.split())
            if 15 <= word_count <= 25:
                score += 0.5
            elif word_count < 15:
                score += 0.2

            total_score += score

        # Average score across bullets
        avg_score = total_score / len(bullets)

        # Normalize to 0-10 scale
        return min(avg_score * 2, 10.0)

    async def generate_bulk_star_bullets(
        self,
        experience_items: List[Dict[str, Any]],
        job_requirements: Optional[List[str]] = None,
        tone: str = "achievement",
    ) -> List[Dict[str, Any]]:
        """Generate STAR bullets for multiple experience items"""
        try:
            results = []

            # Process in parallel with concurrency limit
            semaphore = asyncio.Semaphore(5)  # Limit concurrent requests

            async def process_item(item):
                async with semaphore:
                    return await self.generate_star_bullets(
                        experience_item=item,
                        job_requirements=job_requirements,
                        tone=tone,
                    )

            tasks = [process_item(item) for item in experience_items]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Handle exceptions
            processed_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.warning(f"Failed to process item {i}: {result}")
                    processed_results.append({"star_bullets": [], "error": str(result)})
                else:
                    processed_results.append(result)

            return processed_results

        except Exception as e:
            logger.error(f"Failed to generate bulk STAR bullets: {e}")
            return []

    async def optimize_star_bullets(
        self,
        bullets: List[str],
        job_requirements: List[str],
        target_keywords: List[str],
    ) -> List[str]:
        """Optimize existing STAR bullets for better keyword integration"""
        try:
            optimized_bullets = []

            for bullet in bullets:
                # Analyze current bullet
                current_keywords = re.findall(r'\b\w+\b', bullet.lower())

                # Identify missing target keywords
                missing_keywords = []
                for keyword in target_keywords:
                    keyword_lower = keyword.lower()
                    if keyword_lower not in current_keywords:
                        missing_keywords.append(keyword)

                # Infuse missing keywords naturally
                if missing_keywords:
                    optimized_bullet = await self._infuse_keywords_naturally(
                        bullet, missing_keywords[:2]  # Limit to 2 keywords per bullet
                    )
                    optimized_bullets.append(optimized_bullet)
                else:
                    optimized_bullets.append(bullet)

            return optimized_bullets

        except Exception as e:
            logger.error(f"Failed to optimize STAR bullets: {e}")
            return bullets

    async def _infuse_keywords_naturally(
        self,
        bullet: str,
        keywords: List[str],
    ) -> str:
        """Infuse keywords into bullet naturally"""
        try:
            # Simple keyword infusion strategy
            infused_bullet = bullet

            for keyword in keywords:
                # Find good insertion points (after action verbs)
                action_verbs = ['led', 'managed', 'developed', 'created', 'implemented', 'designed']

                for verb in action_verbs:
                    if verb in infused_bullet.lower():
                        # Insert keyword after verb
                        pattern = rf'\b{verb}\b\s+'
                        infused_bullet = re.sub(
                            pattern,
                            f'{verb} {keyword} ',
                            infused_bullet,
                            flags=re.IGNORECASE,
                            count=1
                        )
                        break

            return infused_bullet

        except Exception:
            return bullet

    async def evaluate_star_quality(self, bullets: List[str]) -> Dict[str, Any]:
        """Evaluate the quality of STAR bullets"""
        try:
            evaluation = {
                "overall_score": 0.0,
                "criteria_scores": {},
                "recommendations": [],
            }

            if not bullets:
                return evaluation

            # Evaluate different criteria
            criteria_scores = {
                "star_structure": await self._evaluate_star_structure(bullets),
                "impact_level": await self._evaluate_impact_level(bullets),
                "keyword_integration": await self._evaluate_keyword_integration(bullets),
                "readability": await self._evaluate_readability(bullets),
            }

            evaluation["criteria_scores"] = criteria_scores

            # Calculate overall score
            weights = {
                "star_structure": 0.3,
                "impact_level": 0.3,
                "keyword_integration": 0.2,
                "readability": 0.2,
            }

            overall_score = sum(
                criteria_scores[criterion] * weights[criterion]
                for criterion in criteria_scores
            )

            evaluation["overall_score"] = overall_score

            # Generate recommendations
            evaluation["recommendations"] = await self._generate_recommendations(criteria_scores)

            return evaluation

        except Exception as e:
            logger.error(f"Failed to evaluate STAR quality: {e}")
            return evaluation

    async def _evaluate_star_structure(self, bullets: List[str]) -> float:
        """Evaluate how well bullets follow STAR structure"""
        total_score = 0.0

        for bullet in bullets:
            score = 0.0

            # Check for situation indicators
            if any(word in bullet.lower() for word in ['in', 'during', 'at', 'when']):
                score += 0.25

            # Check for action verbs
            action_verb_found = False
            for verbs in self.action_verbs.values():
                for verb in verbs:
                    if verb in bullet.lower():
                        action_verb_found = True
                        break
                if action_verb_found:
                    break
            if action_verb_found:
                score += 0.25

            # Check for results
            if any(word in bullet.lower() for word in ['resulting', 'achieved', 'delivered', 'improved']):
                score += 0.25

            # Check for metrics
            for pattern in self.metric_patterns:
                if re.search(pattern, bullet):
                    score += 0.25
                    break

            total_score += score

        return total_score / len(bullets) if bullets else 0.0

    async def _evaluate_impact_level(self, bullets: List[str]) -> float:
        """Evaluate the impact level of bullets"""
        total_score = 0.0

        for bullet in bullets:
            score = 0.0
            bullet_lower = bullet.lower()

            # Check for impact keywords
            for keyword in self.impact_keywords:
                if keyword in bullet_lower:
                    score += 0.4
                    break

            # Check for metrics
            for pattern in self.metric_patterns:
                if re.search(pattern, bullet):
                    score += 0.4
                    break

            # Check for business impact words
            impact_words = ['revenue', 'profit', 'efficiency', 'productivity', 'quality', 'satisfaction']
            for word in impact_words:
                if word in bullet_lower:
                    score += 0.2
                    break

            total_score += score

        return total_score / len(bullets) if bullets else 0.0

    async def _evaluate_keyword_integration(self, bullets: List[str]) -> float:
        """Evaluate keyword integration (placeholder - would need job context)"""
        # This would be more sophisticated with job description context
        return 0.7  # Placeholder score

    async def _evaluate_readability(self, bullets: List[str]) -> float:
        """Evaluate readability of bullets"""
        total_score = 0.0

        for bullet in bullets:
            score = 0.0

            # Check length (optimal 15-25 words)
            word_count = len(bullet.split())
            if 15 <= word_count <= 25:
                score += 0.5
            elif 10 <= word_count <= 30:
                score += 0.3

            # Check for complex sentences (prefer shorter sentences)
            sentence_count = len(re.findall(r'[.!?]', bullet))
            avg_words_per_sentence = word_count / sentence_count if sentence_count > 0 else word_count

            if avg_words_per_sentence <= 20:
                score += 0.5
            elif avg_words_per_sentence <= 30:
                score += 0.3

            total_score += score

        return total_score / len(bullets) if bullets else 0.0

    async def _generate_recommendations(self, criteria_scores: Dict[str, float]) -> List[str]:
        """Generate recommendations based on evaluation scores"""
        recommendations = []

        if criteria_scores.get("star_structure", 0) < 0.6:
            recommendations.append("Add more specific details about situation, actions, and results")

        if criteria_scores.get("impact_level", 0) < 0.6:
            recommendations.append("Include more quantifiable metrics and impact statements")

        if criteria_scores.get("readability", 0) < 0.6:
            recommendations.append("Shorten complex sentences and aim for 15-25 words per bullet")

        if not recommendations:
            recommendations.append("STAR bullets look well-structured and impactful")

        return recommendations
