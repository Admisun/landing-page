-- Enable pgvector extension for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for tracking form submissions from the Admission Calculator
CREATE TABLE IF NOT EXISTS admission_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    test_score TEXT,
    graduation_score NUMERIC,
    budget TEXT,
    work_experience TEXT,
    preferred_cities TEXT
);

-- Table for storing AI knowledge base (e.g. college stats, career pathways)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(1536) -- 1536 is for OpenAI text-embedding-ada-002 or text-embedding-3-small
);

-- Row Level Security (RLS) policies
ALTER TABLE admission_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to INSERT into admission_submissions (since they might not be logged in yet)
CREATE POLICY "Allow anonymous insert on admission_submissions"
    ON admission_submissions FOR INSERT
    WITH CHECK (true);

-- Allow authenticated users to view only their own submissions (if we add user_id later)
-- For now, we restrict read access to everyone except admins/service role.

-- Allow public read access to knowledge_base
CREATE POLICY "Allow public read on knowledge_base"
    ON knowledge_base FOR SELECT
    USING (true);

-- Create a function to search for similar documents
CREATE OR REPLACE FUNCTION match_knowledge_base (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  select
    knowledge_base.id,
    knowledge_base.content,
    knowledge_base.metadata,
    1 - (knowledge_base.embedding <=> query_embedding) as similarity
  from knowledge_base
  where 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
