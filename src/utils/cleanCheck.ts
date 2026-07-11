import { Product } from '../types';
import { AVOID_CATEGORIES, AvoidCategory } from '../data/cleanIngredients';

export interface CleanFlag {
  category: AvoidCategory;
  label: string;
  ingredient: string; // the actual ingredient string found, as listed on the product
}

export interface CleanCheckResult {
  flagged: CleanFlag[];
  isClean: boolean; // true when none of the AVOID_CATEGORIES matched
}

export function checkCleanProfile(product: Product): CleanCheckResult {
  const flagged: CleanFlag[] = [];

  for (const [category, { label, match }] of Object.entries(AVOID_CATEGORIES) as [AvoidCategory, { label: string; match: string[] }][]) {
    const found = product.ingredients.find((ing) =>
      match.some((m) => ing.toLowerCase().includes(m.toLowerCase())),
    );
    if (found) flagged.push({ category, label, ingredient: found });
  }

  return { flagged, isClean: flagged.length === 0 };
}

// "No parabens, sulfates, or synthetic fragrance" / "Contains Fragrance, Sodium Laureth Sulfate"
// — descriptive, not a certification claim.
export function cleanSummary(result: CleanCheckResult): string {
  if (result.isClean) return 'No parabens, sulfates, or synthetic fragrance found';
  return `Contains ${result.flagged.map((f) => f.ingredient).join(', ')}`;
}
