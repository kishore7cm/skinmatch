// Calls the `extract-ingredients` Supabase Edge Function, which proxies Claude
// Vision server-side — see supabase/functions/extract-ingredients/index.ts.
// The Anthropic API key never ships in this app; only the public Supabase
// project URL and anon key do, matching standard Supabase client config.
const FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_FUNCTION_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function extractIngredientsFromImage(base64Image: string): Promise<string> {
  if (!FUNCTION_URL || !ANON_KEY) {
    throw new Error('Ingredient scanning is not configured (missing Supabase env vars).');
  }

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `Scan failed (${res.status})`);
  }

  const data = await res.json();
  return (data.text ?? '').trim();
}
