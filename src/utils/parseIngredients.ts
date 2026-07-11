// Shared by productMapper (Open Beauty Facts text), IngredientScanner, and
// ProductSubmissionFlow (both scan Claude Vision's raw extracted text).
export function parseIngredients(raw: string, limit = 50): string[] {
  if (!raw || raw.length < 5) return [];

  return raw
    .replace(/\r?\n/g, ', ')            // newlines → commas
    .replace(/\*+/g, '')                 // strip asterisks (organic markers)
    .replace(/\[[^\]]*\]/g, '')          // strip [bracketed notes]
    .replace(/\([^)]*\)/g, '')           // strip (parenthetical notes)
    .replace(/\d+\.?\s(?=[A-Z])/g, '')   // strip "1. " numbering
    .split(/[,;]/)
    .flatMap((s) => s.split('/').slice(0, 1)) // bilingual "Aqua/Water" → take first
    .map((s) => {
      const t = s.replace(/_/g, ' ').trim();
      return t.charAt(0).toUpperCase() + t.slice(1); // sentence-case
    })
    .filter((s) => s.length >= 3 && s.length <= 70 && /[a-zA-Z]/.test(s))
    .slice(0, limit);
}
