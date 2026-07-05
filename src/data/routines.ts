import { RoutineStep, SkinType } from '../types';

export const ROUTINES: Record<SkinType, RoutineStep[]> = {
  oily: [
    { order: 1, stepType: 'cleanse', productSuggestion: 'Gentle foaming cleanser (e.g. CeraVe Foaming)' },
    { order: 2, stepType: 'treat', productSuggestion: 'Niacinamide serum to control oil & minimize pores' },
    { order: 3, stepType: 'moisturize', productSuggestion: 'Neutrogena Hydro Boost Water Gel (oil-free)' },
    { order: 4, stepType: 'protect', productSuggestion: 'Neutrogena Clear Face Sunscreen SPF 50' },
  ],
  dry: [
    { order: 1, stepType: 'cleanse', productSuggestion: 'Cream or oil cleanser (e.g. CeraVe Hydrating)' },
    { order: 2, stepType: 'treat', productSuggestion: 'Hyaluronic acid serum on damp skin' },
    { order: 3, stepType: 'moisturize', productSuggestion: 'First Aid Beauty Ultra Repair Cream' },
    { order: 4, stepType: 'protect', productSuggestion: 'EltaMD Mineral Ultra Light Fluid SPF 50' },
  ],
  combination: [
    { order: 1, stepType: 'cleanse', productSuggestion: 'Balanced gel cleanser' },
    { order: 2, stepType: 'treat', productSuggestion: 'Lightweight serum with niacinamide + hyaluronic acid' },
    { order: 3, stepType: 'moisturize', productSuggestion: 'CeraVe Oil-Free Moisture Lotion' },
    { order: 4, stepType: 'protect', productSuggestion: 'Supergoop Unseen Sunscreen SPF 40' },
  ],
  sensitive: [
    { order: 1, stepType: 'cleanse', productSuggestion: 'Fragrance-free micellar water or gentle milk cleanser' },
    { order: 2, stepType: 'moisturize', productSuggestion: "La Roche-Posay Cicaplast Baume B5" },
    { order: 3, stepType: 'protect', productSuggestion: 'EltaMD Mineral Ultra Light Fluid SPF 50 (zinc-only)' },
  ],
  normal: [
    { order: 1, stepType: 'cleanse', productSuggestion: 'Any gentle daily cleanser' },
    { order: 2, stepType: 'treat', productSuggestion: 'Vitamin C serum (AM) or retinol (PM)' },
    { order: 3, stepType: 'moisturize', productSuggestion: 'Clinique Moisture Surge' },
    { order: 4, stepType: 'protect', productSuggestion: 'La Roche-Posay Anthelios SPF 100' },
  ],
};

export const STEP_TYPE_LABELS: Record<string, string> = {
  cleanse: '1. Cleanse',
  tone: '2. Tone',
  treat: '3. Treat',
  moisturize: '4. Moisturize',
  protect: '5. Protect',
};
