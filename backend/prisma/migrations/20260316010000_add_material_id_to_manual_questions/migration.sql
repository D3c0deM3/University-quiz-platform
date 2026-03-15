-- AlterTable
ALTER TABLE "manual_questions" ADD COLUMN "material_id" TEXT;

-- CreateIndex
CREATE INDEX "manual_questions_material_id_idx" ON "manual_questions"("material_id");

-- AddForeignKey
ALTER TABLE "manual_questions" ADD CONSTRAINT "manual_questions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
