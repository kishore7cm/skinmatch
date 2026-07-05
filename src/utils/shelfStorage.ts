import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

const SHELF_KEY = 'skinmatch_shelf';
// Stores full Product JSON for API products (OBF) so they survive restarts
const SHELF_PRODUCTS_KEY = 'skinmatch_shelf_products';

export async function getShelf(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SHELF_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

async function getPersistedProducts(): Promise<Record<string, Product>> {
  const raw = await AsyncStorage.getItem(SHELF_PRODUCTS_KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function getShelfProduct(id: string): Promise<Product | undefined> {
  const map = await getPersistedProducts();
  return map[id];
}

export async function isOnShelf(productId: string): Promise<boolean> {
  const shelf = await getShelf();
  return shelf.includes(productId);
}

export async function toggleShelf(product: Product): Promise<boolean> {
  const [shelf, persisted] = await Promise.all([getShelf(), getPersistedProducts()]);

  const idx = shelf.indexOf(product.id);
  if (idx >= 0) {
    shelf.splice(idx, 1);
    delete persisted[product.id];
  } else {
    shelf.push(product.id);
    // Only persist full data for non-local (OBF) products
    if (product.id.startsWith('obf_')) {
      persisted[product.id] = product;
    }
  }

  await Promise.all([
    AsyncStorage.setItem(SHELF_KEY, JSON.stringify(shelf)),
    AsyncStorage.setItem(SHELF_PRODUCTS_KEY, JSON.stringify(persisted)),
  ]);

  return idx < 0; // true = added
}
