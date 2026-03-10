"""
AI service for metadata and quiz generation using Google Gemini.
Uses the new google-genai SDK with structured JSON output.
Includes retry logic with model fallback.
"""
import json
import logging
import asyncio
from typing import List, Optional

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)

# Configure client
client = genai.Client(api_key=settings.AI_API_KEY)

# Fallback model chain - try primary model first, then fallbacks
FALLBACK_MODELS = [
    settings.AI_MODEL,
    "gemini-2.5-flash-lite",
]
# Deduplicate while preserving order
_seen = set()
FALLBACK_MODELS = [m for m in FALLBACK_MODELS if not (m in _seen or _seen.add(m))]

MAX_RETRIES = 2
RETRY_BASE_DELAY = 5  # seconds

METADATA_PROMPT = """You are an academic content analyst. Analyze the following educational material text and generate structured metadata.

Return ONLY valid JSON (no markdown, no code fences) with exactly these fields:
{
  "title": "A clear, descriptive title for this material",
  "summary": "A 2-4 sentence summary of the content",
  "keywords": ["keyword1", "keyword2", ...],
  "topics": ["topic1", "topic2", ...],
  "tags": ["tag1", "tag2", ...],
  "difficulty_level": "BEGINNER or INTERMEDIATE or ADVANCED",
  "content_type": "lecture, textbook, article, lab_guide, tutorial, reference, or other"
}

Rules:
- keywords: 5-15 specific terms from the content
- topics: 3-8 broader subject topics
- tags: 3-10 tags useful for categorization/search
- difficulty_level: BEGINNER, INTERMEDIATE, or ADVANCED based on content complexity
- content_type: best matching type from the list above

TEXT TO ANALYZE:
"""

QUIZ_PROMPT = """You are an expert educational quiz creator. Generate quiz questions from the following educational material.

Return ONLY valid JSON (no markdown, no code fences) as an array of question objects:
[
  {
    "question_text": "The question",
    "question_type": "MCQ",
    "options": [
      {"text": "Option A", "is_correct": false},
      {"text": "Option B", "is_correct": true},
      {"text": "Option C", "is_correct": false},
      {"text": "Option D", "is_correct": false}
    ],
    "explanation": "Why the correct answer is correct"
  }
]

Rules:
- Generate exactly {num_questions} questions
- All questions must be MCQ (multiple choice) with exactly 4 options and exactly 1 correct answer
- question_type must always be "MCQ"
- Questions must be directly answerable from the provided text
- Vary difficulty: some easy, some medium, some challenging

TEXT TO CREATE QUESTIONS FROM:
"""


def _clean_json_response(text: str) -> str:
    """Strip markdown code fences and whitespace from Gemini response."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


async def _call_gemini_with_fallback(
    prompt: str,
    temperature: float = 0.3,
    max_output_tokens: int = 2048,
) -> str:
    """
    Call Gemini API with retry + model fallback on rate limits.
    Returns raw text response.
    """
    last_error = None

    for model_name in FALLBACK_MODELS:
        for attempt in range(MAX_RETRIES + 1):
            try:
                logger.info(f"Calling {model_name} (attempt {attempt + 1})")
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=temperature,
                        max_output_tokens=max_output_tokens,
                    ),
                )
                return response.text
            except Exception as e:
                last_error = e
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    if attempt < MAX_RETRIES:
                        delay = RETRY_BASE_DELAY * (2 ** attempt)
                        logger.warning(f"{model_name} rate limited, retrying in {delay}s...")
                        await asyncio.sleep(delay)
                    else:
                        logger.warning(f"{model_name} exhausted retries, trying next model...")
                        break  # move to next model
                else:
                    raise  # Non-rate-limit error, raise immediately

    raise last_error or RuntimeError("All Gemini models exhausted")


async def generate_metadata(text: str) -> dict:
    """
    Generate structured metadata from extracted text via Google Gemini.
    Returns: { title, summary, keywords, topics, tags, difficulty_level, content_type }
    """
    if not settings.AI_API_KEY:
        raise ValueError("AI_API_KEY is not configured")

    max_len = settings.MAX_TEXT_LENGTH
    truncated = text[:max_len] if len(text) > max_len else text
    prompt = METADATA_PROMPT + truncated

    logger.info(f"Generating metadata (text length: {len(truncated)})")

    try:
        raw = await _call_gemini_with_fallback(prompt, temperature=0.3, max_output_tokens=2048)
        cleaned = _clean_json_response(raw)
        metadata = json.loads(cleaned)

        # Validate required fields
        required = ["title", "summary", "keywords", "topics", "tags", "difficulty_level", "content_type"]
        for field in required:
            if field not in metadata:
                metadata[field] = [] if field in ("keywords", "topics", "tags") else ""

        # Normalize difficulty_level
        dl = str(metadata.get("difficulty_level", "")).upper()
        if dl not in ("BEGINNER", "INTERMEDIATE", "ADVANCED"):
            metadata["difficulty_level"] = "INTERMEDIATE"
        else:
            metadata["difficulty_level"] = dl

        logger.info(f"Metadata generated: title='{metadata.get('title', '')[:50]}...'")
        return metadata

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini metadata response as JSON: {e}")
        return {
            "title": "",
            "summary": "",
            "keywords": [],
            "topics": [],
            "tags": [],
            "difficulty_level": "INTERMEDIATE",
            "content_type": "other",
        }
    except Exception as e:
        logger.error(f"Gemini metadata generation failed: {e}")
        raise


async def generate_quiz_questions(text: str, num_questions: int = 10) -> list:
    """
    Generate quiz questions from extracted text via Google Gemini.
    Returns list of: { question_text, question_type, options, explanation }
    """
    if not settings.AI_API_KEY:
        raise ValueError("AI_API_KEY is not configured")

    max_len = settings.MAX_TEXT_LENGTH
    truncated = text[:max_len] if len(text) > max_len else text
    prompt = QUIZ_PROMPT.replace("{num_questions}", str(num_questions)) + truncated

    logger.info(f"Generating {num_questions} quiz questions")

    try:
        raw = await _call_gemini_with_fallback(prompt, temperature=0.7, max_output_tokens=4096)
        cleaned = _clean_json_response(raw)
        questions = json.loads(cleaned)

        if not isinstance(questions, list):
            raise ValueError("Expected a JSON array of questions")

        # Validate and normalize each question
        validated = []
        for q in questions:
            if not q.get("question_text"):
                continue

            validated_q = {
                "question_text": q["question_text"],
                "question_type": "MCQ",
                "options": q.get("options", []),
                "explanation": q.get("explanation", ""),
            }

            if validated_q["options"]:
                validated_q["options"] = [
                    {
                        "text": str(opt.get("text", "")),
                        "is_correct": bool(opt.get("is_correct", False)),
                    }
                    for opt in validated_q["options"]
                    if opt.get("text")
                ]

            validated.append(validated_q)

        logger.info(f"Generated {len(validated)} valid quiz questions")
        return validated

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini quiz response as JSON: {e}")
        return []
    except Exception as e:
        logger.error(f"Gemini quiz generation failed: {e}")
        raise
