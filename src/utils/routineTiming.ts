import { Product } from '../types';

export type UsageTiming = 'am' | 'pm' | 'both';

export const TIMING_LABELS: Record<UsageTiming, string> = {
  am: 'AM',
  pm: 'PM',
  both: 'AM & PM',
};

// Cleanse/tone/moisturize are used morning and night regardless of which
// specific product is assigned — a real invariant of the step itself, not
// an assumption. Protect (sunscreen) is inherently daytime-only for the
// same reason. "Treat" is the one step that genuinely depends on the
// assigned product rather than the step category — routines.ts already
// documents this exact split for the "normal" skin type's treat step
// ("Vitamin C serum (AM) or retinol (PM)"), so it can't be hardcoded by
// step name the way the other four safely can.
export function getStepTiming(stepType: string, product?: Product): UsageTiming {
  if (stepType === 'protect') return 'am';
  if (stepType !== 'treat') return 'both';

  // No product assigned yet, or an active whose timing isn't distinctive
  // (niacinamide, hyaluronic acid, peptides, etc.) — safe both times.
  if (!product) return 'both';
  const text = product.ingredients.join(' ').toLowerCase();
  if (text.includes('retinol') || text.includes('retinal') || text.includes('tretinoin')) return 'pm';
  if (text.includes('ascorbic acid') || text.includes('vitamin c')) return 'am';
  return 'both';
}
