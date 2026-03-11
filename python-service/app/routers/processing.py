from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging
import traceback

from app.services.text_extraction import extract_text, chunk_text
from app.services.ai_service import generate_metadata, generate_quiz_questions, generate_quiz_from_questions_and_material

router = APIRouter()
logger = logging.getLogger(__name__)


class ProcessingRequest(BaseModel):
    material_id: str
    file_path: str
    file_type: str
    num_questions: int = 10


class QuestionsWithMaterialRequest(BaseModel):
    material_id: str
    file_path: str
    file_type: str
    questions_file_path: str
    questions_file_type: str
    num_questions: int = 10


class ProcessingResponse(BaseModel):
    material_id: str
    status: str
    metadata: Optional[dict] = None
    text_chunks: Optional[List[str]] = None
    quiz_questions: Optional[list] = None
    error: Optional[str] = None


@router.post("/material", response_model=ProcessingResponse)
async def process_material(request: ProcessingRequest):
    """
    Process an uploaded material file:
    1. Extract text from file (PDF, DOCX, PPTX, images)
    2. Run OCR if needed (automatic for scanned PDFs and images)
    3. Generate metadata via Gemini AI (title, summary, keywords, topics, tags, difficulty, content type)
    4. Generate quiz questions from the content via Gemini AI
    5. Return all processed data
    """
    logger.info(f"Processing material {request.material_id} | file: {request.file_path} | type: {request.file_type}")

    try:
        # Step 1: Extract text
        full_text = await extract_text(request.file_path, request.file_type)

        if not full_text or len(full_text.strip()) < 50:
            return ProcessingResponse(
                material_id=request.material_id,
                status="failed",
                error="Could not extract sufficient text from the file. The file may be empty, corrupted, or contain only images without OCR support.",
            )

        logger.info(f"Extracted {len(full_text)} characters from material {request.material_id}")

        # Step 2: Chunk text for storage
        text_chunks = chunk_text(full_text)
        logger.info(f"Created {len(text_chunks)} text chunks")

        # Step 3: Generate metadata via Gemini
        metadata = None
        metadata_error = None
        try:
            metadata = await generate_metadata(full_text)
            logger.info(f"Metadata generated for material {request.material_id}")
        except Exception as e:
            metadata_error = str(e)
            logger.error(f"Metadata generation failed: {e}")

        # Step 4: Generate quiz questions via Gemini
        quiz_questions = []
        quiz_error = None
        try:
            quiz_questions = await generate_quiz_questions(full_text, request.num_questions)
            logger.info(f"Generated {len(quiz_questions)} quiz questions for material {request.material_id}")
        except Exception as e:
            quiz_error = str(e)
            logger.error(f"Quiz generation failed: {e}")

        # Determine status based on what succeeded
        if not metadata and not quiz_questions:
            errors = []
            if metadata_error:
                errors.append(f"Metadata: {metadata_error}")
            if quiz_error:
                errors.append(f"Quiz: {quiz_error}")
            return ProcessingResponse(
                material_id=request.material_id,
                status="failed",
                text_chunks=text_chunks,
                error=f"AI generation failed. {'; '.join(errors)}" if errors else "AI generation returned no results",
            )

        status = "success"
        error_msg = None
        if not metadata or not quiz_questions:
            status = "partial_success"
            parts = []
            if not metadata:
                parts.append(f"metadata generation failed: {metadata_error or 'no data returned'}")
            if not quiz_questions:
                parts.append(f"quiz generation failed: {quiz_error or 'no questions returned'}")
            error_msg = "Partial: " + "; ".join(parts)
            logger.warning(f"Material {request.material_id}: {error_msg}")

        return ProcessingResponse(
            material_id=request.material_id,
            status=status,
            metadata=metadata,
            text_chunks=text_chunks,
            quiz_questions=quiz_questions,
            error=error_msg,
        )

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        return ProcessingResponse(
            material_id=request.material_id,
            status="failed",
            error=str(e),
        )
    except ValueError as e:
        logger.error(f"Unsupported file: {e}")
        return ProcessingResponse(
            material_id=request.material_id,
            status="failed",
            error=str(e),
        )
    except Exception as e:
        logger.error(f"Processing failed for material {request.material_id}: {traceback.format_exc()}")
        return ProcessingResponse(
            material_id=request.material_id,
            status="failed",
            error=f"Processing error: {str(e)}",
        )


