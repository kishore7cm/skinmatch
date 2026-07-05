// Calls the `extractIngredients` Firebase Cloud Function, which proxies Claude
// Vision server-side — see functions/src/index.ts. The Anthropic API key
// never ships in this app; only the public Cloud Function URL does.
const FUNCTION_URL = process.env.EXPO_PUBLIC_FIREBASE_FUNCTION_URL;

export async function extractIngredientsFromImage(base64Image: string): Promise<string> {
  if (!FUNCTION_URL) {
    throw new Error('Ingredient scanning is not configured (missing Firebase function URL).');
  }

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `Scan failed (${res.status})`);
  }

  const data = await res.json();
  return (data.text ?? '').trim();
}
