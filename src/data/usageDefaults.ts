import { Product } from '../types';

// Typical amount used per application, in ml, based on dermatologist-recommended
// quantities (e.g. sunscreen = face + neck at the "two-finger" rule).
export const PER_USE_ML: Record<Product['category'], number> = {
  cleanser: 1.5,
  toner: 1,
  serum: 0.5,
  moisturizer: 1.2,
  sunscreen: 2,
};

// Estimated number of uses in a container of a given size.
// Explicit product.estimatedUses always wins. Otherwise, derived from
// sizeAmount / the category's per-use amount. Returns undefined (never a
// guessed number) when there isn't enough data to compute it.
export function estimatedUses(product: Product): number | undefined {
  if (product.estimatedUses !== undefined) return product.estimatedUses;
  if (product.sizeAmount === undefined) return undefined;

  const perUse = PER_USE_ML[product.category];
  if (!perUse) return undefined;

  return Math.round(product.sizeAmount / perUse);
}