@router.post("/questions-with-material", response_model=ProcessingResponse)
async def process_questions_with_material(request: QuestionsWithMaterialRequest):
    """
    Scenario 3: Process two files — questions file + study material file.
    1. Extract text from both files
    2. Generate metadata from the study material
    3. Use AI to match questions from the questions file with answers found strictly
       in the study material (AI does NOT generate answers from its own knowledge)
    4. Return all processed data
    """
    logger.info(
        f"Processing questions+material for {request.material_id} | "
        f"questions: {request.questions_file_path} | material: {request.file_path}"
    )

    try:
        # Step 1a: Extract text from the questions file
        questions_text = await extract_text(request.questions_file_path, request.questions_file_type)

        if not questions_text or len(questions_text.strip()) < 20:
            return ProcessingResponse(
                material_id=request.material_id,
                status="failed",
                error="Could not extract sufficient text from the questions file. The file may be empty or corrupted.",
            )

        logger.info(f"Extracted {len(questions_text)} characters from questions file")

        # Step 1b: Extract text from the study material file
        material_text = await extract_text(request.file_path, request.file_type)

        if not material_text or len(material_text.strip()) < 50:
            return ProcessingResponse(
                material_id=request.material_id,
                status="failed",
                error="Could not extract sufficient text from the study material file. The file may be empty or corrupted.",
            )

        logger.info(f"Extracted {len(material_text)} characters from study material")

        # Step 2: Chunk the study material text for storage
        text_chunks = chunk_text(material_text)
        logger.info(f"Created {len(text_chunks)} text chunks from study material")

        # Step 3: Generate metadata from study material via Gemini
        metadata = None
        metadata_error = None
        try:
            metadata = await generate_metadata(material_text)
            logger.info(f"Metadata generated for material {request.material_id}")
        except Exception as e:
            metadata_error = str(e)
            logger.error(f"Metadata generation failed: {e}")

        # Step 4: Generate quiz — questions from questions file, answers from study material
        quiz_questions = []
        quiz_error = None
        try:
            quiz_questions = await generate_quiz_from_questions_and_material(
                questions_text, material_text, request.num_questions
            )
            logger.info(
                f"Generated {len(quiz_questions)} quiz questions (questions+material) "
                f"for material {request.material_id}"
            )
        except Exception as e:
            quiz_error = str(e)
            logger.error(f"Quiz generation (questions+material) failed: {e}")

        # Determine status based on what succeeded
        if not metadata and not quiz_questions:
            errors = []
            if metadata_error:
                errors.append(f"Metadata: {metadata_error}")
            if quiz_error:
                errors.append(f"Quiz: {quiz_error}")
            return ProcessingResponse(
                material_id=request.material_id,
                status="failed",
                text_chunks=text_chunks,
                error=f"AI generation failed. {'; '.join(errors)}" if errors else "AI generation returned no results",
            )

        status = "success"
        error_msg = None
        if not metadata or not quiz_questions:
            status = "partial_success"
            parts = []
            if not metadata:
                parts.append(f"metadata generation failed: {metadata_error or 'no data returned'}")
            if not quiz_questions:
                parts.append(f"quiz generation failed: {quiz_error or 'no questions returned'}")
            error_msg = "Partial: " + "; ".join(parts)
            logger.warning(f"Material {request.material_id}: {error_msg}")

        return ProcessingResponse(
            material_id=request.material_id,
            status=status,
            metadata=metadata,
            text_chunks=text_chunks,
            quiz_questions=quiz_questions,
            error=error_msg,
        )

    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        return ProcessingResponse(
            material_id=request.material_id,
            status="failed",
            error=str(e),
        )
    except ValueError as e:
        logger.error(f"Unsupported file: {e}")
        return ProcessingResponse(
            material_id=request.material_id,
            status="failed",
            error=str(e),
        )
    except Exception as e:
        logger.error(f"Processing failed for material {request.material_id}: {traceback.format_exc()}")
        return ProcessingResponse(
            material_id=request.material_id,
            status="failed",
            error=f"Processing error: {str(e)}",
        )
