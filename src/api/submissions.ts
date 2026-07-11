// Calls the submission-related Firebase Cloud Functions (see
// functions/src/index.ts). No client-side Firestore SDK — everything goes
// through these functions, which use the Admin SDK server-side.
import { Product } from '../types';
import { getDeviceId } from '../utils/deviceId';

const SUBMIT_URL = process.env.EXPO_PUBLIC_SUBMIT_PRODUCT_URL;
const MY_SUBMISSIONS_URL = process.env.EXPO_PUBLIC_GET_MY_SUBMISSIONS_URL;
const APPROVED_URL = process.env.EXPO_PUBLIC_GET_APPROVED_SUBMISSIONS_URL;
const PRODUCT_INFO_URL = process.env.EXPO_PUBLIC_EXTRACT_PRODUCT_INFO_URL;

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface SubmissionSummary {
  id: string;
  brand: string;
  name: string;
  category: string;
  status: SubmissionStatus;
  createdAt: number;
}

export interface SubmitProductInput {
  barcode?: string;
  brand: string;
  name: string;
  category: string;
  notes?: string;
  ingredients: string[];
  frontPhoto: string;
  ingredientPhoto: string;
}

async function postJSON<T>(url: string | undefined, body: unknown, missingMsg: string): Promise<T> {
  if (!url) throw new Error(missingMsg);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function submitProduct(input: SubmitProductInput): Promise<{ id: string }> {
  const deviceId = await getDeviceId();
  return postJSON(SUBMIT_URL, { ...input, deviceId }, 'Product submission is not configured (missing Firebase function URL).');
}

export async function getMySubmissions(): Promise<SubmissionSummary[]> {
  const deviceId = await getDeviceId();
  const data = await postJSON<{ submissions: SubmissionSummary[] }>(
    MY_SUBMISSIONS_URL,
    { deviceId },
    'Submission tracking is not configured (missing Firebase function URL).',
  );
  return data.submissions;
}

export async function getApprovedSubmissions(): Promise<Product[]> {
  if (!APPROVED_URL) return [];
  try {
    const res = await fetch(APPROVED_URL);
    if (!res.ok) return [];
    const data = await res.json();
    return data.products ?? [];
  } catch {
    return [];
  }
}

export async function extractProductInfo(base64Image: string): Promise<{ brand: string; name: string }> {
  if (!PRODUCT_INFO_URL) return { brand: '', name: '' };
  try {
    const res = await fetch(PRODUCT_INFO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
    });
    if (!res.ok) return { brand: '', name: '' };
    return res.json();
  } catch {
    return { brand: '', name: '' };
  }
}
