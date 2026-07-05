import { Product } from '../types';
import { OBFProduct } from '../api/openBeautyFacts';

// Category keywords checked against OBF category tags (which are multilingual)
const CATEGORY_MAP: Array<[string[], Product['category']]> = [
  [['sun', 'spf', 'uv-', 'solaire', 'sunscreen', 'sunblock'], 'sunscreen'],
  [['serum', 'ampoule', 'essence', 'booster', 'concentrate', 'vitamin-c-serum'], 'serum'],
  [['toner', 'lotion-p', 'exfoliant', 'peeling', 'aha', 'bha', 'acid-toner'], 'toner'],
  [['cleanser', 'cleansing', 'wash', 'foam', 'gel-nettoyant', 'micellar', 'makeup-remover', 'nettoyant'], 'cleanser'],
];

function mapCategory(tags: string[]): Product['category'] {
  const tagStr = tags.join(' ').toLowerCase();
  for (const [keywords, category] of CATEGORY_MAP) {
    if (keywords.some((k) => tagStr.includes(k))) return category;
  }
  return 'moisturizer';
}

function parseIngredients(raw: string): string[] {
  if (!raw || raw.length < 5) return [];

  return raw
    .replace(/\r?\n/g, ', ')            // newlines → commas
    .replace(/\*+/g, '')                 // strip asterisks (organic markers)
    .replace(/\[[^\]]*\]/g, '')          // strip [bracketed notes]
    .replace(/\([^)]*\)/g, '')           // strip (parenthetical notes)
    .replace(/\d+\.?\s(?=[A-Z])/g, '')   // strip "1. " numbering
    .split(/[,;]/)
    .flatMap((s) => s.split('/').slice(0, 1)) // bilingual "Aqua/Water" → take first
    .map((s) => {
      const t = s.replace(/_/g, ' ').trim();
      return t.charAt(0).toUpperCase() + t.slice(1); // sentence-case
    })
    .filter((s) => s.length >= 3 && s.length <= 70 && /[a-zA-Z]/.test(s))
    .slice(0, 30);
}

export function mapOBFProduct(raw: OBFProduct): Product | null {
  const name = raw.product_name?.trim();
  if (!name || name.length < 2) return null;

  const ingredients = parseIngredients(raw.ingredients_text ?? '');

  return {
    id: `obf_${raw.code}`,
    name,
    brand: (raw.brands ?? '').split(',')[0].trim() || 'Unknown Brand',
    category: mapCategory(raw.categories_tags ?? []),
    price: 0,
    ingredients,
    imageUrl: raw.image_front_small_url ?? '',
  };
}

export function mapOBFProducts(raws: OBFProduct[]): Product[] {
  return raws.flatMap((r) => {
    const p = mapOBFProduct(r);
    return p ? [p] : [];
  });
}
