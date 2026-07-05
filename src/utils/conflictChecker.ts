import { Product } from '../types';
import { CONFLICT_PAIRS, ConflictPair } from '../data/conflicts';

export interface DetectedConflict {
  pair: ConflictPair;
  productA: Product;
  productB: Product;
  matchedA: string;
  matchedB: string;
}

function findIngredient(product: Product, keyword: string): string | null {
  return (
    product.ingredients.find((ing) =>
      ing.toLowerCase().includes(keyword.toLowerCase()),
    ) ?? null
  );
}

export function checkConflicts(products: Product[]): DetectedConflict[] {
  const results: DetectedConflict[] = [];
  const seen = new Set<string>();

  for (const pair of CONFLICT_PAIRS) {
    for (let i = 0; i < products.length; i++) {
      for (let j = i; j < products.length; j++) {
        const pA = products[i];
        const pB = products[j];

        // Check A→B direction
        const aInI = findIngredient(pA, pair.a);
        const bInJ = findIngredient(pB, pair.b);
        // Check B→A direction (reversed products)
        const bInI = findIngredient(pA, pair.b);
        const aInJ = findIngredient(pB, pair.a);

        let matchA: Product | null = null;
        let matchB: Product | null = null;
        let ingA = '';
        let ingB = '';

        if (aInI && bInJ) {
          matchA = pA; matchB = pB; ingA = aInI; ingB = bInJ;
        } else if (bInI && aInJ) {
          matchA = pB; matchB = pA; ingA = aInJ; ingB = bInI;
        }

        if (matchA && matchB) {
          const key = `${pair.title}|${[matchA.id, matchB.id].sort().join('-')}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ pair, productA: matchA, productB: matchB, matchedA: ingA, matchedB: ingB });
          }
        }
      }
    }
  }

  // Sort by severity: avoid > caution > note
  const order: Record<string, number> = { avoid: 0, caution: 1, note: 2 };
  return results.sort((a, b) => order[a.pair.severity] - order[b.pair.severity]);
}
