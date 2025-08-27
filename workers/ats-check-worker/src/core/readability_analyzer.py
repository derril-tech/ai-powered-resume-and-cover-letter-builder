"""
Readability Analyzer
Provides readability metrics for resume text content.
"""

from typing import Dict, Any


class ReadabilityAnalyzer:
    """Computes lightweight readability metrics (no heavy deps)."""

    async def analyze_readability(self, text: str) -> Dict[str, Any]:
        words = [w for w in text.split() if w.strip()]
        sentences = [s for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]

        word_count = max(1, len(words))
        sentence_count = max(1, len(sentences))

        # Counts
        syllables = sum(self._count_syllables(w) for w in words)
        letters = sum(c.isalnum() for c in text)
        polysyllables = sum(1 for w in words if self._count_syllables(w) >= 3)

        # Averages
        avg_words_per_sentence = word_count / sentence_count
        avg_syllables_per_word = syllables / word_count

        # Metrics
        # Flesch Reading Ease
        flesch = 206.835 - 1.015 * avg_words_per_sentence - 84.6 * avg_syllables_per_word
        flesch = max(0.0, min(100.0, flesch))

        # Flesch-Kincaid Grade Level
        fkgl = 0.39 * avg_words_per_sentence + 11.8 * avg_syllables_per_word - 15.59

        # Coleman-Liau Index
        L = (letters / word_count) * 100
        S = (sentence_count / word_count) * 100
        coleman = 0.0588 * L - 0.296 * S - 15.8

        # Automated Readability Index (ARI)
        ari = 4.71 * (letters / word_count) + 0.5 * (word_count / sentence_count) - 21.43

        # Gunning Fog Index
        complex_ratio = (polysyllables / word_count) * 100
        gunning_fog = 0.4 * (avg_words_per_sentence + complex_ratio)

        # SMOG (approximation)
        smog = 1.043 * (polysyllables * (30 / sentence_count)) ** 0.5 + 3.1291

        return {
            "reading_ease": round(flesch, 1),
            "fk_grade": round(fkgl, 2),
            "coleman_liau": round(coleman, 2),
            "ari": round(ari, 2),
            "gunning_fog": round(gunning_fog, 2),
            "smog": round(smog, 2),
            "avg_words_per_sentence": round(avg_words_per_sentence, 2),
            "avg_syllables_per_word": round(avg_syllables_per_word, 2),
            "word_count": word_count,
            "sentence_count": sentence_count,
            "polysyllables": polysyllables,
            "recommendations": self._recommendations(flesch, avg_words_per_sentence),
        }

    def _count_syllables(self, word: str) -> int:
        word = word.lower()
        vowels = "aeiouy"
        count = 0
        prev_vowel = False
        for ch in word:
            is_vowel = ch in vowels
            if is_vowel and not prev_vowel:
                count += 1
            prev_vowel = is_vowel
        if word.endswith("e") and count > 1:
            count -= 1
        return max(1, count)

    def _recommendations(self, reading_ease: float, avg_wps: float):
        recs = []
        if reading_ease < 50:
            recs.append("Shorten sentences and simplify wording for clarity")
        if avg_wps > 25:
            recs.append("Split long sentences; aim for 15–25 words per bullet")
        return recs


