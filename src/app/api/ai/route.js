import { NextResponse } from 'next/server';
import openai from '@/lib/ai/openai';
import { createClient } from '@/lib/supabase/server';

export async function POST(req) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 1. Generate an embedding for the user's query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Query Supabase pgvector using the match_knowledge_base RPC function
    const supabase = await createClient();
    const { data: documents, error } = await supabase.rpc('match_knowledge_base', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
    });

    if (error) {
      console.error('Vector DB Error:', error);
      return NextResponse.json({ error: 'Failed to retrieve context' }, { status: 500 });
    }

    // Return the matched documents (this will later be fed into an LLM for answering)
    return NextResponse.json({ success: true, documents });

  } catch (error) {
    console.error('AI Route Error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
