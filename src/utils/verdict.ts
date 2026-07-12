import { countFlags } from './ingredientUtils';
import { ColorTokens } from '../theme';
import { IoniconName } from '../components/ProductCard';

export type Verdict = 'excellent' | 'good' | 'caution' | 'avoid';

// Weighted against the real catalog (50 products): comedogenic flags are
// rare (max 1 per product here) but already treated as more severe than
// irritants everywhere else in the app (clay > gold), so they're weighted
// 3x. Resulting score distribution across the catalog: 0 → 6 products,
// 1-2 → 25, 3-4 → 17, 5+ → 2 — these boundaries land on real breaks in
// that distribution, not arbitrary round numbers.
function severityScore(comedogenic: number, irritant: number): number {
  return comedogenic * 3 + irritant;
}

export function computeVerdict(ingredients: string[]): Verdict {
  const { comedogenic, irritant } = countFlags(ingredients);
  const score = severityScore(comedogenic, irritant);
  if (score === 0) return 'excellent';
  if (score <= 2) return 'good';
  if (score <= 4) return 'caution';
  return 'avoid';
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  excellent: 'Excellent',
  good: 'Good',
  caution: 'Caution',
  avoid: 'Avoid',
};

export const VERDICT_ICONS: Record<Verdict, IoniconName> = {
  excellent: 'checkmark-circle',
  good: 'checkmark-circle-outline',
  caution: 'alert-circle-outline',
  avoid: 'close-circle-outline',
};

export function verdictDescription(comedogenic: number, irritant: number): string {
  if (comedogenic === 0 && irritant === 0) return 'No flagged ingredients — a clean formulation.';
  const parts: string[] = [];
  if (comedogenic > 0) parts.push(`${comedogenic} pore-clogging`);
  if (irritant > 0) parts.push(`${irritant} irritant`);
  const total = comedogenic + irritant;
  return `Contains ${parts.join(' + ')} ingredient${total !== 1 ? 's' : ''}.`;
}

// Reuses the exact score-ring color tiers (scoreHigh/Mid/Low) rather than
// inventing a fourth color — "excellent" and "good" share the same "safe"
// hue and are differentiated by label only, matching how a fast scan only
// needs to distinguish safe / caution / avoid, not four discrete hues.
export function verdictColor(verdict: Verdict, colors: ColorTokens): string {
  if (verdict === 'caution') return colors.scoreMid;
  if (verdict === 'avoid') return colors.scoreLow;
  return colors.scoreHigh;
}

export function verdictBgColor(verdict: Verdict, colors: ColorTokens): string {
  if (verdict === 'caution') return colors.goldSoft;
  if (verdict === 'avoid') return colors.claySoft;
  return colors.sageSoft;
}
