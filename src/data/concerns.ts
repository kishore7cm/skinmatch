import type { IoniconName } from '../components/ProductCard';

export interface Concern {
  id: string;
  label: string;
  icon: IoniconName;
  description: string;
  keyIngredient: string;      // human-readable, shown in the UI — not safe to substring-match
  matchIngredients: string[]; // real ingredient-list names for programmatic coverage checks
  amTip: string;
  pmTip: string;
  avoid: string;
}

export const CONCERNS: Concern[] = [
  {
    id: 'acne',
    label: 'Acne & Breakouts',
    icon: 'locate-outline',
    description: 'Frequent breakouts or clogged pores',
    keyIngredient: 'Salicylic Acid (BHA)',
    matchIngredients: ['Salicylic Acid'],
    amTip: 'Use a BHA toner after cleansing to keep pores clear throughout the day.',
    pmTip: 'Apply niacinamide serum to calm inflammation and reduce post-acne marks overnight.',
    avoid: 'Coconut oil, Isopropyl Myristate, Cocoa Butter — all rated 4–5/5 comedogenic.',
  },
  {
    id: 'hyperpigmentation',
    label: 'Dark Spots',
    icon: 'ellipse-outline',
    description: 'Post-acne marks or sun spots',
    keyIngredient: 'Vitamin C (Ascorbic Acid)',
    matchIngredients: ['Ascorbic Acid'],
    amTip: 'Apply a vitamin C serum before SPF every morning — UV exposure reverses progress.',
    pmTip: 'Niacinamide 5–10% fades marks overnight without irritation.',
    avoid: 'Skipping SPF. Any brightening active is pointless without daily sun protection.',
  },
  {
    id: 'aging',
    label: 'Fine Lines & Aging',
    icon: 'hourglass-outline',
    description: 'Wrinkles, loss of firmness, dullness',
    keyIngredient: 'Retinol / Retinoids',
    matchIngredients: ['Retinol'],
    amTip: 'Layer vitamin C under SPF to neutralize free radicals and prevent collagen breakdown.',
    pmTip: 'Start with retinol 0.2% 2x/week. Increase frequency every 4 weeks as tolerated.',
    avoid: 'Using retinol and AHA/BHA on the same night — alternate instead.',
  },
  {
    id: 'redness',
    label: 'Redness & Sensitivity',
    icon: 'flower-outline',
    description: 'Reactive skin, rosacea, or flushing',
    keyIngredient: 'Centella Asiatica / Madecassoside',
    matchIngredients: ['Madecassoside'],
    amTip: 'Mineral (zinc-only) SPF only — avobenzone and homosalate can trigger flares.',
    pmTip: 'Barrier-repairing cream with ceramides and madecassoside while skin is still slightly damp.',
    avoid: 'Fragrance, Alcohol Denat, Menthol, Witch Hazel — all known sensitizers.',
  },
  {
    id: 'dryness',
    label: 'Dryness & Dehydration',
    icon: 'water-outline',
    description: 'Tight, flaky, or dull skin',
    keyIngredient: 'Hyaluronic Acid + Ceramides',
    matchIngredients: ['Hyaluronic Acid', 'Ceramide'],
    amTip: 'Apply hyaluronic acid on damp skin then seal immediately with a moisturizer.',
    pmTip: 'Occlusive-rich cream (white petrolatum or shea butter base) as an overnight mask.',
    avoid: 'Foaming cleansers with SLS, alcohol-based toners — they strip the skin barrier.',
  },
  {
    id: 'pores',
    label: 'Large Pores',
    icon: 'search-outline',
    description: 'Visibly enlarged or congested pores',
    keyIngredient: 'Niacinamide + BHA',
    matchIngredients: ['Niacinamide', 'Salicylic Acid'],
    amTip: 'Niacinamide serum minimizes the appearance of pores and controls oil.',
    pmTip: 'BHA 1–2x per week to deep-clean sebum inside the pore lining.',
    avoid: 'Heavy occlusive oils that sit on skin and add to clogging.',
  },
  {
    id: 'texture',
    label: 'Uneven Texture',
    icon: 'sparkles',
    description: 'Rough, bumpy, or dull surface',
    keyIngredient: 'AHA (Glycolic or Lactic Acid)',
    matchIngredients: ['Glycolic Acid', 'Lactic Acid'],
    amTip: 'Vitamin C serum brightens and smooths surface texture over time.',
    pmTip: 'AHA toner or serum 2–3x/week to resurface dead skin cells.',
    avoid: 'Skipping SPF when using AHAs — they significantly increase photosensitivity.',
  },
  {
    id: 'oiliness',
    label: 'Oiliness & Shine',
    icon: 'water',
    description: 'Excess sebum production',
    keyIngredient: 'Niacinamide + Salicylic Acid',
    matchIngredients: ['Niacinamide', 'Salicylic Acid'],
    amTip: 'Lightweight water-gel moisturizer with oil-free SPF. Never skip moisturizer.',
    pmTip: 'Niacinamide 10% serum regulates sebum production over 4–8 weeks.',
    avoid: 'Skipping moisturizer — dehydrated skin overproduces oil to compensate.',
  },
];
