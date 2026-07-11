import { Product, SkinType, BudgetPreference, IntensityPreference } from '../types';
import { Concern } from '../data/concerns';
import { PRODUCTS } from '../data/products';
import { getIngredientFlag } from './ingredientUtils';
import { RELEVANT_CAUTIONS } from './routineFit';
import { STEP_CATEGORY } from '../data/routines';
import { ACTIVE_INGREDIENTS } from '../data/activeIngredients';
import { checkCleanProfile } from './cleanCheck';

export interface RecommendationPreferences {
  budgetPreference?: BudgetPreference;
  intensityPreference?: IntensityPreference;
  cleanPreference?: boolean;
}

export interface StepRecommendation {
  product: Product;
  reason: string;
  tags: string[]; // short preference-driven callouts, e.g. "Budget pick", "Clean"
}

// The category's own median price among real candidates — never an
// arbitrary absolute threshold, since "cheap" means something different for
// a cleanser than a serum.
export function categoryMedianPrice(candidates: Product[]): number | undefined {
  const prices = candidates.map((p) => p.price).filter((p) => p > 0).sort((a, b) => a - b);
  return prices.length > 0 ? prices[Math.floor(prices.length / 2)] : undefined;
}

// Scores how well a product fits stated budget/intensity/clean preferences —
// shared by both step recommendations and "see alternatives," so a preference
// change is reflected everywhere a product gets ranked, not just one screen.
// These are lighter nudges shown as tags, since they reflect stated taste
// rather than a skin-safety fact (unlike concern/caution scoring).
export function scorePreferenceFit(
  product: Product,
  preferences: RecommendationPreferences,
  medianPrice: number | undefined,
): { bonus: number; tags: string[] } {
  let bonus = 0;
  const tags: string[] = [];

  if (medianPrice !== undefined && product.price > 0) {
    const isCheaper = product.price < medianPrice;
    if (preferences.budgetPreference === 'budget' && isCheaper) {
      bonus += 4;
      tags.push('Budget pick');
    } else if (preferences.budgetPreference === 'premium' && !isCheaper) {
      bonus += 4;
      tags.push('Higher-tier price');
    }
  }

  // Based on a specific, named list of recognized "active" ingredients
  // (activeIngredients.ts), not an invented speed/efficacy claim.
  const hasActive = ACTIVE_INGREDIENTS.some((active) =>
    product.ingredients.some((ing) => ing.toLowerCase().includes(active.toLowerCase())),
  );
  if (preferences.intensityPreference === 'gentle') {
    if (hasActive) {
      bonus -= 6;
    } else {
      tags.push('Gentle');
    }
  } else if (preferences.intensityPreference === 'active' && hasActive) {
    bonus += 4;
    tags.push('Active formula');
  }

  if (preferences.cleanPreference) {
    const clean = checkCleanProfile(product);
    if (clean.isClean) {
      tags.push('Clean');
    } else {
      bonus -= 5;
    }
  }

  return { bonus, tags };
}

// Scores a candidate product for a given skin type + selected concerns +
// stated preferences. Concern matches and skin-type cautions are the
// strongest signals and always drive the displayed reason; preferences are
// applied as a lighter nudge on top (see scorePreferenceFit).
function scoreCandidate(
  product: Product,
  skinType: SkinType,
  concerns: Concern[],
  preferences: RecommendationPreferences,
  medianPrice: number | undefined,
): { score: number; concernReason?: string; cautionReason?: string; tags: string[] } {
  let score = 0;
  let concernReason: string | undefined;

  for (const concern of concerns) {
    const matched = product.ingredients.find((ing) =>
      concern.matchIngredients.some((target) => ing.toLowerCase().includes(target.toLowerCase())),
    );
    if (matched) {
      score += 5;
      if (!concernReason) concernReason = `Contains ${matched} for ${concern.label}`;
    }
  }

  const relevantCautions = RELEVANT_CAUTIONS[skinType];
  const flaggedIngredient = relevantCautions.length > 0
    ? product.ingredients.find((ing) => {
        const flag = getIngredientFlag(ing);
        return relevantCautions.some((type) =>
          type === 'comedogenic' ? flag?.isComedogenic : flag?.isIrritant,
        );
      })
    : undefined;

  let cautionReason: string | undefined;
  if (flaggedIngredient) {
    score -= 10;
    cautionReason = `Contains ${flaggedIngredient}, flagged for ${skinType} skin`;
  } else if (relevantCautions.length > 0) {
    cautionReason = `No flagged ingredients for ${skinType} skin`;
  }

  const { bonus, tags } = scorePreferenceFit(product, preferences, medianPrice);
  score += bonus;

  return { score, concernReason, cautionReason, tags };
}

// Recommends real catalog products for an unassigned routine step — not a
// generic description, actual products ranked by fit. Never returns products
// outside the step's category, and always states why each one ranked where
// it did (even a downside), rather than a bare list.
export function recommendForStep(
  stepType: string,
  skinType: SkinType,
  concerns: Concern[],
  preferences: RecommendationPreferences = {},
  limit = 3,
): StepRecommendation[] {
  const category = STEP_CATEGORY[stepType];
  if (!category) return [];

  const candidates = PRODUCTS.filter((p) => p.category === category);
  const medianPrice = categoryMedianPrice(candidates);

  return candidates
    .map((product) => {
      const { score, concernReason, cautionReason, tags } =
        scoreCandidate(product, skinType, concerns, preferences, medianPrice);
      const isFlagged = cautionReason?.includes('flagged');
      // Show both signals together when both apply — never let a positive
      // concern match quietly paper over a real flag for this skin type.
      const reason = concernReason && isFlagged
        ? `${concernReason} — but ${cautionReason!.charAt(0).toLowerCase()}${cautionReason!.slice(1)}`
        : (concernReason ?? cautionReason) ?? `A ${category} pick for ${skinType} skin`;
      return { product, score, reason, tags };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product, reason, tags }) => ({ product, reason, tags }));
}
