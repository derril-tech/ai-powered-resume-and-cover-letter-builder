"""
NLP Processor
Handles text preprocessing, tokenization, and basic NLP operations for job descriptions.
"""

import re
import logging
from typing import List, Dict, Any, Optional
import asyncio
from functools import lru_cache

try:
    import spacy
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import sent_tokenize, word_tokenize
    from nltk.stem import WordNetLemmatizer
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    spacy = None
    nltk = None

logger = logging.getLogger(__name__)

class NLPProcessor:
    """Natural Language Processing utilities for job description analysis"""

    def __init__(self):
        self.lemmatizer = WordNetLemmatizer() if nltk else None
        self.nlp_model = None
        self._initialized = False

    async def initialize(self):
        """Initialize NLP models and resources"""
        if self._initialized:
            return

        try:
            if SPACY_AVAILABLE:
                # Download NLTK resources if needed
                try:
                    nltk.data.find('tokenizers/punkt')
                except LookupError:
                    nltk.download('punkt', quiet=True)

                try:
                    nltk.data.find('corpora/stopwords')
                except LookupError:
                    nltk.download('stopwords', quiet=True)

                try:
                    nltk.data.find('corpora/wordnet')
                except LookupError:
                    nltk.download('wordnet', quiet=True)

                # Load spaCy model
                try:
                    self.nlp_model = spacy.load("en_core_web_sm")
                except OSError:
                    logger.warning("spaCy model 'en_core_web_sm' not found. Installing...")
                    import subprocess
                    subprocess.run([
                        "python", "-m", "spacy", "download", "en_core_web_sm"
                    ], check=True)
                    self.nlp_model = spacy.load("en_core_web_sm")

            self._initialized = True
            logger.info("NLP processor initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize NLP processor: {e}")
            # Continue without advanced NLP features
            self._initialized = True

    async def process_text(self, text: str) -> Dict[str, Any]:
        """
        Process text and return structured information

        Args:
            text: Raw text to process

        Returns:
            Dictionary with processed text information
        """
        await self.initialize()

        # Basic text cleaning
        cleaned_text = self._clean_text(text)

        result = {
            'original_text': text,
            'cleaned_text': cleaned_text,
            'sentences': [],
            'tokens': [],
            'entities': [],
            'lemmas': [],
            'pos_tags': [],
        }

        if not SPACY_AVAILABLE or not self.nlp_model:
            # Fallback to basic processing
            result['sentences'] = self._basic_sentence_tokenize(cleaned_text)
            result['tokens'] = self._basic_word_tokenize(cleaned_text)
            return result

        try:
            # Process with spaCy
            doc = self.nlp_model(cleaned_text)

            result['sentences'] = [sent.text for sent in doc.sents]
            result['tokens'] = [token.text for token in doc if not token.is_punct and not token.is_space]
            result['entities'] = [(ent.text, ent.label_) for ent in doc.ents]
            result['lemmas'] = [token.lemma_ for token in doc if not token.is_punct and not token.is_space]
            result['pos_tags'] = [(token.text, token.pos_) for token in doc if not token.is_punct and not token.is_space]

        except Exception as e:
            logger.warning(f"spaCy processing failed, using basic processing: {e}")
            result['sentences'] = self._basic_sentence_tokenize(cleaned_text)
            result['tokens'] = self._basic_word_tokenize(cleaned_text)

        return result

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""

        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)

        # Remove special characters but keep important punctuation
        text = re.sub(r'[^\w\s.,!?-]', '', text)

        # Normalize quotes
        text = re.sub(r'["""]', '"', text)
        text = re.sub(r'[''']', "'", text)

        # Remove multiple consecutive punctuation
        text = re.sub(r'[.,!?-]{2,}', lambda m: m.group(0)[0], text)

        return text.strip()

    def _basic_sentence_tokenize(self, text: str) -> List[str]:
        """Basic sentence tokenization without NLTK"""
        # Simple sentence splitting based on punctuation
        sentences = re.split(r'[.!?]+\s*', text)
        return [s.strip() for s in sentences if s.strip()]

    def _basic_word_tokenize(self, text: str) -> List[str]:
        """Basic word tokenization without NLTK"""
        # Simple word splitting
        words = re.findall(r'\b\w+\b', text.lower())
        return words

    async def extract_sentences(self, text: str) -> List[str]:
        """Extract sentences from text"""
        await self.initialize()

        if not SPACY_AVAILABLE or not self.nlp_model:
            return self._basic_sentence_tokenize(text)

        try:
            doc = self.nlp_model(text)
            return [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        except Exception:
            return self._basic_sentence_tokenize(text)

    async def extract_named_entities(self, text: str) -> List[tuple]:
        """Extract named entities from text"""
        await self.initialize()

        if not SPACY_AVAILABLE or not self.nlp_model:
            return []

        try:
            doc = self.nlp_model(text)
            return [(ent.text, ent.label_) for ent in doc.ents]
        except Exception:
            return []

    async def get_stopwords(self) -> List[str]:
        """Get list of stopwords"""
        await self.initialize()

        if nltk and hasattr(nltk.corpus, 'stopwords'):
            try:
                return stopwords.words('english')
            except Exception:
                pass

        # Fallback stopwords list
        return [
            'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
            'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she',
            'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
            'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
            'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an',
            'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
            'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
            'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
            'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then',
            'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
            'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
            'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can',
            'will', 'just', 'don', 'should', 'now'
        ]

    async def remove_stopwords(self, tokens: List[str]) -> List[str]:
        """Remove stopwords from token list"""
        stopwords_list = await self.get_stopwords()
        return [token for token in tokens if token.lower() not in stopwords_list]

    async def lemmatize_tokens(self, tokens: List[str]) -> List[str]:
        """Lemmatize tokens to their base forms"""
        await self.initialize()

        if not self.lemmatizer:
            return tokens

        try:
            return [self.lemmatizer.lemmatize(token) for token in tokens]
        except Exception:
            return tokens

    async def calculate_text_stats(self, text: str) -> Dict[str, Any]:
        """Calculate basic statistics for the text"""
        processed = await self.process_text(text)

        return {
            'char_count': len(text),
            'word_count': len(processed['tokens']),
            'sentence_count': len(processed['sentences']),
            'avg_word_length': sum(len(word) for word in processed['tokens']) / max(len(processed['tokens']), 1),
            'avg_sentence_length': len(processed['tokens']) / max(len(processed['sentences']), 1),
            'unique_words': len(set(processed['tokens'])),
            'lexical_diversity': len(set(processed['tokens'])) / max(len(processed['tokens']), 1),
        }

    async def detect_language(self, text: str) -> str:
        """Detect the language of the text"""
        # Simple language detection based on common words
        english_words = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can']
        spanish_words = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se']
        french_words = ['le', 'la', 'de', 'et', 'à', 'un', 'il', 'être', 'et']

        text_lower = text.lower()

        english_count = sum(1 for word in english_words if word in text_lower)
        spanish_count = sum(1 for word in spanish_words if word in text_lower)
        french_count = sum(1 for word in french_words if word in text_lower)

        max_count = max(english_count, spanish_count, french_count)

        if max_count == 0:
            return 'unknown'

        if english_count == max_count:
            return 'en'
        elif spanish_count == max_count:
            return 'es'
        else:
            return 'fr'

    async def extract_keywords_by_frequency(
        self,
        text: str,
        max_keywords: int = 10,
        min_length: int = 4
    ) -> List[str]:
        """Extract keywords based on frequency"""
        processed = await self.process_text(text)

        # Filter tokens by length
        filtered_tokens = [token for token in processed['tokens'] if len(token) >= min_length]

        # Remove stopwords
        filtered_tokens = await self.remove_stopwords(filtered_tokens)

        # Count frequency
        from collections import Counter
        word_freq = Counter(filtered_tokens)

        # Return most common keywords
        return [word for word, _ in word_freq.most_common(max_keywords)]
