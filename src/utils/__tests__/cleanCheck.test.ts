/// <reference types="jest" />
import { Product } from '../../types';
import { checkCleanProfile, cleanSummary } from '../cleanCheck';

function makeProduct(overrides: Partial<Product> & { id: string; ingredients: string[] }): Product {
  return {
    name: overrides.id, brand: 'Test Brand', category: 'serum', price: 20, imageUrl: '', ...overrides,
  };
}

describe('checkCleanProfile', () => {
  it('reports clean for a product with none of the avoid-list ingredients', () => {
    const product = makeProduct({ id: 'clean', ingredients: ['Water', 'Glycerin', 'Niacinamide'] });
    const result = checkCleanProfile(product);
    expect(result.isClean).toBe(true);
    expect(result.flagged).toEqual([]);
  });

  it('flags a sulfate', () => {
    const product = makeProduct({ id: 'sulfate', ingredients: ['Water', 'Sodium Laureth Sulfate'] });
    const result = checkCleanProfile(product);
    expect(result.isClean).toBe(false);
    expect(result.flagged).toHaveLength(1);
    expect(result.flagged[0]).toMatchObject({ category: 'sulfate', ingredient: 'Sodium Laureth Sulfate' });
  });

  it('flags synthetic fragrance under either INCI name', () => {
    expect(checkCleanProfile(makeProduct({ id: 'a', ingredients: ['Fragrance'] })).flagged[0].category).toBe('syntheticFragrance');
    expect(checkCleanProfile(makeProduct({ id: 'b', ingredients: ['Parfum'] })).flagged[0].category).toBe('syntheticFragrance');
  });

  it('flags a paraben by substring match (catches any -paraben variant)', () => {
    const product = makeProduct({ id: 'paraben', ingredients: ['Water', 'Methylparaben'] });
    expect(checkCleanProfile(product).flagged[0]).toMatchObject({ category: 'paraben', ingredient: 'Methylparaben' });
  });

  it('flags multiple categories independently on the same product', () => {
    const product = makeProduct({ id: 'multi', ingredients: ['Water', 'Fragrance', 'Sodium Lauryl Sulfate'] });
    const result = checkCleanProfile(product);
    expect(result.flagged.map((f) => f.category).sort()).toEqual(['sulfate', 'syntheticFragrance']);
  });
});

describe('cleanSummary', () => {
  it('describes a clean product', () => {
    const result = checkCleanProfile(makeProduct({ id: 'clean', ingredients: ['Water'] }));
    expect(cleanSummary(result)).toMatch(/No parabens/);
  });

  it('names the actual flagged ingredients, not just the category', () => {
    const result = checkCleanProfile(makeProduct({ id: 'x', ingredients: ['Fragrance'] }));
    expect(cleanSummary(result)).toBe('Contains Fragrance');
  });
});
