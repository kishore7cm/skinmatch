import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';
import { getAssignments } from './routineAssignments';

const SHELF_KEY = 'skinmatch_shelf';
// Stores full Product JSON for API products (OBF) so they survive restarts
const SHELF_PRODUCTS_KEY = 'skinmatch_shelf_products';
const STATUS_KEY = 'skinmatch_shelf_status';

export type ShelfStatus = 'using' | 'considering';

export async function getShelf(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SHELF_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

// Kept separate from getShelf()'s own storage so every existing caller that
// just wants the id list (Routine, Home, the shelf picker) is unaffected —
// only Shelf itself and toggleShelf need to know about status at all.
export async function getShelfStatuses(): Promise<Record<string, ShelfStatus>> {
  const [shelfIds, raw, assignments] = await Promise.all([
    getShelf(),
    AsyncStorage.getItem(STATUS_KEY),
    getAssignments(),
  ]);
  const statuses: Record<string, ShelfStatus> = raw ? JSON.parse(raw) : {};

  // One-time migration for shelf items saved before status existed: assume
  // 'using' if it's actually plugged into the routine, 'considering' otherwise.
  const assignedProductIds = new Set(Object.values(assignments).map((a) => a.productId));
  let migrated = false;
  for (const id of shelfIds) {
    if (!(id in statuses)) {
      statuses[id] = assignedProductIds.has(id) ? 'using' : 'considering';
      migrated = true;
    }
  }
  if (migrated) {
    await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(statuses));
  }
  return statuses;
}

export async function setShelfStatus(productId: string, status: ShelfStatus): Promise<void> {
  const statuses = await getShelfStatuses();
  statuses[productId] = status;
  await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(statuses));
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
  const [shelf, persisted, statuses] = await Promise.all([getShelf(), getPersistedProducts(), getShelfStatuses()]);

  const idx = shelf.indexOf(product.id);
  if (idx >= 0) {
    shelf.splice(idx, 1);
    delete persisted[product.id];
    delete statuses[product.id];
  } else {
    shelf.push(product.id);
    // Only persist full data for non-local (OBF) products
    if (product.id.startsWith('obf_')) {
      persisted[product.id] = product;
    }
    // A bookmark alone only means "considering" — using it is a separate,
    // explicit action so conflict-checking never fires on a whim.
    statuses[product.id] = 'considering';
  }

  await Promise.all([
    AsyncStorage.setItem(SHELF_KEY, JSON.stringify(shelf)),
    AsyncStorage.setItem(SHELF_PRODUCTS_KEY, JSON.stringify(persisted)),
    AsyncStorage.setItem(STATUS_KEY, JSON.stringify(statuses)),
  ]);

  return idx < 0; // true = added
}

// Called whenever a product is assigned to a routine step — a product
// genuinely in someone's routine should always be conflict-checked,
// regardless of whether they separately bookmarked it. Unlike toggleShelf,
// this never removes anything; it only adds/promotes.
export async function ensureOnShelfAsUsing(product: Product): Promise<void> {
  const [shelf, persisted, statuses] = await Promise.all([getShelf(), getPersistedProducts(), getShelfStatuses()]);

  if (!shelf.includes(product.id)) {
    shelf.push(product.id);
    if (product.id.startsWith('obf_')) {
      persisted[product.id] = product;
    }
    await Promise.all([
      AsyncStorage.setItem(SHELF_KEY, JSON.stringify(shelf)),
      AsyncStorage.setItem(SHELF_PRODUCTS_KEY, JSON.stringify(persisted)),
    ]);
  }

  statuses[product.id] = 'using';
  await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(statuses));
}
