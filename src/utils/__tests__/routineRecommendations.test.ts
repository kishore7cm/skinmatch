/// <reference types="jest" />
import { Concern } from '../../data/concerns';

// The mock factory must be fully self-contained (no references to outer-scope
// variables) since jest.mock calls are hoisted above regular declarations.
jest.mock('../../data/products', () => {
  function makeProduct(overrides: any) {
    return { name: overrides.id, brand: 'Test Brand', price: 20, imageUrl: '', ...overrides };
  }
  return {
    PRODUCTS: [
      makeProduct({ id: 'clean-cleanser', category: 'cleanser', price: 10, ingredients: ['Water', 'Glycerin'] }),
      makeProduct({ id: 'comedogenic-cleanser', category: 'cleanser', price: 30, ingredients: ['Water', 'Coconut Oil'] }),
      makeProduct({ id: 'fragrance-cleanser', category: 'cleanser', price: 20, ingredients: ['Water', 'Fragrance'] }),
      makeProduct({ id: 'niacinamide-serum', category: 'serum', price: 20, ingredients: ['Water', 'Niacinamide'] }),
      makeProduct({ id: 'plain-serum', category: 'serum', price: 20, ingredients: ['Water', 'Glycerin'] }),
      // Matches the "dryness" concern (Hyaluronic Acid) but also contains
      // Retinol, an irritant — relevant for dry skin's cautions, and the one
      // ingredient here on the "active" list for intensity preference.
      makeProduct({ id: 'retinol-serum', category: 'serum', price: 20, ingredients: ['Water', 'Retinol', 'Hyaluronic Acid'] }),
    ],
  };
});

import { recommendForStep } from '../routineRecommendations';

const acneConcern: Concern = {
  id: 'acne', label: 'Acne & Breakouts', icon: 'locate-outline',
  description: '', keyIngredient: 'Salicylic Acid (BHA)', matchIngredients: ['Niacinamide'],
  amTip: '', pmTip: '', avoid: '',
};

describe('recommendForStep', () => {
  it("only returns products in the step's category", () => {
    const recs = recommendForStep('cleanse', 'normal', []);
    expect(recs.every((r) => r.product.category === 'cleanser')).toBe(true);
    expect(recs.some((r) => r.product.category === 'serum')).toBe(false);
  });

  it('returns an empty array for a step type with no category mapping', () => {
    expect(recommendForStep('not-a-real-step', 'normal', [])).toEqual([]);
  });

  it('ranks a concern-matching product above a plain one', () => {
    const recs = recommendForStep('treat', 'normal', [acneConcern]);
    expect(recs[0].product.id).toBe('niacinamide-serum');
    expect(recs[0].reason).toMatch(/Niacinamide/);
  });

  it('deprioritizes a product with an ingredient flagged for the skin type', () => {
    const recs = recommendForStep('cleanse', 'oily', []);
    expect(recs[0].product.id).toBe('clean-cleanser');
    const flagged = recs.find((r) => r.product.id === 'comedogenic-cleanser');
    expect(flagged?.reason).toMatch(/flagged for oily skin/);
  });

  it('does not penalize flagged ingredients for normal skin (no relevant cautions)', () => {
    const recs = recommendForStep('cleanse', 'normal', []);
    const flagged = recs.find((r) => r.product.id === 'comedogenic-cleanser');
    expect(flagged?.reason).not.toMatch(/flagged/);
  });

  it('respects the limit parameter', () => {
    const recs = recommendForStep('cleanse', 'normal', [], {}, 1);
    expect(recs).toHaveLength(1);
  });

  it('always includes a reason for every recommendation', () => {
    const recs = recommendForStep('treat', 'dry', []);
    expect(recs.every((r) => typeof r.reason === 'string' && r.reason.length > 0)).toBe(true);
  });

  it('shows both the concern match and the caution when a product has both', () => {
    const dryness: Concern = {
      id: 'dryness', label: 'Dryness & Dehydration', icon: 'water-outline',
      description: '', keyIngredient: 'Hyaluronic Acid', matchIngredients: ['Hyaluronic Acid'],
      amTip: '', pmTip: '', avoid: '',
    };
    const recs = recommendForStep('treat', 'dry', [dryness]);
    const retinol = recs.find((r) => r.product.id === 'retinol-serum');
    expect(retinol?.reason).toMatch(/Hyaluronic Acid/);
    expect(retinol?.reason).toMatch(/flagged for dry skin/);
  });

  describe('preferences', () => {
    it('has no tags and no ranking effect when no preferences are given', () => {
      const recs = recommendForStep('cleanse', 'normal', []);
      expect(recs.every((r) => r.tags.length === 0)).toBe(true);
    });

    it('tags and boosts the below-median-price product on a budget preference', () => {
      const recs = recommendForStep('cleanse', 'normal', [], { budgetPreference: 'budget' });
      const cheap = recs.find((r) => r.product.id === 'clean-cleanser');
      expect(cheap?.tags).toContain('Budget pick');
      expect(recs[0].product.id).toBe('clean-cleanser');
    });

    it('tags the above-median-price product on a premium preference', () => {
      const recs = recommendForStep('cleanse', 'normal', [], { budgetPreference: 'premium' });
      const pricier = recs.find((r) => r.product.id === 'comedogenic-cleanser');
      expect(pricier?.tags).toContain('Higher-tier price');
    });

    it('penalizes an active ingredient under a gentle intensity preference', () => {
      const recs = recommendForStep('treat', 'normal', [], { intensityPreference: 'gentle' });
      expect(recs[0].product.id).not.toBe('retinol-serum');
    });

    it('tags products with no active ingredients as "Gentle" under a gentle preference', () => {
      const recs = recommendForStep('treat', 'normal', [], { intensityPreference: 'gentle' });
      const plain = recs.find((r) => r.product.id === 'plain-serum');
      const retinol = recs.find((r) => r.product.id === 'retinol-serum');
      expect(plain?.tags).toContain('Gentle');
      expect(retinol?.tags).not.toContain('Gentle');
    });

    it('tags and boosts an active ingredient under an active intensity preference', () => {
      const recs = recommendForStep('treat', 'normal', [], { intensityPreference: 'active' });
      const retinol = recs.find((r) => r.product.id === 'retinol-serum');
      expect(retinol?.tags).toContain('Active formula');
      expect(recs[0].product.id).toBe('retinol-serum');
    });

    it('tags a clean product and deprioritizes a flagged one under a clean preference', () => {
      const recs = recommendForStep('cleanse', 'normal', [], { cleanPreference: true });
      const clean = recs.find((r) => r.product.id === 'clean-cleanser');
      const fragranced = recs.find((r) => r.product.id === 'fragrance-cleanser');
      expect(clean?.tags).toContain('Clean');
      expect(fragranced?.tags).not.toContain('Clean');
      expect(recs[0].product.id).not.toBe('fragrance-cleanser');
    });
  });
});
