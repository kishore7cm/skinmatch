import { Product } from '../types';
import { OBFProduct } from '../api/openBeautyFacts';
import { parseIngredients } from './parseIngredients';

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

export function mapOBFProduct(raw: OBFProduct): Product | null {
  const name = raw.product_name?.trim();
  if (!name || name.length < 2) return null;

  const ingredients = parseIngredients(raw.ingredients_text ?? '', 30);

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
