const SEARCH_URL = 'https://world.openbeautyfacts.org/cgi/search.pl';
const PRODUCT_URL = 'https://world.openbeautyfacts.org/api/v0/product';
const FIELDS = 'code,product_name,brands,categories_tags,ingredients_text,image_front_small_url';

export interface OBFProduct {
  code: string;
  product_name?: string;
  brands?: string;
  categories_tags?: string[];
  ingredients_text?: string;
  image_front_small_url?: string;
}

async function fetchSearch(
  terms: string,
  signal: AbortSignal | undefined,
  pageSize: number,
): Promise<OBFProduct[]> {
  const params = new URLSearchParams({
    search_terms: terms,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(pageSize),
    fields: FIELDS,
  });
  const res = await fetch(`${SEARCH_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`OBF ${res.status}`);
  const data = await res.json();
  return (data.products ?? []) as OBFProduct[];
}

// OBF's simple search struggles with leading articles ("the") and multi-word
// brand+product queries. Strip the article and fall back to the key term
// (last word) when the full query returns nothing.
function stripLeadingArticle(q: string): string {
  return q.replace(/^(the|a|an)\s+/i, '').trim();
}

export async function searchBeautyProducts(
  query: string,
  signal?: AbortSignal,
  pageSize = 30,
): Promise<OBFProduct[]> {
  const cleaned = stripLeadingArticle(query.trim());

  let results = await fetchSearch(cleaned, signal, pageSize);
  if (results.length > 0) return results;

  // Fallback: if 3+ word query returned nothing, try just the last word
  // (e.g. "ordinary niacinamide" → "niacinamide")
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    results = await fetchSearch(words[words.length - 1], signal, pageSize);
  }

  return results;
}

export async function getBeautyProductByBarcode(
  barcode: string,
  signal?: AbortSignal,
): Promise<OBFProduct | null> {
  const res = await fetch(`${PRODUCT_URL}/${barcode}.json?fields=${FIELDS}`, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  return data.status === 1 ? (data.product as OBFProduct) : null;
}
