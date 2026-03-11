"""
AI service for metadata and quiz generation using Google Gemini.
Uses the new google-genai SDK with structured JSON output.
Includes retry logic with model fallback.
"""
import json
import logging
import asyncio
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

    # "All questions" mode: detect questions first, then generate in batches.
    if num_questions <= 0:
        return await _generate_all_questions(text, progress_callback=progress_callback)

    batch_size = 50
    if num_questions <= batch_size:
        await _emit_progress(progress_callback, 20, "Generating quiz batch 1/1")
        result = await _generate_quiz_batch(truncated, num_questions)
        await _emit_progress(progress_callback, 100, f"Generated {len(result)} questions")
        return result

    all_questions: list[dict] = []
    seen_question_keys: set[str] = set()
    batch_num = 0
    stalled_batches = 0
    max_stalled_batches = 3

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
        batch_size=50,
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
    for q in questions:
        if not q.get("question_text"):
            continue

        question_text = str(q["question_text"]).strip()
        if not question_text:
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
    return validated


def _question_key(question_text: str) -> str:
    return " ".join(question_text.lower().strip().split())


def _merge_unique_questions(target: list, incoming: list, seen_keys: set[str]) -> int:
    added = 0
    for question in incoming:
        key = _question_key(question.get("question_text", ""))
        if not key or key in seen_keys:
            continue
        seen_keys.add(key)
        target.append(question)
        added += 1
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


def _chunk_text_for_detection(text: str, chunk_chars: int = 12000, overlap_chars: int = 800) -> list[str]:
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
    # Split the budget between questions and material text
    questions_max = max_len // 3  # ~1/3 for questions
    material_max = max_len - questions_max  # ~2/3 for material (answers need more context)

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
                batch_size=50,
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
    batch_size: int = 50,
    progress_callback: ProgressCallback = None,
) -> list:
    """Generate quiz answers/options for known questions in batches using material context."""
    all_quizzes: list[dict] = []
    seen_question_keys: set[str] = set()

    for i in range(0, len(question_texts), batch_size):
        missing_questions = question_texts[i:i + batch_size]
        attempts = 0

        while missing_questions and attempts < 3:
            attempts += 1
            batch_prompt = """
You are an expert educational quiz creator.
Given the STUDY MATERIAL and QUESTIONS below, generate one MCQ object per question.

Rules:
- Keep each question_text exactly as provided.
- Use the study material as the primary source for selecting the correct answer.
- Return ONLY valid JSON (no markdown, no code fences) as an array.
- Include exactly 4 options per question and exactly 1 correct option.

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

                generated_keys = {_question_key(q["question_text"]) for q in validated_batch}
                missing_questions = [
                    q_text for q_text in missing_questions
                    if _question_key(q_text) not in generated_keys
                ]
                logger.info(
                    f"Questions+material batch {i//batch_size + 1} attempt {attempts}: "
                    f"generated {len(validated_batch)}, missing {len(missing_questions)}"
                )
                progress = int(((i + len(question_texts[i:i + batch_size]) - len(missing_questions)) / max(1, len(question_texts))) * 100)
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
            logger.warning(
                f"Questions+material batch {i//batch_size + 1}: "
                f"could not generate {len(missing_questions)} question(s) after retries"
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
    """Detect question texts from a document, chunking long inputs."""
    chunks = _chunk_text_for_detection(text, chunk_chars=12000, overlap_chars=800)
    if not chunks:
        return []

    detected_questions: list[str] = []

    for idx, chunk in enumerate(chunks):
        prompt = """
You are an expert at extracting exam questions. Analyze the following material and return ONLY a JSON array of question texts you find. Do NOT generate answers or options. Example:
[
  "What is the capital of France?",
  "Explain the process of photosynthesis.",
  ...
]
TEXT TO ANALYZE:
""" + chunk

        try:
            raw = await _call_gemini_with_fallback(
                prompt,
                temperature=0.2,
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
            progress = int(((idx + 1) / max(1, len(chunks))) * 100)
            await _emit_progress(
                progress_callback,
                progress,
                f"Detected questions chunk {idx + 1}/{len(chunks)}",
            )
        except Exception as e:
            logger.error(f"Question detection failed in chunk {idx + 1}/{len(chunks)}: {e}")

    deduped = _dedupe_question_texts(detected_questions)
    logger.info(f"Detected {len(deduped)} unique questions across {len(chunks)} chunk(s)")
    return deduped


async def generate_all_quiz_questions_stepwise(
    text: str,
    batch_size: int = 50,
    progress_callback: ProgressCallback = None,
) -> list:
    """Step-by-step: detect all questions, then batch quiz generation."""
    async def detection_progress(p: int, stage: str):
        mapped = int(p * 0.35)
        await _emit_progress(progress_callback, mapped, stage)

    detected_questions = await detect_questions(text, progress_callback=detection_progress)
    logger.info(f"Stepwise detected {len(detected_questions)} questions")
    if not detected_questions:
        return []

    all_quizzes: list[dict] = []
    seen_question_keys: set[str] = set()

    for i in range(0, len(detected_questions), batch_size):
        batch_questions = detected_questions[i:i+batch_size]
        missing_questions = batch_questions[:]
        attempts = 0

        while missing_questions and attempts < 3:
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

                generated_keys = {_question_key(q["question_text"]) for q in validated_batch}
                missing_questions = [
                    q_text for q_text in missing_questions
                    if _question_key(q_text) not in generated_keys
                ]
                logger.info(
                    f"Batch {i//batch_size + 1} attempt {attempts}: "
                    f"generated {len(validated_batch)}, missing {len(missing_questions)}"
                )
                progress = 35 + int((len(all_quizzes) / max(1, len(detected_questions))) * 65)
                await _emit_progress(
                    progress_callback,
                    progress,
                    f"Generated {len(all_quizzes)}/{len(detected_questions)} questions",
                )
            except Exception as e:
                logger.error(f"Batch {i//batch_size + 1} attempt {attempts} failed: {e}")
                break

        if missing_questions:
            logger.warning(
                f"Batch {i//batch_size + 1}: could not generate "
                f"{len(missing_questions)} question(s) after retries"
            )

    logger.info(f"Stepwise generated {len(all_quizzes)} quizzes")
    await _emit_progress(
        progress_callback,
        100,
        f"Stepwise generation finished: {len(all_quizzes)}/{len(detected_questions)} questions",
    )
    return all_quizzes
