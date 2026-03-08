from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging
import traceback

from app.services.text_extraction import extract_text, chunk_text
from app.services.ai_service import generate_metadata, generate_quiz_questions

router = APIRouter()
logger = logging.getLogger(__name__)


class ProcessingRequest(BaseModel):
    material_id: str
    file_path: str
    file_type: str
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
        try:
            metadata = await generate_metadata(full_text)
            logger.info(f"Metadata generated for material {request.material_id}")
        except Exception as e:
            logger.error(f"Metadata generation failed: {e}")
            # Continue without metadata - quiz gen can still work

        # Step 4: Generate quiz questions via Gemini
        quiz_questions = []
        try:
            quiz_questions = await generate_quiz_questions(full_text, request.num_questions)
            logger.info(f"Generated {len(quiz_questions)} quiz questions for material {request.material_id}")
        except Exception as e:
            logger.error(f"Quiz generation failed: {e}")
            # Continue without quiz - metadata and text are still valuable

        return ProcessingResponse(
            material_id=request.material_id,
            status="success",
            metadata=metadata,
            text_chunks=text_chunks,
            quiz_questions=quiz_questions,
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
