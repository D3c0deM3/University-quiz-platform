"""
AI service for metadata and quiz generation using Google Gemini.
Uses the new google-genai SDK with structured JSON output.
Includes retry logic with model fallback.
"""
import json
import logging
import asyncio
import re
from typing import Awaitable, Callable, List, Optional

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)

ProgressCallback = Optional[Callable[[int, str], Awaitable[None]]]

# Configure client
client = genai.Client(api_key=settings.AI_API_KEY)

# Fallback model chain - try primary model first, then fallbacks
FALLBACK_MODELS = [
    settings.AI_MODEL,
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash",
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

QUIZ_PROMPT = """You are an expert educational quiz creator. Analyze the following material and create quiz questions.

IMPORTANT: First, determine the type of material:

**Case A - Material already contains questions:**
If the text contains existing questions (e.g., exam papers, question banks, test sheets), extract those questions exactly as they are.
- Preserve the original question text word-for-word
- If the material provides answer options, use them as-is
- If the material does NOT provide answer options, create 4 plausible MCQ options yourself and mark the correct one
- Use your knowledge to determine the correct answer for each question
- Provide an explanation for why the answer is correct
- Extract ALL questions found in the material

**Case B - Material is educational content (textbook, lecture notes, articles, etc.):**
Generate original quiz questions based on the content.
- Create exactly {num_questions} questions from the material
- Questions must be directly answerable from the provided text
- Vary difficulty: some easy, some medium, some challenging

For BOTH cases, return ONLY valid JSON (no markdown, no code fences) as an array of question objects:
[
  {{
    "question_text": "The question",
    "question_type": "MCQ",
    "options": [
      {{"text": "Option A", "is_correct": false}},
      {{"text": "Option B", "is_correct": true}},
      {{"text": "Option C", "is_correct": false}},
      {{"text": "Option D", "is_correct": false}}
    ],
    "explanation": "Why the correct answer is correct"
  }}
]

Rules for ALL questions:
- All questions must be MCQ (multiple choice) with exactly 4 options and exactly 1 correct answer
- question_type must always be "MCQ"
- You MUST generate exactly {num_questions} questions. Do NOT stop early.

TEXT TO ANALYZE:
"""

QUESTIONS_WITH_MATERIAL_PROMPT = """You are an expert educational quiz creator with a strict accuracy mandate.

You are given TWO separate documents:
1. **QUESTIONS DOCUMENT** — contains existing questions (exam papers, question banks, test sheets)
2. **STUDY MATERIAL DOCUMENT** — contains educational content (textbook, lecture notes, articles) that holds the answers to those questions

YOUR TASK:
- Extract questions from the QUESTIONS DOCUMENT exactly as they are (word-for-word)
- Find the correct answer for each question STRICTLY from the STUDY MATERIAL DOCUMENT only
- Do NOT use your own knowledge to determine answers — every correct answer MUST be found in or directly derived from the study material text
- If a question's answer cannot be found in the study material, still include the question but mark explanation as "Answer not found in provided study material" and make your best guess based solely on the material content
- You MAY generate 4 MCQ answer options yourself (including plausible distractors), but the correct option MUST come from the study material
- Provide an explanation that quotes or references the relevant part of the study material where the answer was found

ACCURACY RULES:
- The correct answer MUST be sourced from the study material document, NOT from your training data
- When creating wrong options (distractors), make them plausible but clearly incorrect based on the study material
- If the questions document already provides answer options, preserve them but verify the correct answer against the study material
- Include a brief quote or reference from the study material in the explanation to prove the answer's source

Return ONLY valid JSON (no markdown, no code fences) as an array of question objects:
[
  {{
    "question_text": "The exact question from the questions document",
    "question_type": "MCQ",
    "options": [
      {{"text": "Option A", "is_correct": false}},
      {{"text": "Option B", "is_correct": true}},
      {{"text": "Option C", "is_correct": false}},
      {{"text": "Option D", "is_correct": false}}
    ],
    "explanation": "According to the study material: [quote or reference from study material]. This confirms that the correct answer is Option B."
  }}
]

Rules:
- All questions must be MCQ (multiple choice) with exactly 4 options and exactly 1 correct answer
- question_type must always be "MCQ"
- Extract up to {num_questions} questions from the questions document
- NEVER invent answers from your own knowledge — answers must come from the study material

===== QUESTIONS DOCUMENT =====
{questions_text}

===== STUDY MATERIAL DOCUMENT =====
"""

QUIZ_STRUCTURE_CHECK_PROMPT = """You are an expert file analyzer. Determine if the following text represents a STRUCTURED QUIZ format.
A structured quiz format means the text PRIMARILY consists of:
1. Questions
2. Followed by specific multiple-choice options (A/B/C/D, bullet points, or similar list format)

Examples of STRUCTURED QUIZ:
1. Question text?
A) Option
B) Option
C) Option

Also valid if separated by symbols like "+++++" (between questions) and "=====" (between options).

Examples of NOT structured quiz:
- A textbook chapter with a few review questions at the end
- An article about history
- A list of questions WITHOUT options

Does this text look like a pre-formatted quiz with questions AND options?
Return ONLY valid JSON: {"is_structured_quiz": boolean, "confidence": float}
TEXT TO ANALYZE:
"""

QUIZ_FULL_EXTRACTION_PROMPT = """You are an expert data extractor. The text below contains a quiz with questions and their options.
Your task is to extract EVERY question along with its options and correct answer (if indicated).

Be extremely thorough. Do not skip ANY questions.
Look for special delimiters:
- "+++++" often separates distinct questions.
- "=====" often separates options or lines.
- "#" or bolding often marks the CORRECT answer.

Rules:
- Extract textual questions exactly as they appear.
- Extract all provided options for each question.
- If the correct answer is marked (e.g. starts with #, bolded, asterisk *, underlined, explicitly stated, or in a separate key), mark `is_correct: true` for that option.
- If an option starts with "#" or similar marker, REMOVE that marker from the option text but set is_correct=true.
- If no correct answer is indicated, mark ALL options as `is_correct: false` (or make a best guess if you are confident).
- Return a valid JSON array of objects.

JSON Format:
[
  {
    "question_text": "...",
    "question_type": "MCQ",
    "options": [
      {"text": "...", "is_correct": boolean},
      ...
    ],
    "explanation": "..."
  }
]

TEXT TO EXTRACT:
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


async def _emit_progress(progress_callback: ProgressCallback, progress: int, stage: str) -> None:
    if not progress_callback:
        return
    try:
        await progress_callback(max(0, min(100, int(progress))), stage)
    except Exception as e:
        logger.warning(f"Failed to emit progress update: {e}")


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


async def generate_quiz_questions(
    text: str,
    num_questions: int = 10,
    progress_callback: ProgressCallback = None,
) -> list:
    """
    Generate quiz questions from extracted text via Google Gemini.
    Supports batching for large question counts (>50 per batch).
    If num_questions <= 0, extracts ALL questions found in the material.
    Returns list of: { question_text, question_type, options, explanation }
    """
    if not settings.AI_API_KEY:
        raise ValueError("AI_API_KEY is not configured")

    max_len = settings.MAX_TEXT_LENGTH
    truncated = text[:max_len] if len(text) > max_len else text

    # NEW: Attempt to identify if the file is ALREADY a structured quiz
    # This prevents the AI from generating 1500 questions from a 250-question file
    # by correctly parsing the existing structure instead of treating it as raw content.
    if num_questions <= 0 or num_questions > 2:
        try:
            structured_questions = await try_extract_structured_quiz(truncated, progress_callback=progress_callback)
            if structured_questions and len(structured_questions) > 0:
                logger.info(f"Structured quiz extraction successful: {len(structured_questions)} questions found.")
                
                # If the user asked for a specific number but we found more, return what was asked? 
                # Or if the user asked for 10 and we found 250, maybe return all?
                # The user's complaint suggests they want the real questions, not generated ones.
                # So we prioritize the extracted questions.
                
                if num_questions > 0 and len(structured_questions) > num_questions:
                    # If the difference is huge (e.g. asked 20, found 200), return 20.
                    # But if asked 250 and found 252, return all.
                     return structured_questions[:num_questions]
                
                return structured_questions
                
        except Exception as e:
            logger.warning(f"Structured quiz extraction check failed: {e}")

    # "All questions" mode: detect questions first, then generate in batches.
    if num_questions <= 0:
        return await _generate_all_questions(text, progress_callback=progress_callback)

    batch_size = 30
    if num_questions <= batch_size:
        await _emit_progress(progress_callback, 20, "Generating quiz batch 1/1")
        result = await _generate_quiz_batch(truncated, num_questions)
        await _emit_progress(progress_callback, 100, f"Generated {len(result)} questions")
        return result

    all_questions: list[dict] = []
    seen_question_keys: set[str] = set()
    batch_num = 0
    stalled_batches = 0
    max_stalled_batches = 5

    while len(all_questions) < num_questions and stalled_batches < max_stalled_batches:
        remaining = num_questions - len(all_questions)
        current_batch_size = min(batch_size, remaining)
        batch_num += 1
        logger.info(
            f"Generating quiz batch {batch_num} "
            f"({current_batch_size} requested, {remaining} remaining)"
        )

        try:
            batch = await _generate_quiz_batch(
                truncated,
                current_batch_size,
                offset=len(all_questions),
                total=num_questions,
                existing_question_texts=[q["question_text"] for q in all_questions[-150:]],
            )
        except Exception as e:
            logger.error(f"Batch {batch_num} failed: {e}")
            if all_questions:
                stalled_batches += 1
                continue
            raise

        added = _merge_unique_questions(all_questions, batch, seen_question_keys)
        if added == 0:
            stalled_batches += 1
            logger.warning(
                f"Batch {batch_num} added no new questions "
                f"({stalled_batches}/{max_stalled_batches} stalled batches)"
            )
        else:
            stalled_batches = 0
            logger.info(
                f"Batch {batch_num} added {added} new questions "
                f"(total: {len(all_questions)}/{num_questions})"
            )
            batch_progress = 15 + int((len(all_questions) / max(1, num_questions)) * 85)
            await _emit_progress(
                progress_callback,
                batch_progress,
                f"Generated {len(all_questions)}/{num_questions} questions",
            )

    if len(all_questions) < num_questions:
        logger.warning(
            f"Requested {num_questions} questions but generated {len(all_questions)} "
            f"after step-by-step batching."
        )
    await _emit_progress(
        progress_callback,
        100,
        f"Finished quiz generation: {len(all_questions)}/{num_questions} questions",
    )

    return all_questions[:num_questions]


async def _generate_all_questions(
    text: str,
    progress_callback: ProgressCallback = None,
) -> list:
    """Extract all questions found in the material with stepwise batching."""
    stepwise_questions = await generate_all_quiz_questions_stepwise(
        text,
        batch_size=30,
        progress_callback=progress_callback,
    )
    if stepwise_questions:
        logger.info(f"Stepwise all-questions generation returned {len(stepwise_questions)} questions")
        await _emit_progress(progress_callback, 100, f"Extracted {len(stepwise_questions)} questions")
        return stepwise_questions

    # Fallback single-shot extraction if stepwise detection yields nothing.
    max_len = settings.MAX_TEXT_LENGTH
    truncated = text[:max_len] if len(text) > max_len else text

    prompt = """You are an expert educational quiz creator. Analyze the following material and extract ALL questions found in it.

If the text contains existing questions (exam papers, question banks, test sheets), extract EVERY question exactly as written.
For each question, create 4 MCQ options with exactly 1 correct answer.
Use your knowledge to determine the correct answer and provide an explanation.

Do NOT skip any questions. Extract every single question you can find in the material.

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

TEXT TO ANALYZE:
""" + truncated

    logger.info("Generating ALL questions from material")
    await _emit_progress(progress_callback, 20, "Fallback all-questions generation")

    try:
        raw = await _call_gemini_with_fallback(prompt, temperature=0.5, max_output_tokens=65536)
        cleaned = _clean_json_response(raw)
        questions = json.loads(cleaned)
        if not isinstance(questions, list):
            raise ValueError("Expected a JSON array of questions")
        validated = _validate_questions(questions)
        logger.info(f"Extracted {len(validated)} questions (all-questions mode)")
        await _emit_progress(progress_callback, 100, f"Extracted {len(validated)} questions")
        return validated
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        return []
    except Exception as e:
        logger.error(f"All-questions generation failed: {e}")
        raise


async def _generate_quiz_batch(
    text: str,
    num_questions: int,
    offset: int = 0,
    total: int = 0,
    existing_question_texts: Optional[list[str]] = None,
) -> list:
    """Generate a single batch of quiz questions."""
    extra_instruction = ""
    if offset > 0:
        extra_instruction = (
            f"\n\nIMPORTANT: This is batch {offset // 50 + 1}. "
            f"You have already generated {offset} questions out of {total} total. "
            f"Generate the NEXT {num_questions} DIFFERENT questions."
        )

    if existing_question_texts:
        previous_sample = json.dumps(existing_question_texts[-50:], ensure_ascii=False)
        extra_instruction += (
            "\n\nDo NOT repeat questions that were already generated. "
            f"Already generated questions (sample): {previous_sample}"
        )

    prompt = QUIZ_PROMPT.replace("{num_questions}", str(num_questions)) + extra_instruction + "\n" + text

    try:
        raw = await _call_gemini_with_fallback(
            prompt,
            temperature=0.6,
            max_output_tokens=min(65536, max(4096, num_questions * 280)),
        )
        cleaned = _clean_json_response(raw)
        questions = json.loads(cleaned)

        if not isinstance(questions, list):
            raise ValueError("Expected a JSON array of questions")

        validated = _validate_questions(questions)
        logger.info(f"Batch generated {len(validated)} valid quiz questions")
        return validated

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini quiz response as JSON: {e}")
        return []
    except Exception as e:
        logger.error(f"Gemini quiz batch generation failed: {e}")
        raise


def _validate_questions(questions: list) -> list:
    """Validate and normalize a list of raw question dicts from the AI."""
    validated = []
    skipped = 0
    for q in questions:
        # AI sometimes returns plain strings instead of dicts — skip them
        if not isinstance(q, dict):
            skipped += 1
            continue

        if not q.get("question_text"):
            skipped += 1
            continue

        question_text = str(q["question_text"]).strip()
        if not question_text:
            skipped += 1
            continue

        validated_q = {
            "question_text": question_text,
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

    if skipped > 0:
        logger.warning(f"_validate_questions: skipped {skipped} questions with empty question_text (kept {len(validated)}/{len(questions)})")
    return validated


def _question_key(question_text: str) -> str:
    """Normalize for dedup.  Uses first 120 non-whitespace characters
    after stripping leading numbering.  This avoids false collisions
    between short but genuinely different questions while still catching
    true duplicates."""
    text = question_text.lower().strip()
    # Remove leading question numbers/letters: "1.", "1)", "a)", "A.", etc.
    text = re.sub(r'^[\d]+[.\)]\s*', '', text)
    text = re.sub(r'^[a-z][.\)]\s*', '', text)
    # Collapse whitespace
    normalized = " ".join(text.split())
    # Use a longer prefix to reduce false collisions
    return normalized[:120] if normalized else ""


def _merge_unique_questions(target: list, incoming: list, seen_keys: set[str]) -> int:
    added = 0
    dedup_skipped = 0
    for question in incoming:
        key = _question_key(question.get("question_text", ""))
        if not key or key in seen_keys:
            if key in seen_keys:
                dedup_skipped += 1
            continue
        seen_keys.add(key)
        target.append(question)
        added += 1
    if dedup_skipped > 0:
        logger.info(f"_merge_unique_questions: added {added}, skipped {dedup_skipped} duplicates (total: {len(target)})")
    return added


def _normalize_words(text: str) -> set[str]:
    """Extract normalized word set from question text for fuzzy matching."""
    text = text.lower().strip()
    text = re.sub(r'^[\d]+[.\)]\s*', '', text)
    text = re.sub(r'^[a-z][.\)]\s*', '', text)
    # Remove punctuation and split
    words = re.sub(r'[^\w\s]', '', text).split()
    # Filter out very short words (articles, etc.) to avoid noise
    return {w for w in words if len(w) > 2}


def _find_covered_input_indices(
    input_questions: list[str],
    generated_questions: list[dict],
) -> set[int]:
    """Find which input question indices were covered by generated quiz objects.

    Uses a two-pass strategy:
    1. Exact key match (fast)
    2. Fuzzy word-overlap match (catches AI rephrasing)

    Returns set of input indices that are considered covered.
    """
    covered: set[int] = set()
    gen_keys = {_question_key(q.get("question_text", "")) for q in generated_questions}
    gen_word_sets = [_normalize_words(q.get("question_text", "")) for q in generated_questions]
    used_gen_indices: set[int] = set()

    for i, input_q in enumerate(input_questions):
        input_key = _question_key(input_q)

        # Pass 1: exact key match
        if input_key in gen_keys:
            covered.add(i)
            continue

        # Pass 2: fuzzy word overlap (Jaccard similarity > 0.45)
        input_words = _normalize_words(input_q)
        if not input_words:
            continue

        best_score = 0.0
        best_gen_idx = -1
        for gi, gen_words in enumerate(gen_word_sets):
            if gi in used_gen_indices or not gen_words:
                continue
            overlap = len(input_words & gen_words)
            union = len(input_words | gen_words)
            score = overlap / union if union > 0 else 0.0
            if score > best_score:
                best_score = score
                best_gen_idx = gi

        if best_score > 0.45 and best_gen_idx >= 0:
            covered.add(i)
            used_gen_indices.add(best_gen_idx)

    return covered


def _create_fallback_quiz(question_text: str) -> dict:
    """Create a minimal quiz object from raw question text when AI generation fails.
    This ensures ZERO question loss — every detected question gets a quiz entry."""
    return {
        "question_text": question_text.strip(),
        "question_type": "MCQ",
        "options": [
            {"text": "A", "is_correct": False},
            {"text": "B", "is_correct": False},
            {"text": "C", "is_correct": False},
            {"text": "D", "is_correct": False},
        ],
        "explanation": "Auto-generated placeholder — AI could not generate options for this question.",
    }


def _create_fallback_quizzes_for_missing(
    detected_questions: list[str],
    all_quizzes: list[dict],
    seen_question_keys: set[str],
) -> int:
    """For every detected question that has no corresponding quiz object,
    create a fallback quiz entry so nothing is lost.
    Returns the number of fallback entries added."""
    existing_keys = {_question_key(q.get("question_text", "")) for q in all_quizzes}
    existing_word_sets = [_normalize_words(q.get("question_text", "")) for q in all_quizzes]
    added = 0

    for q_text in detected_questions:
        q_key = _question_key(q_text)

        # Skip if already covered by exact key
        if q_key in existing_keys:
            continue

        # Skip if already covered by fuzzy match — use HIGH threshold (0.70)
        # to avoid false positives. Better to create a duplicate fallback
        # than to lose a question.
        input_words = _normalize_words(q_text)
        is_covered = False
        if input_words:
            for ews in existing_word_sets:
                if not ews:
                    continue
                overlap = len(input_words & ews)
                union = len(input_words | ews)
                if union > 0 and (overlap / union) > 0.70:
                    is_covered = True
                    break

        if is_covered:
            continue

        # Not covered — create a fallback
        if q_key and q_key not in seen_question_keys:
            fallback = _create_fallback_quiz(q_text)
            all_quizzes.append(fallback)
            seen_question_keys.add(q_key)
            existing_keys.add(q_key)
            existing_word_sets.append(_normalize_words(q_text))
            added += 1

    if added > 0:
        logger.warning(
            f"FALLBACK: Created {added} placeholder quiz entries for questions "
            f"that AI could not generate (total quizzes now: {len(all_quizzes)})"
        )
    return added


def _dedupe_question_texts(questions: list[str]) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()
    for question in questions:
        key = _question_key(question)
        if key and key not in seen:
            seen.add(key)
            deduped.append(question.strip())
    return deduped


def _chunk_text_for_detection(text: str, chunk_chars: int = 15000, overlap_chars: int = 3000) -> list[str]:
    clean_text = text.strip()
    if not clean_text:
        return []
    if len(clean_text) <= chunk_chars:
        return [clean_text]

    chunks: list[str] = []
    start = 0
    text_len = len(clean_text)
    step = max(1, chunk_chars - overlap_chars)
    while start < text_len:
        end = min(text_len, start + chunk_chars)
        chunks.append(clean_text[start:end])
        if end >= text_len:
            break
        start += step
    return chunks


async def generate_quiz_from_questions_and_material(
    questions_text: str,
    material_text: str,
    num_questions: int = 10,
    progress_callback: ProgressCallback = None,
) -> list:
    """
    Scenario 3: Generate quiz by taking questions from a questions file
    and finding answers strictly from the study material file.
    Returns list of: { question_text, question_type, options, explanation }
    """
    if not settings.AI_API_KEY:
        raise ValueError("AI_API_KEY is not configured")

    max_len = settings.MAX_TEXT_LENGTH
    # Give the questions file enough room — it must NOT be truncated when possible
    # since every question matters.  Material can afford truncation more gracefully.
    questions_max = min(len(questions_text), max(max_len // 2, 30000))
    material_max = max(max_len - questions_max, max_len // 3)

    truncated_questions = questions_text[:questions_max] if len(questions_text) > questions_max else questions_text
    truncated_material = material_text[:material_max] if len(material_text) > material_max else material_text

    logger.info(
        f"Generating quiz from questions ({len(truncated_questions)} chars) "
        f"+ material ({len(truncated_material)} chars), requested={num_questions}"
    )

    # Stepwise path for "all questions" or large requests.
    if num_questions <= 0 or num_questions > 50:
        detected_questions = await detect_questions(
            truncated_questions,
            progress_callback=progress_callback,
        )
        if detected_questions:
            target_questions = detected_questions if num_questions <= 0 else detected_questions[:num_questions]
            return await _generate_quiz_for_question_list_with_material(
                target_questions,
                truncated_material,
                batch_size=30,
                progress_callback=progress_callback,
            )
        logger.warning("No questions detected for stepwise questions+material generation; falling back to single-shot.")

    prompt_limit = "all available" if num_questions <= 0 else str(num_questions)
    prompt = (
        QUESTIONS_WITH_MATERIAL_PROMPT
        .replace("{num_questions}", prompt_limit)
        .replace("{questions_text}", truncated_questions)
        + truncated_material
    )

    token_target = 300 if num_questions <= 0 else num_questions

    try:
        await _emit_progress(progress_callback, 30, "Generating quiz from questions and material")
        raw = await _call_gemini_with_fallback(
            prompt,
            temperature=0.3,
            max_output_tokens=min(65536, max(4096, token_target * 250)),
        )
        cleaned = _clean_json_response(raw)
        questions = json.loads(cleaned)

        if not isinstance(questions, list):
            raise ValueError("Expected a JSON array of questions")

        validated = _validate_questions(questions)
        if num_questions > 0:
            await _emit_progress(progress_callback, 100, f"Generated {min(len(validated), num_questions)} questions")
            return validated[:num_questions]
        await _emit_progress(progress_callback, 100, f"Generated {len(validated)} questions")
        return validated

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini quiz response as JSON: {e}")
        return []
    except Exception as e:
        logger.error(f"Gemini quiz generation (questions+material) failed: {e}")
        raise


async def _generate_quiz_for_question_list_with_material(
    question_texts: list[str],
    material_context: str,
    batch_size: int = 30,
    progress_callback: ProgressCallback = None,
) -> list:
    """Generate quiz answers/options for known questions in batches using material context.
    Includes a final reconciliation pass for any questions the AI missed."""
    all_quizzes: list[dict] = []
    seen_question_keys: set[str] = set()
    globally_missing: list[str] = []

    for i in range(0, len(question_texts), batch_size):
        missing_questions = question_texts[i:i + batch_size]
        attempts = 0

        while missing_questions and attempts < 4:
            attempts += 1
            batch_prompt = """
You are an expert educational quiz creator.
Given the STUDY MATERIAL and QUESTIONS below, generate one MCQ object per question.

Rules:
- Keep each question_text exactly as provided.
- Use the study material as the primary source for selecting the correct answer.
- Return ONLY valid JSON (no markdown, no code fences) as an array.
- Include exactly 4 options per question and exactly 1 correct option.
- You MUST return exactly one quiz object for EACH question. Do NOT skip any.

===== STUDY MATERIAL =====
""" + material_context + """

===== QUESTIONS =====
""" + json.dumps(missing_questions, ensure_ascii=False)

            try:
                raw = await _call_gemini_with_fallback(
                    batch_prompt,
                    temperature=0.3,
                    max_output_tokens=65536,
                )
                cleaned = _clean_json_response(raw)
                batch_quizzes = json.loads(cleaned)
                if not isinstance(batch_quizzes, list):
                    raise ValueError("Expected a JSON array of question objects")

                validated_batch = _validate_questions(batch_quizzes)
                _merge_unique_questions(all_quizzes, validated_batch, seen_question_keys)

                # Use fuzzy matching to find which input questions were covered
                covered_indices = _find_covered_input_indices(missing_questions, validated_batch)
                missing_questions = [
                    q_text for idx, q_text in enumerate(missing_questions)
                    if idx not in covered_indices
                ]
                logger.info(
                    f"Questions+material batch {i//batch_size + 1} attempt {attempts}: "
                    f"generated {len(validated_batch)}, covered {len(covered_indices)}, "
                    f"still missing {len(missing_questions)}"
                )
                progress = int(((i + len(question_texts[i:i + batch_size]) - len(missing_questions)) / max(1, len(question_texts))) * 85)
                await _emit_progress(
                    progress_callback,
                    progress,
                    f"Questions+material: {len(all_quizzes)}/{len(question_texts)} generated",
                )
            except Exception as e:
                logger.error(
                    f"Questions+material batch {i//batch_size + 1} attempt {attempts} failed: {e}"
                )
                break

        if missing_questions:
            globally_missing.extend(missing_questions)
            logger.warning(
                f"Questions+material batch {i//batch_size + 1}: "
                f"could not generate {len(missing_questions)} question(s) after retries"
            )

    # ── Final reconciliation pass for globally missing questions ──
    if globally_missing:
        logger.info(
            f"Questions+material reconciliation: retrying {len(globally_missing)} globally missing question(s)"
        )
        await _emit_progress(
            progress_callback,
            88,
            f"Reconciliation: retrying {len(globally_missing)} missing questions",
        )

        reconcile_batch_size = 20
        for i in range(0, len(globally_missing), reconcile_batch_size):
            still_missing = globally_missing[i:i + reconcile_batch_size]
            for attempt in range(3):
                if not still_missing:
                    break
                reconcile_prompt = """You are an expert educational quiz creator. You MUST generate exactly one MCQ quiz object for EACH question below using the study material as the answer source. Do NOT skip any questions.

Return ONLY valid JSON as an array of question objects. Each object must have: question_text, question_type ("MCQ"), options (array of 4), explanation.

===== STUDY MATERIAL =====
""" + material_context + """

QUESTIONS (generate one quiz object per question):
""" + json.dumps(still_missing, ensure_ascii=False)

                try:
                    raw = await _call_gemini_with_fallback(
                        reconcile_prompt,
                        temperature=0.3,
                        max_output_tokens=65536,
                    )
                    cleaned = _clean_json_response(raw)
                    reconciled = json.loads(cleaned)
                    if isinstance(reconciled, list):
                        validated = _validate_questions(reconciled)
                        added = _merge_unique_questions(all_quizzes, validated, seen_question_keys)
                        covered_indices = _find_covered_input_indices(still_missing, validated)
                        still_missing = [
                            q for idx, q in enumerate(still_missing)
                            if idx not in covered_indices
                        ]
                        logger.info(
                            f"Questions+material reconciliation batch {i//reconcile_batch_size + 1} "
                            f"attempt {attempt + 1}: recovered {added}, still missing {len(still_missing)}"
                        )
                except Exception as e:
                    logger.error(
                        f"Questions+material reconciliation batch {i//reconcile_batch_size + 1} "
                        f"attempt {attempt + 1} failed: {e}"
                    )
                    break

    # ── ZERO-LOSS FALLBACK: create placeholder quizzes for any remaining missing questions ──
    fallback_count = _create_fallback_quizzes_for_missing(
        question_texts, all_quizzes, seen_question_keys,
    )
    if fallback_count > 0:
        logger.info(
            f"Questions+material: {fallback_count} fallback quizzes added to ensure zero loss "
            f"(total: {len(all_quizzes)}/{len(question_texts)})"
        )

    final_missing = len(question_texts) - len(all_quizzes)
    if final_missing > 0:
        logger.error(
            f"CRITICAL: Questions+material STILL has {final_missing} missing question(s) after fallback "
            f"out of {len(question_texts)} detected — this should never happen"
        )

    await _emit_progress(
        progress_callback,
        100,
        f"Questions+material finished: {len(all_quizzes)}/{len(question_texts)} generated",
    )
    return all_quizzes


async def detect_questions(
    text: str,
    progress_callback: ProgressCallback = None,
) -> list:
    """Detect question texts from a document, chunking long inputs.
    Uses two passes to maximize detection coverage."""
    chunks = _chunk_text_for_detection(text, chunk_chars=10000, overlap_chars=2000)
    if not chunks:
        return []

    detected_questions: list[str] = []

    for idx, chunk in enumerate(chunks):
        prompt = """You are an expert at extracting exam questions from documents. Your task is to find and extract EVERY question in the text below.

RULES:
- Extract ALL questions, even if they seem similar or repetitive
- Include questions of all types: multiple choice, true/false, short answer, essay, fill-in-the-blank
- Preserve the original question text exactly as written
- Look for numbered questions (1. 2. 3.), lettered questions (a) b) c)), questions with question marks, and imperative prompts ("Explain...", "Describe...", "Define...", "List...", "Compare...")
- Do NOT skip any questions. It is critical that every single question is extracted
- Do NOT generate new questions — only extract existing ones from the text

