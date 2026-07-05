import { Product } from '../types';

// In-memory cache for API-fetched products.
// Cleared on app restart — sufficient for within-session navigation.
const cache = new Map<string, Product>();

export function cacheProducts(products: Product[]): void {
  for (const p of products) cache.set(p.id, p);
}

export function getCachedProduct(id: string): Product | undefined {
  return cache.get(id);
}
