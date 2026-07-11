import { Product, SkinType } from '../types';
import { Concern } from '../data/concerns';
import { getIngredientFlag } from './ingredientUtils';

export interface ConcernCoverage {
  concern: Concern;
  covered: boolean;
  matchedProduct?: Product;
  matchedIngredient?: string; // which of concern.matchIngredients was actually found
}

// For each selected concern, checks every assigned product's ingredient list
// against that concern's matchIngredients (real ingredient names, not the
// human-readable keyIngredient display string — that string has "/", "+",
// "(...)" in it and isn't safe to substring-match). Never guesses — a concern
// with no matching product is reported as uncovered, not silently dropped.
export function checkConcernCoverage(concerns: Concern[], assignedProducts: Product[]): ConcernCoverage[] {
  return concerns.map((concern) => {
    for (const product of assignedProducts) {
      const matchedIngredient = product.ingredients.find((ing) =>
        concern.matchIngredients.some((target) => ing.toLowerCase().includes(target.toLowerCase())),
      );
      if (matchedIngredient) {
        return { concern, covered: true, matchedProduct: product, matchedIngredient };
      }
    }
    return { concern, covered: false };
  });
}

export type CautionType = 'comedogenic' | 'irritant';

export interface RoutineCaution {
  product: Product;
  stepType: string;
  type: CautionType;
  ingredients: string[]; // flagged ingredient names found in this product
}

// Which flag type actually matters for a given skin type — oily/combination
// skin cares about pore-clogging, dry/sensitive skin cares about irritation.
// Normal skin gets no proactive caution, matching its "few concerns" profile.
export const RELEVANT_CAUTIONS: Record<SkinType, CautionType[]> = {
  oily: ['comedogenic'],
  combination: ['comedogenic', 'irritant'],
  dry: ['irritant'],
  sensitive: ['irritant'],
  normal: [],
};

export function checkSkinTypeCautions(
  skinType: SkinType,
  assignments: { stepType: string; product: Product }[],
): RoutineCaution[] {
  const relevant = RELEVANT_CAUTIONS[skinType];
  if (relevant.length === 0) return [];

  const cautions: RoutineCaution[] = [];
  for (const { stepType, product } of assignments) {
    for (const type of relevant) {
      const flagged = product.ingredients.filter((ing) => {
        const flag = getIngredientFlag(ing);
        return type === 'comedogenic' ? flag?.isComedogenic : flag?.isIrritant;
      });
      if (flagged.length > 0) {
        cautions.push({ product, stepType, type, ingredients: flagged });
      }
    }
  }
  return cautions;
}
