import { INGREDIENT_FLAGS } from '../data/ingredients';
import { Ingredient } from '../types';

export function getIngredientFlag(name: string): Ingredient | null {
  const key = Object.keys(INGREDIENT_FLAGS).find(
    (k) => name.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? INGREDIENT_FLAGS[key] : null;
}

export function countFlags(ingredients: string[]): { comedogenic: number; irritant: number } {
  let comedogenic = 0;
  let irritant = 0;
  for (const ing of ingredients) {
    const flag = getIngredientFlag(ing);
    if (flag?.isComedogenic) comedogenic++;
    if (flag?.isIrritant) irritant++;
  }
  return { comedogenic, irritant };
}
