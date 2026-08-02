import { generateChat } from '@/lib/ai/vertexClient';

export async function POST(req) {
  const { message } = await req.json();
  const response = await generateChat(message);
  return new Response(JSON.stringify({ response }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