Return ONLY a valid JSON array of question text strings. Example:
[
  "What is the capital of France?",
  "Explain the process of photosynthesis.",
  "Define the term 'mitosis'."
]

TEXT TO ANALYZE:
""" + chunk

        try:
            raw = await _call_gemini_with_fallback(
                prompt,
                temperature=0.0,
                max_output_tokens=32768,
            )
            cleaned = _clean_json_response(raw)
            questions = json.loads(cleaned)
            if not isinstance(questions, list):
                raise ValueError("Expected a JSON array of question texts")
            chunk_questions = [q for q in questions if isinstance(q, str) and q.strip()]
            logger.info(
                f"Question detection chunk {idx + 1}/{len(chunks)} found {len(chunk_questions)} questions"
            )
            detected_questions.extend(chunk_questions)
            progress = int(((idx + 1) / max(1, len(chunks))) * 80)
            await _emit_progress(
                progress_callback,
                progress,
                f"Detected questions chunk {idx + 1}/{len(chunks)}",
            )
        except Exception as e:
            logger.error(f"Question detection failed in chunk {idx + 1}/{len(chunks)}: {e}")

    deduped = _dedupe_question_texts(detected_questions)
    logger.info(f"Detected {len(deduped)} unique questions across {len(chunks)} chunk(s)")

    # Verification pass: re-scan the full text (or large portion) to catch any missed questions
    if len(text) > 5000:
        verification_sample = text[:80000] if len(text) > 80000 else text
        # Send all detected questions (not just 100) so the verifier knows what exists
        existing_sample = json.dumps(deduped, ensure_ascii=False)
        # Truncate the existing list if it's too large for the prompt
        if len(existing_sample) > 30000:
            existing_sample = json.dumps(deduped[:200], ensure_ascii=False)
        verify_prompt = f"""You are an expert at extracting exam questions. The following text was already analyzed and {len(deduped)} questions were found.

