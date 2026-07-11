import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Keeps submission photos small enough for a single Firestore document
// (1MiB limit, two photos per submission) while staying legible for the
// brand/name/ingredient OCR passes.
export async function resizeForUpload(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { base64: true, compress: 0.5, format: SaveFormat.JPEG },
  );
  if (!result.base64) throw new Error('Failed to process photo');
  return result.base64;
}
