// Proxies Claude Vision so the Anthropic API key stays server-side and never
// ships in the app bundle, and backs the product-submission flow (Firestore,
// no client-side Firestore SDK — every read/write goes through a function
// using the Admin SDK, so no separate security rules are needed). Deploy
// with the Firebase CLI:
//
//   firebase deploy --only functions
//
// Set the secrets once beforehand:
//
//   firebase functions:secrets:set ANTHROPIC_API_KEY
//   firebase functions:secrets:set ADMIN_REVIEW_KEY

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();
const submissions = db.collection('submissions');

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');
const adminReviewKey = defineSecret('ADMIN_REVIEW_KEY');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

async function callClaudeVision(image: string, prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Claude API ${res.status}`);
  }

  const data = await res.json();
  return (data.content?.[0]?.text ?? '').trim();
}

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

    try {
      const text = await callClaudeVision(image, EXTRACTION_PROMPT, anthropicApiKey.value());
      res.status(200).json({ text });
    } catch (e: any) {
      res.status(502).json({ error: e?.message ?? 'Claude Vision request failed' });
    }
  },
);

const PRODUCT_INFO_PROMPT =
  'Look at this skincare product package photo. Identify the brand name and product name printed on it. ' +
  'Respond with ONLY a single line in exactly this format, no other text: BRAND: <brand or blank> | NAME: <product name or blank>. ' +
  "If you can't confidently read either field, leave it blank rather than guessing.";

function parseProductInfo(text: string): { brand: string; name: string } {
  const match = text.match(/BRAND:\s*(.*?)\s*\|\s*NAME:\s*(.*)$/i);
  if (!match) return { brand: '', name: '' };
  return { brand: match[1].trim(), name: match[2].trim() };
}

// Brand/name detection is inherently unreliable — the client must present
// whatever this returns as an unconfirmed guess, never as fact.
export const extractProductInfo = onRequest(
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

    try {
      const text = await callClaudeVision(image, PRODUCT_INFO_PROMPT, anthropicApiKey.value());
      res.status(200).json(parseProductInfo(text));
    } catch (e: any) {
      res.status(502).json({ error: e?.message ?? 'Claude Vision request failed' });
    }
  },
);

interface SubmissionInput {
  deviceId: string;
  barcode?: string;
  brand: string;
  name: string;
  category: string;
  notes?: string;
  ingredients: string[];
  frontPhoto: string;       // base64, resized/compressed client-side
  ingredientPhoto: string;  // base64, resized/compressed client-side
}

export const submitProduct = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body as Partial<SubmissionInput>;
  if (!body.deviceId || !body.brand || !body.name || !body.category || !body.frontPhoto || !body.ingredientPhoto) {
    res.status(400).json({ error: 'Missing required submission fields' });
    return;
  }

  const doc = await submissions.add({
    deviceId: body.deviceId,
    barcode: body.barcode ?? null,
    brand: body.brand,
    name: body.name,
    category: body.category,
    notes: body.notes ?? '',
    ingredients: body.ingredients ?? [],
    frontPhoto: body.frontPhoto,
    ingredientPhoto: body.ingredientPhoto,
    status: 'pending',
    createdAt: Date.now(),
  });

  res.status(200).json({ id: doc.id });
});

export const getMySubmissions = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const deviceId = req.body?.deviceId;
  if (typeof deviceId !== 'string' || !deviceId) {
    res.status(400).json({ error: 'Missing "deviceId"' });
    return;
  }

  const snap = await submissions.where('deviceId', '==', deviceId).orderBy('createdAt', 'desc').get();
  const results = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      brand: data.brand,
      name: data.name,
      category: data.category,
      status: data.status,
      createdAt: data.createdAt,
    };
  });

  res.status(200).json({ submissions: results });
});

export const getApprovedSubmissions = onRequest({ cors: true }, async (req, res) => {
  const snap = await submissions.where('status', '==', 'approved').get();
  const results = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: `submission_${d.id}`,
      name: data.name,
      brand: data.brand,
      category: data.category,
      price: 0,
      ingredients: data.ingredients ?? [],
      imageUrl: data.frontPhoto ?? '',
    };
  });

  res.status(200).json({ products: results });
});

// Deliberately simple: a shared-secret query param rather than a full admin
// auth system, per the task's own "even a simple admin-only endpoint is
// enough for now" scope. Not exposed anywhere in the client app.
export const reviewSubmission = onRequest({ secrets: [adminReviewKey], cors: true }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { submissionId, status, adminKey } = req.body ?? {};
  if (adminKey !== adminReviewKey.value()) {
    res.status(403).json({ error: 'Invalid admin key' });
    return;
  }
  if (typeof submissionId !== 'string' || (status !== 'approved' && status !== 'rejected')) {
    res.status(400).json({ error: 'Expected { submissionId, status: "approved"|"rejected" }' });
    return;
  }

  await submissions.doc(submissionId).update({ status, reviewedAt: Date.now() });
  res.status(200).json({ ok: true });
});