Review the text below CAREFULLY and find any questions that were MISSED in the first pass. Only return questions that are NOT already in the existing list.

Look especially for:
- Questions near page breaks or section boundaries
- Questions that don't follow the standard numbering pattern
- Questions inside tables, sidebars, or boxed sections
- Multi-part questions where sub-parts were missed
- Short one-line questions that might have been overlooked

ALREADY EXTRACTED ({len(deduped)} questions):
{existing_sample}

Return ONLY a valid JSON array of any ADDITIONAL question text strings that were missed. Return an empty array [] if none were missed.

TEXT TO REVIEW:
{verification_sample}"""

        try:
            raw = await _call_gemini_with_fallback(
                verify_prompt,
                temperature=0.0,
                max_output_tokens=32768,
            )
            cleaned = _clean_json_response(raw)
            additional = json.loads(cleaned)
            if isinstance(additional, list):
                additional_questions = [q for q in additional if isinstance(q, str) and q.strip()]
                if additional_questions:
                    existing_keys = {_question_key(q) for q in deduped}
                    newly_found = [q.strip() for q in additional_questions if _question_key(q) not in existing_keys]
                    if newly_found:
                        deduped.extend(newly_found)
                        logger.info(f"Verification pass found {len(newly_found)} additional questions (total: {len(deduped)})")
        except Exception as e:
            logger.warning(f"Verification pass failed (non-critical): {e}")

    await _emit_progress(progress_callback, 100, f"Detected {len(deduped)} questions total")
    return deduped


async def generate_all_quiz_questions_stepwise(
    text: str,
    batch_size: int = 30,
    progress_callback: ProgressCallback = None,
) -> list:
    """Step-by-step: detect all questions, then batch quiz generation.
    Includes a final reconciliation pass for any questions the AI missed."""
    async def detection_progress(p: int, stage: str):
        mapped = int(p * 0.30)
        await _emit_progress(progress_callback, mapped, stage)

    detected_questions = await detect_questions(text, progress_callback=detection_progress)
    logger.info(f"Stepwise detected {len(detected_questions)} questions")
    if not detected_questions:
        return []

    all_quizzes: list[dict] = []
    seen_question_keys: set[str] = set()
    globally_missing: list[str] = []

    for i in range(0, len(detected_questions), batch_size):
        batch_questions = detected_questions[i:i+batch_size]
        missing_questions = batch_questions[:]
        attempts = 0

        while missing_questions and attempts < 4:
            attempts += 1
            batch_prompt = """
