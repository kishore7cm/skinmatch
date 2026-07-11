import { RoutineStep, SkinType, Product } from '../types';

// Maps routine step types to the product category they expect
export const STEP_CATEGORY: Record<string, Product['category']> = {
  cleanse:    'cleanser',
  tone:       'toner',
  treat:      'serum',
  moisturize: 'moisturizer',
  protect:    'sunscreen',
};

export const ROUTINES: Record<SkinType, RoutineStep[]> = {
  oily: [
    { order: 1, stepType: 'cleanse', productSuggestion: 'Gentle foaming cleanser (e.g. CeraVe Foaming)', timesPerDay: 2 },
    { order: 2, stepType: 'treat', productSuggestion: 'Niacinamide serum to control oil & minimize pores', timesPerDay: 2 },
    { order: 3, stepType: 'moisturize', productSuggestion: 'Neutrogena Hydro Boost Water Gel (oil-free)', timesPerDay: 2 },
    { order: 4, stepType: 'protect', productSuggestion: 'Neutrogena Clear Face Sunscreen SPF 50', timesPerDay: 1 },
  ],
  dry: [
    { order: 1, stepType: 'cleanse', productSuggestion: 'Cream or oil cleanser (e.g. CeraVe Hydrating)', timesPerDay: 2 },
    { order: 2, stepType: 'treat', productSuggestion: 'Hyaluronic acid serum on damp skin', timesPerDay: 2 },
    { order: 3, stepType: 'moisturize', productSuggestion: 'First Aid Beauty Ultra Repair Cream', timesPerDay: 2 },
    { order: 4, stepType: 'protect', productSuggestion: 'EltaMD Mineral Ultra Light Fluid SPF 50', timesPerDay: 1 },
  ],
  combination: [
    { order: 1, stepType: 'cleanse', productSuggestion: 'Balanced gel cleanser', timesPerDay: 2 },
    { order: 2, stepType: 'treat', productSuggestion: 'Lightweight serum with niacinamide + hyaluronic acid', timesPerDay: 2 },
    { order: 3, stepType: 'moisturize', productSuggestion: 'CeraVe Oil-Free Moisture Lotion', timesPerDay: 2 },
    { order: 4, stepType: 'protect', productSuggestion: 'Supergoop Unseen Sunscreen SPF 40', timesPerDay: 1 },
  ],
  sensitive: [
    { order: 1, stepType: 'cleanse', productSuggestion: 'Fragrance-free micellar water or gentle milk cleanser', timesPerDay: 2 },
    { order: 2, stepType: 'moisturize', productSuggestion: "La Roche-Posay Cicaplast Baume B5", timesPerDay: 2 },
    { order: 3, stepType: 'protect', productSuggestion: 'EltaMD Mineral Ultra Light Fluid SPF 50 (zinc-only)', timesPerDay: 1 },
  ],
  normal: [
    { order: 1, stepType: 'cleanse', productSuggestion: 'Any gentle daily cleanser', timesPerDay: 2 },
    // Alternates AM (vitamin C) / PM (retinol) by design — one application a day, not two.
    { order: 2, stepType: 'treat', productSuggestion: 'Vitamin C serum (AM) or retinol (PM)', timesPerDay: 1 },
    { order: 3, stepType: 'moisturize', productSuggestion: 'Clinique Moisture Surge', timesPerDay: 2 },
    { order: 4, stepType: 'protect', productSuggestion: 'La Roche-Posay Anthelios SPF 100', timesPerDay: 1 },
  ],
};

// No numbers here — each skin type's routine skips different steps (e.g. oily
// has no "tone" step), so the only correct step number is that routine's own
// array position, rendered separately in RoutineScreen. A fixed number baked
// in here would drift out of sync with steps that get skipped.
export const STEP_TYPE_LABELS: Record<string, string> = {
  cleanse: 'Cleanse',
  tone: 'Tone',
  treat: 'Treat',
  moisturize: 'Moisturize',
  protect: 'Protect',
};
