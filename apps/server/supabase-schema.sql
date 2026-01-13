-- Create table for document embeddings
CREATE TABLE IF NOT EXISTS document_embeddings (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(384), -- Match your embedding dimensions (384 for MiniLM)
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Function for similarity search
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id TEXT,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    de.id,
    de.content,
    de.metadata,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM document_embeddings de
  WHERE 1 - (de.embedding <=> query_embedding) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Sample data (optional)
-- INSERT INTO document_embeddings (id, content, embedding, metadata) VALUES
-- ('doc1_chunk1', 'This is a sample document about travel', '[0.1, 0.2, ...]', '{"source": "travel_guide.pdf"}');