You are an expert educational quiz creator. For each question below, generate MCQ options and explanations. Return ONLY valid JSON as an array of question objects:
[
  {
    "question_text": "...",
    "question_type": "MCQ",
    "options": [
      {"text": "Option A", "is_correct": false},
      {"text": "Option B", "is_correct": true},
      {"text": "Option C", "is_correct": false},
      {"text": "Option D", "is_correct": false}
    ],
    "explanation": "..."
  }
]

IMPORTANT: You MUST return exactly one quiz object for EACH question below. Do NOT skip any questions.

QUESTIONS:
""" + json.dumps(missing_questions, ensure_ascii=False)

            try:
                raw = await _call_gemini_with_fallback(
                    batch_prompt,
                    temperature=0.4,
                    max_output_tokens=65536,
                )
                cleaned = _clean_json_response(raw)
                batch_quizzes = json.loads(cleaned)
                if not isinstance(batch_quizzes, list):
                    raise ValueError("Expected a JSON array of question objects")

                validated_batch = _validate_questions(batch_quizzes)
                _merge_unique_questions(all_quizzes, validated_batch, seen_question_keys)

                # Use fuzzy matching to find which input questions were covered
                covered_indices = _find_covered_input_indices(missing_questions, validated_batch)
                missing_questions = [
                    q_text for idx, q_text in enumerate(missing_questions)
                    if idx not in covered_indices
                ]
                logger.info(
                    f"Batch {i//batch_size + 1} attempt {attempts}: "
                    f"generated {len(validated_batch)}, covered {len(covered_indices)}, "
                    f"still missing {len(missing_questions)}"
                )
                progress = 30 + int((len(all_quizzes) / max(1, len(detected_questions))) * 55)
                await _emit_progress(
                    progress_callback,
                    progress,
                    f"Generated {len(all_quizzes)}/{len(detected_questions)} questions",
                )
            except Exception as e:
                logger.error(f"Batch {i//batch_size + 1} attempt {attempts} failed: {e}")
                break

        if missing_questions:
            globally_missing.extend(missing_questions)
            logger.warning(
                f"Batch {i//batch_size + 1}: could not generate "
                f"{len(missing_questions)} question(s) after retries"
            )

    # ── Final reconciliation pass for all globally missing questions ──
    if globally_missing:
        logger.info(
            f"Reconciliation: retrying {len(globally_missing)} globally missing question(s)"
        )
        await _emit_progress(
            progress_callback,
            88,
            f"Reconciliation: retrying {len(globally_missing)} missing questions",
        )

        # Process missing questions in small batches for higher success rate
        reconcile_batch_size = 20
        for i in range(0, len(globally_missing), reconcile_batch_size):
            still_missing = globally_missing[i:i + reconcile_batch_size]
            for attempt in range(3):
                if not still_missing:
                    break
                reconcile_prompt = """You are an expert educational quiz creator. You MUST generate exactly one MCQ quiz object for EACH question below. Do NOT skip any questions.

