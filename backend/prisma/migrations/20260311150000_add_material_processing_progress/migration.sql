ALTER TABLE "materials"
ADD COLUMN "processing_progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "processing_stage" TEXT;

