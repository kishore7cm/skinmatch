import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BarcodeScanner from '../components/BarcodeScanner';
import IngredientScanner from '../components/IngredientScanner';
import { PRODUCTS } from '../data/products';
import { AppStackParamList } from '../types/navigation';
import { CATEGORY_META } from '../components/ProductCard';
import ProductCard from '../components/ProductCard';
import { countFlags } from '../utils/ingredientUtils';
import { Product } from '../types';
import { searchBeautyProducts } from '../api/openBeautyFacts';
import { mapOBFProducts } from '../utils/productMapper';
import { cacheProducts } from '../utils/productCache';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Category = 'all' | Product['category'];
type SortMode = 'default' | 'price-asc' | 'price-desc' | 'most-flagged' | 'name';

const SORT_LABELS: Record<SortMode, string> = {
  'default':      'Sort: Default',
  'price-asc':    'Sort: Price ↑',
  'price-desc':   'Sort: Price ↓',
  'most-flagged': 'Sort: Most Flagged',
  'name':         'Sort: A–Z',
};
const SORT_CYCLE: SortMode[] = ['default', 'price-asc', 'price-desc', 'most-flagged', 'name'];

const CATEGORIES: Category[] = ['all', 'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen'];

export default function IngredientsScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [ingredientScannerOpen, setIngredientScannerOpen] = useState(false);
  const [noDataProduct, setNoDataProduct] = useState<Product | null>(null);
  const navigation = useNavigation<Nav>();
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isApiMode = query.length >= 3;

  useEffect(() => {
    if (!isApiMode) {
      setApiProducts([]);
      setApiError(null);
      setIsLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setIsLoading(true);
      setApiError(null);
      try {
        const raw = await searchBeautyProducts(query, abortRef.current.signal);
        const mapped = mapOBFProducts(raw);
        cacheProducts(mapped);
        setApiProducts(mapped);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setApiError('Could not reach Open Beauty Facts. Showing local results.');
          setApiProducts([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [query]);

  function cycleSort() {
    const idx = SORT_CYCLE.indexOf(sortMode);
    setSortMode(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]);
  }

  const localFiltered = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.ingredients.some((i) => i.toLowerCase().includes(q));
      const matchesCategory = category === 'all' || p.category === category;
      return matchesQuery && matchesCategory;
    });

    switch (sortMode) {
      case 'price-asc':  return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price);
      case 'most-flagged': {
        return [...list].sort((a, b) => {
          const fa = countFlags(a.ingredients);
          const fb = countFlags(b.ingredients);
          return (fb.comedogenic + fb.irritant) - (fa.comedogenic + fa.irritant);
        });
      }
      case 'name': return [...list].sort((a, b) => a.name.localeCompare(b.name));
      default:     return list;
    }
  }, [query, category, sortMode]);

  const displayProducts = isApiMode ? (apiError ? localFiltered : apiProducts) : localFiltered;

  function flagSubtitle(product: Product): string {
    const { comedogenic, irritant } = countFlags(product.ingredients);
    const total = comedogenic + irritant;
    if (total === 0) return '✓ No flagged ingredients';
    return [
      comedogenic > 0 ? `${comedogenic} pore-clogging` : '',
      irritant > 0 ? `${irritant} irritant` : '',
    ].filter(Boolean).join(' · ');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Ingredients</Text>
        <Text style={styles.subtitle}>Tap any product to see its full analysis</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search any product or brand..."
          placeholderTextColor="#BBB"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {isLoading
          ? <ActivityIndicator size="small" color="#C8A2C8" style={{ marginLeft: 6 }} />
          : (
            <View style={styles.scanBtns}>
              <TouchableOpacity onPress={() => setScannerOpen(true)} style={styles.scanBtn}>
                <Text style={styles.scanIcon}>📷</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIngredientScannerOpen(true)} style={styles.scanBtn}>
                <Text style={styles.scanIcon}>🔬</Text>
              </TouchableOpacity>
            </View>
          )
        }
      </View>

      <BarcodeScanner
        visible={scannerOpen}
        onClose={() => { setScannerOpen(false); setNoDataProduct(null); }}
        onProductFound={(product) => {
          navigation.navigate('ProductDetail', { productId: product.id });
        }}
      />

      <IngredientScanner
        visible={ingredientScannerOpen}
        onClose={() => { setIngredientScannerOpen(false); setNoDataProduct(null); }}
      />

      {/* Category filter + sort row — hidden in API mode */}
      {!isApiMode && (
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat;
              const meta = cat !== 'all' ? CATEGORY_META[cat] : null;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isActive && (meta ? { backgroundColor: meta.bg, borderColor: meta.color } : styles.chipActiveDefault)]}
                  onPress={() => setCategory(cat)}
                >
                  {meta && <Text style={styles.chipIcon}>{meta.icon}</Text>}
                  <Text style={[styles.chipText, isActive && (meta ? { color: meta.color } : styles.chipTextActiveDefault)]}>
                    {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.sortBtn} onPress={cycleSort}>
            <Text style={styles.sortBtnText}>{SORT_LABELS[sortMode]}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results count / status */}
      {isApiMode ? (
        <View style={styles.apiStatusRow}>
          {isLoading ? (
            <Text style={styles.resultsCount}>Searching Open Beauty Facts…</Text>
          ) : apiError ? (
            <Text style={[styles.resultsCount, { color: '#CA6F1E' }]}>{apiError}</Text>
          ) : (
            <Text style={styles.resultsCount}>
              {displayProducts.length} results from Open Beauty Facts
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.resultsCount}>
          {displayProducts.length} product{displayProducts.length !== 1 ? 's' : ''}
        </Text>
      )}

      <FlatList
        data={displayProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) =>
          item.ingredients.length < 2 ? (
            <NoDataCard
              product={item}
              onScanBarcode={() => { setNoDataProduct(item); setScannerOpen(true); }}
              onScanIngredients={() => { setNoDataProduct(item); setIngredientScannerOpen(true); }}
            />
          ) : (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
              subtitle={flagSubtitle(item)}
            />
          )
        }
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>
              {isApiMode ? 'No products found. Try a different search.' : 'No products match your filters.'}
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function NoDataCard({
  product,
  onScanBarcode,
  onScanIngredients,
}: {
  product: Product;
  onScanBarcode: () => void;
  onScanIngredients: () => void;
}) {
  const meta = CATEGORY_META[product.category] ?? { icon: '📦', bg: '#F5F5F5', color: '#666' };
  return (
    <View style={noDataStyles.card}>
      <View style={[noDataStyles.iconBox, { backgroundColor: meta.bg }]}>
        <Text style={{ fontSize: 22 }}>{meta.icon}</Text>
      </View>
      <View style={noDataStyles.info}>
        <Text style={noDataStyles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={noDataStyles.brand}>{product.brand}</Text>
        <Text style={noDataStyles.prompt}>No ingredient data — scan to analyse:</Text>
        <View style={noDataStyles.scanRow}>
          <TouchableOpacity style={noDataStyles.scanChip} onPress={onScanBarcode} activeOpacity={0.75}>
            <Text style={noDataStyles.scanChipText}>📷 Scan barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity style={noDataStyles.scanChip} onPress={onScanIngredients} activeOpacity={0.75}>
            <Text style={noDataStyles.scanChipText}>🔬 Scan label</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const noDataStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#F0F0F0',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  brand: { fontSize: 12, color: '#888' },
  prompt: { fontSize: 11, color: '#BBB', marginTop: 2 },
  scanRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  scanChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0E6FF', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  scanChipText: { fontSize: 11, fontWeight: '700', color: '#9B59B6' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  topBar: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#AAA', marginTop: 2 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#EBEBEB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#333' },
  scanBtns: { flexDirection: 'row', gap: 2, marginLeft: 4 },
  scanBtn: { padding: 4 },
  scanIcon: { fontSize: 20 },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  chipActiveDefault: { backgroundColor: '#F0E6FF', borderColor: '#C8A2C8' },
  chipIcon: { fontSize: 13 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#999' },
  chipTextActiveDefault: { color: '#9B59B6' },

  sortBtn: {
    marginRight: 12, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#1A1A2E', flexShrink: 0,
  },
  sortBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  apiStatusRow: { paddingHorizontal: 16, marginBottom: 8 },
  resultsCount: { fontSize: 12, color: '#BBB', paddingHorizontal: 16, marginBottom: 8, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },
  empty: { textAlign: 'center', color: '#BBB', marginTop: 60, fontSize: 14 },
});
