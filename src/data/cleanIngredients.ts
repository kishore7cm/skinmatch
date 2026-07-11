export type AvoidCategory = 'paraben' | 'sulfate' | 'syntheticFragrance' | 'phthalate' | 'formaldehydeReleaser';

// A specific, commonly-cited "ingredients some consumers choose to avoid" list —
// not a safety claim (most of these are considered safe by dermatologists in
// normal use), just a factual check against what's actually in the ingredient
// list. Matching is substring-based against real INCI names, same convention
// as ingredientUtils.ts.
export const AVOID_CATEGORIES: Record<AvoidCategory, { label: string; match: string[] }> = {
  paraben: {
    label: 'Parabens',
    match: ['Paraben'], // catches Methylparaben, Propylparaben, Butylparaben, etc.
  },
  sulfate: {
    label: 'Sulfates',
    match: ['Sulfate'], // catches Sodium Lauryl/Laureth Sulfate and similar
  },
  syntheticFragrance: {
    label: 'Synthetic Fragrance',
    match: ['Fragrance', 'Parfum'],
  },
  phthalate: {
    label: 'Phthalates',
    match: ['Phthalate'],
  },
  formaldehydeReleaser: {
    label: 'Formaldehyde-releasing preservatives',
    match: ['DMDM Hydantoin', 'Diazolidinyl Urea', 'Imidazolidinyl Urea', 'Quaternium-15', 'Formaldehyde'],
  },
};
