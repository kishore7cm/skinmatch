export interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'sunscreen' | 'moisturizer' | 'cleanser' | 'serum' | 'toner';
  price: number;
  ingredients: string[];
  imageUrl: string;
}

export interface Ingredient {
  name: string;
  isComedogenic: boolean;
  isIrritant: boolean;
  commonInteractions: string[];
}

export type SkinType = 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal';

export interface SkinProfile {
  skinType: SkinType;
  concerns: string[];
}

export interface RoutineStep {
  order: number;
  stepType: 'cleanse' | 'tone' | 'treat' | 'moisturize' | 'protect';
  productSuggestion: string;
}
