import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import BarcodeScanner from '../components/BarcodeScanner';
import IngredientScanner from '../components/IngredientScanner';
import { PRODUCTS } from '../data/products';
import { AppStackParamList } from '../types/navigation';
import { getCategoryMeta, IoniconName } from '../components/ProductCard';
import ProductCard from '../components/ProductCard';
import { countFlags } from '../utils/ingredientUtils';
import { computeVerdict } from '../utils/verdict';
import { Product } from '../types';
import { searchBeautyProducts } from '../api/openBeautyFacts';
import { mapOBFProducts } from '../utils/productMapper';
import { cacheProducts } from '../utils/productCache';
import { getApprovedSubmissions } from '../api/submissions';
import { typography, useTheme, ColorTokens } from '../theme';
import EmptyState from '../components/EmptyState';
import ProductSubmissionFlow from '../components/ProductSubmissionFlow';

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
  const { colors, cardStyle } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const noDataStyles = useMemo(() => createNoDataStyles(colors, cardStyle), [colors, cardStyle]);
  const categoryMeta = useMemo(() => getCategoryMeta(colors), [colors]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [ingredientScannerOpen, setIngredientScannerOpen] = useState(false);
  const [noDataProduct, setNoDataProduct] = useState<Product | null>(null);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submissionBarcode, setSubmissionBarcode] = useState<string | undefined>(undefined);
  const [approvedProducts, setApprovedProducts] = useState<Product[]>([]);
  const navigation = useNavigation<Nav>();
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isApiMode = query.length >= 3;

  // Approved user submissions, merged additively into local search — the
  // existing local-catalog + OBF search logic below is untouched.
  useEffect(() => {
    getApprovedSubmissions().then(setApprovedProducts).catch(() => {});
  }, []);

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
    let list = [...PRODUCTS, ...approvedProducts].filter((p) => {
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
  }, [query, category, sortMode, approvedProducts]);

  const displayProducts = isApiMode ? (apiError ? localFiltered : apiProducts) : localFiltered;

  // Matches the color tokens used on ProductDetailScreen's own flag counts
  // (clay for comedogenic, gold for irritant) so the same signal reads the
  // same way in the list as it does once you open the product.
  function flagSubtitle(product: Product): React.ReactNode {
    const { comedogenic, irritant } = countFlags(product.ingredients);
    if (comedogenic === 0 && irritant === 0) return '✓ No flagged ingredients';
    return (
      <>
        {comedogenic > 0 && <Text style={{ color: colors.clay }}>{comedogenic} pore-clogging</Text>}
        {comedogenic > 0 && irritant > 0 && <Text> · </Text>}
        {irritant > 0 && <Text style={{ color: colors.gold }}>{irritant} irritant</Text>}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Products</Text>
        <Text style={styles.subtitle}>Tap any product to see its full analysis</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={colors.inkSoft} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search any product or brand..."
          placeholderTextColor={colors.inkSoft}
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {isLoading
          ? <ActivityIndicator size="small" color={colors.sage} style={{ marginLeft: 6 }} />
          : (
            <View style={styles.scanBtns}>
              <TouchableOpacity onPress={() => setScannerOpen(true)} style={styles.scanBtn}>
                <Ionicons name="camera-outline" size={20} color={colors.sage} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIngredientScannerOpen(true)} style={styles.scanBtn}>
                <Ionicons name="flask-outline" size={20} color={colors.sage} />
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
        onSubmitProduct={(barcode) => {
          setSubmissionBarcode(barcode);
          setSubmissionOpen(true);
        }}
      />

      <IngredientScanner
        visible={ingredientScannerOpen}
        onClose={() => { setIngredientScannerOpen(false); setNoDataProduct(null); }}
      />

      <ProductSubmissionFlow
        visible={submissionOpen}
        onClose={() => setSubmissionOpen(false)}
        initialBarcode={submissionBarcode}
      />

      {/* Category filter — hidden in API mode */}
      {!isApiMode && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          {CATEGORIES.map((cat) => {
            const isActive = category === cat;
            const meta = cat !== 'all' ? categoryMeta[cat] : null;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isActive && (meta ? { backgroundColor: meta.bg, borderColor: meta.color } : styles.chipActiveDefault)]}
                onPress={() => setCategory(cat)}
              >
                {meta && <Ionicons name={meta.icon} size={13} color={isActive ? meta.color : colors.inkSoft} style={styles.chipIcon} />}
                <Text style={[styles.chipText, isActive && (meta ? { color: meta.color } : styles.chipTextActiveDefault)]}>
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Results count / status, with sort control sharing the same row */}
      {isApiMode ? (
        <View style={styles.apiStatusRow}>
          {isLoading ? (
            <Text style={styles.resultsCount}>Searching Open Beauty Facts…</Text>
          ) : apiError ? (
            <Text style={[styles.resultsCount, { color: colors.clay }]}>{apiError}</Text>
          ) : (
            <Text style={styles.resultsCount}>
              {displayProducts.length} results from Open Beauty Facts
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.resultsRow}>
          <Text style={styles.resultsCount}>
            {displayProducts.length} product{displayProducts.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity style={styles.sortBtn} onPress={cycleSort}>
            <Ionicons name="swap-vertical" size={12} color={colors.inkSoft} />
            <Text style={styles.sortBtnText}>{SORT_LABELS[sortMode]}</Text>
          </TouchableOpacity>
        </View>
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
              colors={colors}
              styles={noDataStyles}
              categoryMeta={categoryMeta}
            />
          ) : (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
              subtitle={flagSubtitle(item)}
              verdict={computeVerdict(item.ingredients)}
            />
          )
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="search-outline"
              title="No products found"
              description={
                isApiMode
                  ? "Can't find it? It might not be in our database yet."
                  : 'Try a different category or search term.'
              }
              action={isApiMode ? {
                label: 'Submit this product',
                onPress: () => { setSubmissionBarcode(undefined); setSubmissionOpen(true); },
              } : undefined}
            />
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
  colors,
  styles: noDataStyles,
  categoryMeta,
}: {
  product: Product;
  onScanBarcode: () => void;
  onScanIngredients: () => void;
  colors: ColorTokens;
  styles: ReturnType<typeof createNoDataStyles>;
  categoryMeta: ReturnType<typeof getCategoryMeta>;
}) {
  const meta = categoryMeta[product.category] ?? { icon: 'cube-outline' as IoniconName, bg: colors.line, color: colors.inkSoft };
  return (
    <View style={noDataStyles.card}>
      <View style={[noDataStyles.iconBox, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>
      <View style={noDataStyles.info}>
        <Text style={noDataStyles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={noDataStyles.brand}>{product.brand}</Text>
        <Text style={noDataStyles.prompt}>No ingredient data — scan to analyse:</Text>
        <View style={noDataStyles.scanRow}>
          <TouchableOpacity style={noDataStyles.scanChip} onPress={onScanBarcode} activeOpacity={0.75}>
            <Ionicons name="camera-outline" size={12} color={colors.sage} />
            <Text style={noDataStyles.scanChipText}>Scan barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity style={noDataStyles.scanChip} onPress={onScanIngredients} activeOpacity={0.75}>
            <Ionicons name="flask-outline" size={12} color={colors.sage} />
            <Text style={noDataStyles.scanChipText}>Scan label</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const createNoDataStyles = (colors: ColorTokens, cardStyle: object) => StyleSheet.create({
  card: {
    ...cardStyle,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  info: { flex: 1, gap: 4 },
  name: { ...typography.cardTitle, fontSize: 14, color: colors.ink },
  brand: { fontSize: 12, color: colors.inkSoft },
  prompt: { fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  scanRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  scanChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.sageSoft, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  scanChipText: { fontSize: 11, fontWeight: '700', color: colors.sage },
});

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  topBar: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { ...typography.screenTitle, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft, marginTop: 2 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.ink },
  scanBtns: { flexDirection: 'row', gap: 2, marginLeft: 4 },
  scanBtn: { padding: 4 },

  chipsScroll: { flexGrow: 0, height: 44 },
  chips: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipActiveDefault: { backgroundColor: colors.sageSoft, borderColor: colors.sage },
  chipIcon: {},
  chipText: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  chipTextActiveDefault: { color: colors.sage },

  resultsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface,
  },
  sortBtnText: { fontSize: 11, fontWeight: '700', color: colors.inkSoft },

  apiStatusRow: { paddingHorizontal: 16, marginBottom: 8 },
  resultsCount: { fontSize: 12, color: colors.inkSoft, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },
});
