import { Product } from '../types';
import { estimatedUses } from '../data/usageDefaults';

// Rounds to 2 decimal places without float noise (e.g. avoids 0.1 + 0.2 = 0.30000000000000004).
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// price ÷ estimated uses in the container. Returns undefined — never a guess —
// when there isn't a real price or enough size data to compute uses from.
export function costPerUse(product: Product): number | undefined {
  if (!product.price || product.price <= 0) return undefined;

  const uses = estimatedUses(product);
  if (!uses || uses <= 0) return undefined;

  return round2(product.price / uses);
}

// costPerUse × timesPerDay × 30. usesPerDay is caller-supplied rather than
// inferred from the product, since the same product can be used at different
// frequencies depending on which routine step it's assigned to.
export function monthlyCost(product: Product, usesPerDay: number): number | undefined {
  const perUse = costPerUse(product);
  if (perUse === undefined) return undefined;

  return round2(perUse * usesPerDay * 30);
}

export interface RoutineCostLine {
  stepType: string;
  product?: Product;       // undefined = nothing assigned to this step
  timesPerDay: number;
  costPerUse?: number;     // undefined = assigned, but missing price/size data
  monthlyCost?: number;
}

export interface RoutineCostSummary {
  total: number;              // sum of every line with computable cost — incomplete lines are excluded, never zeroed
  breakdown: RoutineCostLine[];
  hasIncompleteData: boolean; // true if any assigned product is missing price/size data
}

export function routineMonthlyCost(
  steps: { stepType: string; product?: Product; timesPerDay: number }[],
): RoutineCostSummary {
  let total = 0;
  let hasIncompleteData = false;

  const breakdown: RoutineCostLine[] = steps.map(({ stepType, product, timesPerDay }) => {
    if (!product) {
      return { stepType, timesPerDay };
    }

    const perUse = costPerUse(product);
    const monthly = monthlyCost(product, timesPerDay);
    if (monthly === undefined) {
      hasIncompleteData = true;
      return { stepType, product, timesPerDay };
    }

    total += monthly;
    return { stepType, product, timesPerDay, costPerUse: perUse, monthlyCost: monthly };
  });

  return { total: round2(total), breakdown, hasIncompleteData };
}
