/// <reference types="jest" />
import { Product } from '../../types';
import { costPerUse, monthlyCost, routineMonthlyCost } from '../routineCost';

function makeProduct(overrides: Partial<Product> & { id: string }): Product {
  return {
    name: 'Test Product',
    brand: 'Test Brand',
    category: 'serum',
    price: 0,
    ingredients: [],
    imageUrl: '',
    ...overrides,
  };
}

// price 30, 30ml serum (0.5ml/use from usageDefaults) => 60 uses => $0.50/use
const serum = makeProduct({ id: 'serum', category: 'serum', price: 30, sizeAmount: 30, sizeUnit: 'ml' });
// price 36, 60ml moisturizer (1.2ml/use) => 50 uses => $0.72/use
const moisturizer = makeProduct({ id: 'moisturizer', category: 'moisturizer', price: 36, sizeAmount: 60, sizeUnit: 'ml' });
// price 15, 150ml cleanser (1.5ml/use) => 100 uses => $0.15/use
const cleanser = makeProduct({ id: 'cleanser', category: 'cleanser', price: 15, sizeAmount: 150, sizeUnit: 'ml' });
// price 20, 100ml sunscreen (2ml/use) => 50 uses => $0.40/use
const sunscreen = makeProduct({ id: 'sunscreen', category: 'sunscreen', price: 20, sizeAmount: 100, sizeUnit: 'ml' });

describe('costPerUse', () => {
  it('computes price / estimated uses, rounded to 2 decimals', () => {
    expect(costPerUse(serum)).toBe(0.5);
    expect(costPerUse(moisturizer)).toBe(0.72);
    expect(costPerUse(cleanser)).toBe(0.15);
    expect(costPerUse(sunscreen)).toBe(0.4);
  });

  it('prefers an explicit estimatedUses override over the size-derived value', () => {
    const overridden = makeProduct({ id: 'x', category: 'serum', price: 20, sizeAmount: 30, sizeUnit: 'ml', estimatedUses: 10 });
    expect(costPerUse(overridden)).toBe(2); // 20 / 10, ignoring the 30ml/0.5ml-per-use math
  });

  it('returns undefined for a product with no price data (never guesses)', () => {
    const noPrice = makeProduct({ id: 'x', price: 0, sizeAmount: 30, sizeUnit: 'ml' });
    expect(costPerUse(noPrice)).toBeUndefined();
  });

  it('returns undefined for a product with no size data and no override', () => {
    const noSize = makeProduct({ id: 'x', price: 20 });
    expect(costPerUse(noSize)).toBeUndefined();
  });
});

describe('monthlyCost', () => {
  it('multiplies costPerUse by usesPerDay by 30', () => {
    expect(monthlyCost(serum, 2)).toBe(30);   // 0.50 * 2 * 30
    expect(monthlyCost(sunscreen, 1)).toBe(12); // 0.40 * 1 * 30
  });

  it('returns undefined when costPerUse is undefined, rather than a fabricated number', () => {
    const noPrice = makeProduct({ id: 'x', price: 0, sizeAmount: 30, sizeUnit: 'ml' });
    expect(monthlyCost(noPrice, 2)).toBeUndefined();
  });
});

describe('routineMonthlyCost', () => {
  it('sums monthly cost across assigned steps', () => {
    const result = routineMonthlyCost([
      { stepType: 'cleanse', product: cleanser, timesPerDay: 2 },   // 0.15 * 2 * 30 = 9
      { stepType: 'moisturize', product: moisturizer, timesPerDay: 2 }, // 0.72 * 2 * 30 = 43.2
      { stepType: 'protect', product: sunscreen, timesPerDay: 1 },  // 0.40 * 1 * 30 = 12
    ]);
    expect(result.total).toBe(64.2);
    expect(result.hasIncompleteData).toBe(false);
    expect(result.breakdown).toHaveLength(3);
  });

  it('reports an unassigned step as "not set" — excluded from total, not zeroed', () => {
    const result = routineMonthlyCost([
      { stepType: 'cleanse', product: cleanser, timesPerDay: 2 }, // 9
      { stepType: 'treat', product: undefined, timesPerDay: 2 },
    ]);
    expect(result.total).toBe(9);
    expect(result.hasIncompleteData).toBe(false); // unassigned is not "incomplete data"
    const treatLine = result.breakdown.find((l) => l.stepType === 'treat');
    expect(treatLine?.product).toBeUndefined();
    expect(treatLine?.monthlyCost).toBeUndefined();
  });

  it('flags an assigned product with missing price/size data as incomplete, excluded from total', () => {
    const noData = makeProduct({ id: 'no-data', price: 0 });
    const result = routineMonthlyCost([
      { stepType: 'cleanse', product: cleanser, timesPerDay: 2 }, // 9
      { stepType: 'treat', product: noData, timesPerDay: 2 },
    ]);
    expect(result.total).toBe(9);
    expect(result.hasIncompleteData).toBe(true);
    const treatLine = result.breakdown.find((l) => l.stepType === 'treat');
    expect(treatLine?.product).toBe(noData);
    expect(treatLine?.monthlyCost).toBeUndefined();
  });

  it('returns a zero total and empty breakdown for no steps', () => {
    const result = routineMonthlyCost([]);
    expect(result.total).toBe(0);
    expect(result.breakdown).toEqual([]);
    expect(result.hasIncompleteData).toBe(false);
  });
});
