export type ConflictSeverity = 'avoid' | 'caution' | 'note';

export interface ConflictPair {
  a: string;
  b: string;
  severity: ConflictSeverity;
  title: string;
  reason: string;
  tip: string;
}

export const CONFLICT_PAIRS: ConflictPair[] = [
  {
    a: 'retinol',
    b: 'salicylic acid',
    severity: 'avoid',
    title: 'Retinol + Salicylic Acid',
    reason: 'Both are potent exfoliants. Using together risks severe dryness, peeling, and barrier damage.',
    tip: 'Use BHA in the AM routine and retinol at night, or alternate days entirely.',
  },
  {
    a: 'retinol',
    b: 'glycolic acid',
    severity: 'avoid',
    title: 'Retinol + Glycolic Acid',
    reason: 'Vitamin A + AHA together causes over-exfoliation, inflammation, and sun sensitivity.',
    tip: 'Alternate nights: retinol one evening, glycolic acid the next.',
  },
  {
    a: 'retinol',
    b: 'benzoyl peroxide',
    severity: 'avoid',
    title: 'Retinol + Benzoyl Peroxide',
    reason: 'Benzoyl peroxide oxidizes retinol on contact, rendering it completely ineffective.',
    tip: 'Apply benzoyl peroxide in the AM and retinol strictly in the PM.',
  },
  {
    a: 'ascorbic acid',
    b: 'niacinamide',
    severity: 'note',
    title: 'Vitamin C + Niacinamide',
    reason: 'Some studies show they can reduce each other\'s potency when applied simultaneously, and may cause temporary flushing.',
    tip: 'Apply vitamin C in the AM and niacinamide in the PM — or wait 30 minutes between.',
  },
  {
    a: 'retinol',
    b: 'witch hazel',
    severity: 'caution',
    title: 'Retinol + Witch Hazel',
    reason: 'Witch hazel\'s alcohol content strips moisture and worsens irritation already caused by retinol.',
    tip: 'Skip your witch hazel toner on nights you apply retinol.',
  },
  {
    a: 'ascorbic acid',
    b: 'glycolic acid',
    severity: 'caution',
    title: 'Vitamin C + Glycolic Acid',
    reason: 'Both are acidic. Layering them drives pH too low and can irritate or compromise the skin barrier.',
    tip: 'Use vitamin C in the AM and glycolic acid in the PM.',
  },
  {
    a: 'salicylic acid',
    b: 'glycolic acid',
    severity: 'caution',
    title: 'BHA + AHA Together',
    reason: 'Layering salicylic acid and glycolic acid increases risk of over-exfoliation and photosensitivity.',
    tip: 'Use one or the other per session, not both. Alternate based on concern (pores vs. texture).',
  },
  {
    a: 'retinol',
    b: 'fragrance',
    severity: 'caution',
    title: 'Retinol + Fragrance',
    reason: 'Fragrance sensitizes skin that is already stressed by retinol, increasing risk of contact dermatitis.',
    tip: 'Use only fragrance-free products around retinol application.',
  },
];
