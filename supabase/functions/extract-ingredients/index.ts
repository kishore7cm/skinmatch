// Proxies Claude Vision so the Anthropic API key stays server-side and never
// ships in the app bundle. Deploy with the Supabase CLI:
//
//   supabase functions deploy extract-ingredients
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// The function still requires the project's anon key (sent by the client as
// both `apikey` and `Authorization: Bearer`), matching default Supabase
// Edge Function auth — only the Anthropic key itself is a secret.

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

const EXTRACTION_PROMPT =
  'Extract the complete ingredients list from this skincare product image. ' +
  'Return ONLY the raw ingredients text exactly as printed, comma-separated, with no extra commentary. ' +
  'If no ingredients list is visible, respond with exactly: NO_INGREDIENTS';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY secret is not configured' }, 500);
  }

  let image: unknown;
  try {
    ({ image } = await req.json());
  } catch {
    return jsonResponse({ error: 'Request body must be JSON' }, 400);
  }

  if (typeof image !== 'string' || !image) {
    return jsonResponse({ error: 'Missing "image" (base64 string) in request body' }, 400);
  }

  const anthropicRes = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
    }),
  });

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}));
    return jsonResponse(
      { error: err?.error?.message ?? `Claude API ${anthropicRes.status}` },
      anthropicRes.status,
    );
  }

  const data = await anthropicRes.json();
  const text = (data.content?.[0]?.text ?? '').trim();
  return jsonResponse({ text });
});
