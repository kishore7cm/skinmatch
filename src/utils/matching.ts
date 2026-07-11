import { Product } from '../types';
import { INGREDIENT_FLAGS } from '../data/ingredients';

export interface DupeResult {
  product: Product;
  score: number;         // 0–100 overall match
  sharedCount: number;   // number of ingredients in common
  totalUnique: number;   // size of the union
  sharedIngredients: string[]; // shared ingredient names, most notable actives first
  comedogenicDelta: number; // extra comedogenic ingredients vs source (negative = better)
  priceDiff: number;     // candidate.price - source.price
}

function normalize(ingredient: string): string {
  return ingredient
    .toLowerCase()
    .replace(/\s*\d+(\.\d+)?%/g, '')  // strip "9%", "10.5%", etc.
    .replace(/\s+/g, ' ')
    .trim();
}

function lookupFlag(ingredient: string) {
  const key = Object.keys(INGREDIENT_FLAGS).find((k) =>
    normalize(ingredient).includes(k.toLowerCase()) ||
    k.toLowerCase().includes(normalize(ingredient)),
  );
  return key ? INGREDIENT_FLAGS[key] : null;
}

function comedogenicCount(ingredients: string[]): number {
  return ingredients.filter((i) => lookupFlag(i)?.isComedogenic).length;
}

function jaccardScore(a: string[], b: string[]): { score: number; shared: number; union: number } {
  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));
  const shared = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return { score: union === 0 ? 0 : Math.round((shared / union) * 100), shared, union };
}

// Shared ingredient names (source's original casing), deduped, most notable first.
// "Notable" = recognized in INGREDIENT_FLAGS, beneficial (non-flagged) actives ranked ahead
// of comedogenic/irritant ones, since those are what the dupe explanation should lead with.
function notableSharedIngredients(source: string[], candidate: string[]): string[] {
  const candidateSet = new Set(candidate.map(normalize));
  const seen = new Set<string>();
  const shared: string[] = [];
  for (const ing of source) {
    const key = normalize(ing);
    if (candidateSet.has(key) && !seen.has(key)) {
      seen.add(key);
      shared.push(ing);
    }
  }

  const beneficial: string[] = [];
  const otherFlagged: string[] = [];
  const unflagged: string[] = [];
  for (const ing of shared) {
    const flag = lookupFlag(ing);
    if (!flag) unflagged.push(ing);
    else if (!flag.isComedogenic && !flag.isIrritant) beneficial.push(ing);
    else otherFlagged.push(ing);
  }
  return [...beneficial, ...otherFlagged, ...unflagged];
}

export function scoreDupe(source: Product, candidate: Product): DupeResult {
  const { score: jScore, shared, union } = jaccardScore(source.ingredients, candidate.ingredients);
  const sharedIngredients = notableSharedIngredients(source.ingredients, candidate.ingredients);

  const sourceCom = comedogenicCount(source.ingredients);
  const candidateCom = comedogenicCount(candidate.ingredients);
  const comedoDelta = candidateCom - sourceCom;

  // Penalty: -6 per extra comedogenic ingredient in the candidate
  // Bonus: +3 per fewer comedogenic ingredient (candidate is cleaner)
  const comedoPenalty = comedoDelta > 0 ? comedoDelta * 6 : comedoDelta * 3;

  const priceDiff = candidate.price - source.price;
  // Skip price bonus when either product has no price data (API products have price: 0)
  const priceBonus = (source.price === 0 || candidate.price === 0)
    ? 0
    : Math.max(-5, Math.min(5, Math.round(-Math.abs(priceDiff) / 4)));

  const finalScore = Math.max(0, Math.min(100, jScore - comedoPenalty + priceBonus));

  return {
    product: candidate,
    score: finalScore,
    sharedCount: shared,
    totalUnique: union,
    sharedIngredients,
    comedogenicDelta: comedoDelta,
    priceDiff,
  };
}

export function findDupes(source: Product, all: Product[]): DupeResult[] {
  return all
    .filter((p) => p.id !== source.id && p.category === source.category)
    .map((p) => scoreDupe(source, p))
    .sort((a, b) => b.score - a.score);
}

// "Shares 8/12 actives incl. Niacinamide + Ceramide" — the plain-language dupe explanation.
export function dupeExplanation(dupe: DupeResult): string {
  if (dupe.sharedCount === 0) return 'No shared ingredients';
  const highlights = dupe.sharedIngredients.slice(0, 2);
  const suffix = highlights.length ? ` incl. ${highlights.join(' + ')}` : '';
  return `Shares ${dupe.sharedCount}/${dupe.totalUnique} actives${suffix}`;
}

// Below this, a match is mostly coincidental overlap (price/category), not real
// shared actives — matches the existing "Decent" tier boundary used elsewhere
// (scoreColor/scoreBgColor), so "low confidence" means the same thing everywhere.
export const LOW_CONFIDENCE_THRESHOLD = 40;

// The score is 0-100 (Jaccard similarity, adjusted) — never a 0-10 scale, so the
// label is always a percentage, never "x/10".
export function matchLabel(score: number): string {
  return `${score}% match`;
}
