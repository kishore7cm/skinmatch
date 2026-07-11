export interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'sunscreen' | 'moisturizer' | 'cleanser' | 'serum' | 'toner';
  price: number;
  ingredients: string[];
  imageUrl: string;
  // Cost-tracking fields — optional because API/scanned products (Open Beauty
  // Facts) never carry package size or a priced currency, only our curated
  // seed catalog does. Never guess these; treat missing as "no data."
  sizeAmount?: number;          // e.g. 50
  sizeUnit?: 'ml' | 'g';        // e.g. 'ml'
  estimatedUses?: number;       // explicit override; falls back to usageDefaults when absent
  currency?: 'USD' | 'INR';
  // Set only when a user has reported a corrected price (see priceOverrides.ts).
  // Absent means "price is whatever's in the seed catalog," not "verified today."
  priceUpdatedAt?: string;      // ISO timestamp
}

export interface Ingredient {
  name: string;
  isComedogenic: boolean;
  isIrritant: boolean;
  commonInteractions: string[];
}

export type SkinType = 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal';

export type BudgetPreference = 'budget' | 'balanced' | 'premium';
export type IntensityPreference = 'gentle' | 'balanced' | 'active';

export interface SkinProfile {
  skinType: SkinType;
  concerns: string[];
}

export interface RoutineStep {
  order: number;
  stepType: 'cleanse' | 'tone' | 'treat' | 'moisturize' | 'protect';
  productSuggestion: string;
  // How many times a day this step is actually done in this skin type's
  // routine — visible here rather than assumed in cost math, since it
  // genuinely varies (e.g. "Treat" alternates AM/PM for some routines).
  timesPerDay: number;
}
