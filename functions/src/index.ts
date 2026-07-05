// Proxies Claude Vision so the Anthropic API key stays server-side and never
// ships in the app bundle. Deploy with the Firebase CLI:
//
//   firebase deploy --only functions
//
// Set the secret once beforehand:
//
//   firebase functions:secrets:set ANTHROPIC_API_KEY

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

const EXTRACTION_PROMPT =
  'Extract the complete ingredients list from this skincare product image. ' +
  'Return ONLY the raw ingredients text exactly as printed, comma-separated, with no extra commentary. ' +
  'If no ingredients list is visible, respond with exactly: NO_INGREDIENTS';

export const extractIngredients = onRequest(
  { secrets: [anthropicApiKey], cors: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const image = req.body?.image;
    if (typeof image !== 'string' || !image) {
      res.status(400).json({ error: 'Missing "image" (base64 string) in request body' });
      return;
    }

    const anthropicRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey.value(),
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
      res.status(anthropicRes.status).json({ error: err?.error?.message ?? `Claude API ${anthropicRes.status}` });
      return;
    }

    const data = await anthropicRes.json();
    const text = (data.content?.[0]?.text ?? '').trim();
    res.status(200).json({ text });
  },
);