Return ONLY valid JSON as an array of question objects. Each object must have: question_text, question_type ("MCQ"), options (array of 4), explanation.

QUESTIONS (generate one quiz object per question):
""" + json.dumps(still_missing, ensure_ascii=False)

                try:
                    raw = await _call_gemini_with_fallback(
                        reconcile_prompt,
                        temperature=0.3,
                        max_output_tokens=65536,
                    )
                    cleaned = _clean_json_response(raw)
                    reconciled = json.loads(cleaned)
                    if isinstance(reconciled, list):
                        validated = _validate_questions(reconciled)
                        added = _merge_unique_questions(all_quizzes, validated, seen_question_keys)
                        covered_indices = _find_covered_input_indices(still_missing, validated)
                        still_missing = [
                            q for idx, q in enumerate(still_missing)
                            if idx not in covered_indices
                        ]
                        logger.info(
                            f"Reconciliation batch {i//reconcile_batch_size + 1} attempt {attempt + 1}: "
                            f"recovered {added}, still missing {len(still_missing)}"
                        )
                except Exception as e:
                    logger.error(f"Reconciliation batch {i//reconcile_batch_size + 1} attempt {attempt + 1} failed: {e}")
                    break

    # ── ZERO-LOSS FALLBACK: create placeholder quizzes for any remaining missing questions ──
    fallback_count = _create_fallback_quizzes_for_missing(
        detected_questions, all_quizzes, seen_question_keys,
    )
    if fallback_count > 0:
        logger.info(
            f"Stepwise: {fallback_count} fallback quizzes added to ensure zero loss "
            f"(total: {len(all_quizzes)}/{len(detected_questions)})"
        )

    final_missing = len(detected_questions) - len(all_quizzes)
    if final_missing > 0:
        logger.error(
            f"CRITICAL: Stepwise STILL has {final_missing} missing question(s) after fallback "
            f"out of {len(detected_questions)} detected — this should never happen"
        )

    logger.info(f"Stepwise generated {len(all_quizzes)} quizzes out of {len(detected_questions)} detected")
    await _emit_progress(
        progress_callback,
        100,
        f"Stepwise generation finished: {len(all_quizzes)}/{len(detected_questions)} questions",
    )
    return all_quizzes

async def try_extract_structured_quiz(
    text: str,
    progress_callback: ProgressCallback = None,
) -> Optional[list]:
    """
    Attempt to detect and extract questions from a file that is ALREADY formatted as a quiz.
    Returns a list of Valid AI Quiz Objects if successful, or None if detection failed/not applicable.
    """
    # 1. Quick detection using the first chunk
    chunk_size = 4000
    sample = text[:chunk_size]
    
    check_prompt = QUIZ_STRUCTURE_CHECK_PROMPT + sample
    
    is_structured = False
    try:
        raw = await _call_gemini_with_fallback(check_prompt, temperature=0.0)
        resp = json.loads(_clean_json_response(raw))
        is_structured = bool(resp.get("is_structured_quiz"))
        logger.info(f"Structured quiz detection: {is_structured} (confidence {resp.get('confidence')})")
    except Exception as e:
        logger.warning(f"Structure check failed: {e}")
        return None

    if not is_structured:
        return None

    # 2. Extract full objects from chunks
    await _emit_progress(progress_callback, 10, "Structured quiz detected - extracting...")
    
    # Use smaller chunks (8000 chars) to ensure the AI doesn't get lazy and skip questions
    chunks = _chunk_text_for_detection(text, chunk_chars=8000, overlap_chars=500)
    all_questions = []
    
    for idx, chunk in enumerate(chunks):
        prompt = QUIZ_FULL_EXTRACTION_PROMPT + chunk
        try:
             # Generous token limit for extraction
             raw = await _call_gemini_with_fallback(prompt, temperature=0.1, max_output_tokens=65536)
             batch = json.loads(_clean_json_response(raw))
             
             if not isinstance(batch, list):
                 continue

             validated = _validate_questions(batch)
             
             # Dedup
             existing_keys = {_question_key(q["question_text"]) for q in all_questions}
             new_unique = [q for q in validated if _question_key(q["question_text"]) not in existing_keys]
             
             all_questions.extend(new_unique)
             logger.info(f"Structured extraction chunk {idx+1}/{len(chunks)}: found {len(new_unique)} new questions")
             
             progress = 10 + int(((idx + 1) / len(chunks)) * 80)
             await _emit_progress(progress_callback, progress, f"Extracted {len(all_questions)} structured questions")
             
        except Exception as e:
             logger.error(f"Structured extraction error in chunk {idx}: {e}")

    await _emit_progress(progress_callback, 100, f"Finished structured extraction: {len(all_questions)} total")
    return all_questions
