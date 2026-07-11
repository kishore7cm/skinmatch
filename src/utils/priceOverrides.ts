import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

const KEY = 'skinmatch_price_overrides';

export interface PriceOverride {
  price: number;
  updatedAt: string; // ISO timestamp
}

export async function getPriceOverrides(): Promise<Record<string, PriceOverride>> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function getPriceOverride(productId: string): Promise<PriceOverride | undefined> {
  const overrides = await getPriceOverrides();
  return overrides[productId];
}

export async function setPriceOverride(productId: string, price: number): Promise<PriceOverride> {
  const overrides = await getPriceOverrides();
  const entry: PriceOverride = { price, updatedAt: new Date().toISOString() };
  overrides[productId] = entry;
  await AsyncStorage.setItem(KEY, JSON.stringify(overrides));
  return entry;
}

export async function clearPriceOverride(productId: string): Promise<void> {
  const overrides = await getPriceOverrides();
  delete overrides[productId];
  await AsyncStorage.setItem(KEY, JSON.stringify(overrides));
}

// Returns a new Product with the reported price/timestamp applied, or the
// original product unchanged if no override exists for it.
export function applyOverride(product: Product, overrides: Record<string, PriceOverride>): Product {
  const override = overrides[product.id];
  if (!override) return product;
  return { ...product, price: override.price, priceUpdatedAt: override.updatedAt };
}

export function applyOverrides(products: Product[], overrides: Record<string, PriceOverride>): Product[] {
  return products.map((p) => applyOverride(p, overrides));
}
