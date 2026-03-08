-- Full-text search indexes for the search API
-- Step 16: Database indexing for search

-- Full-text index on material_metadata title + summary
CREATE INDEX IF NOT EXISTS "idx_metadata_fulltext"
  ON "material_metadata"
  USING GIN (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("summary", '')));

-- Full-text index on material_text_chunks content for deep search
CREATE INDEX IF NOT EXISTS "idx_chunks_fulltext"
  ON "material_text_chunks"
  USING GIN (to_tsvector('simple', "content"));

-- Index on material status for fast filtering
CREATE INDEX IF NOT EXISTS "idx_materials_status"
  ON "materials" ("status");

-- Index on material created_at for date range filtering and sorting
CREATE INDEX IF NOT EXISTS "idx_materials_created_at"
  ON "materials" ("created_at" DESC);

-- ILIKE search helper index on title
CREATE INDEX IF NOT EXISTS "idx_metadata_title_trgm"
  ON "material_metadata"
  USING GIN ("title" gin_trgm_ops);

-- ILIKE search helper index on summary  
CREATE INDEX IF NOT EXISTS "idx_metadata_summary_trgm"
  ON "material_metadata"
  USING GIN ("summary" gin_trgm_ops);
