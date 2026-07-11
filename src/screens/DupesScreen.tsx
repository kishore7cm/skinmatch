import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PRODUCTS } from '../data/products';
import { findDupes, dupeExplanation, DupeResult } from '../utils/matching';
import { AppStackParamList } from '../types/navigation';
import ProductCard, { CATEGORY_META, IoniconName } from '../components/ProductCard';
import { Product } from '../types';
import { searchBeautyProducts } from '../api/openBeautyFacts';
import { mapOBFProducts } from '../utils/productMapper';
import { cacheProducts, getCachedProduct } from '../utils/productCache';
import { getShelfProduct } from '../utils/shelfStorage';
import { getApprovedSubmissions } from '../api/submissions';
import BarcodeScanner from '../components/BarcodeScanner';
import EmptyState from '../components/EmptyState';
import { colors, typography, cardStyle } from '../theme';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'Home'>;
type Category = 'all' | Product['category'];

const CATEGORIES: Category[] = ['all', 'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen'];

export default function DupesScreen() {
  const [selected, setSelected] = useState<Product | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [approvedProducts, setApprovedProducts] = useState<Product[]>([]);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isApiMode = query.length >= 3;

  // Approved user submissions, merged additively into the picker + candidate
  // pool below — the existing local-catalog + OBF search logic is untouched.
  useEffect(() => {
    getApprovedSubmissions().then(setApprovedProducts).catch(() => {});
  }, []);

  // Preselect a product when arriving with explicit context (e.g. "Find a
  // gentler alternative" from a Shelf conflict card).
  useEffect(() => {
    const productId = route.params?.productId;
    if (!productId) return;
    (async () => {
      const product =
        PRODUCTS.find((p) => p.id === productId) ??
        getCachedProduct(productId) ??
        (await getShelfProduct(productId));
      if (!product) return;
      if (!PRODUCTS.some((p) => p.id === product.id)) {
        cacheProducts([product]);
        setApiProducts((prev) => (prev.some((p) => p.id === product.id) ? prev : [product, ...prev]));
      }
      setSelected(product);
    })();
  }, [route.params?.productId]);

  useEffect(() => {
    if (!isApiMode) {
      setApiProducts([]);
      setIsLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setIsLoading(true);
      try {
        const raw = await searchBeautyProducts(query, abortRef.current.signal);
        const mapped = mapOBFProducts(raw);
        cacheProducts(mapped);
        setApiProducts(mapped);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setApiProducts([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [query]);

  // Products shown in the picker strip
  const pickerProducts = useMemo(() => {
    if (isApiMode) return apiProducts;
    const q = query.toLowerCase();
    return [...PRODUCTS, ...approvedProducts].filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      const matchesCat = category === 'all' || p.category === category;
      return matchesQuery && matchesCat;
    });
  }, [query, category, isApiMode, apiProducts, approvedProducts]);

  // Candidate pool for dupe scoring: local products + approved submissions +
  // any API products returned
  const candidatePool = useMemo(
    () => [...PRODUCTS, ...approvedProducts, ...apiProducts],
    [apiProducts, approvedProducts],
  );

  const dupes: DupeResult[] = useMemo(
    () => (selected ? findDupes(selected, candidatePool) : []),
    [selected, candidatePool],
  );

  const selectedIsVisible = selected
    ? pickerProducts.some((p) => p.id === selected.id)
    : false;

  function priceLabel(p: Product) {
    return p.price > 0 ? `$${p.price}` : '–';
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.title}>Find a Dupe</Text>
        <Text style={styles.subtitle}>
          {isApiMode
            ? 'Searching 500k+ real products · scored by ingredient overlap'
            : 'Scored by ingredient overlap · comedogenic similarity'}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={colors.inkSoft} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search any product or brand..."
          placeholderTextColor={colors.inkSoft}
          value={query}
          onChangeText={(t) => { setQuery(t); setSelected(null); }}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {isLoading
          ? <ActivityIndicator size="small" color={colors.sage} style={{ marginLeft: 6 }} />
          : (
            <TouchableOpacity onPress={() => setScannerOpen(true)} style={styles.scanBtn}>
              <Ionicons name="camera-outline" size={20} color={colors.sage} />
            </TouchableOpacity>
          )
        }
      </View>

      <BarcodeScanner
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onProductFound={(product) => {
          cacheProducts([product]);
          setApiProducts((prev) => {
            const exists = prev.some((p) => p.id === product.id);
            return exists ? prev : [product, ...prev];
          });
          setSelected(product);
        }}
      />

      {/* Category filter — local mode only */}
      {!isApiMode && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORIES.map((cat) => {
            const isActive = category === cat;
            const meta = cat !== 'all' ? CATEGORY_META[cat] : null;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  isActive && (meta
                    ? { backgroundColor: meta.bg, borderColor: meta.color }
                    : styles.filterChipActiveAll),
                ]}
                onPress={() => { setCategory(cat); setSelected(null); }}
              >
                {meta && <Ionicons name={meta.icon} size={13} color={isActive ? meta.color : colors.inkSoft} style={styles.filterChipIcon} />}
                <Text style={[
                  styles.filterChipText,
                  isActive && (meta ? { color: meta.color } : styles.filterChipTextAll),
                ]}>
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* API status label */}
      {isApiMode && !isLoading && apiProducts.length > 0 && (
        <Text style={styles.apiLabel}>{apiProducts.length} results from Open Beauty Facts</Text>
      )}

      {/* Product picker strip */}
      {pickerProducts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pickerScroll}
          contentContainerStyle={styles.pickerRow}
        >
          {pickerProducts.map((p) => {
            const meta = CATEGORY_META[p.category] ?? { icon: 'cube-outline' as IoniconName, bg: colors.line, color: colors.inkSoft };
            const isActive = selected?.id === p.id;
            const hasIngredients = p.ingredients.length >= 2;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.pickerChip,
                  { borderColor: hasIngredients ? meta.color : colors.line },
                  isActive && { backgroundColor: colors.sage, borderColor: colors.sage },
                  !hasIngredients && styles.pickerChipNoData,
                ]}
                onPress={() => hasIngredients && setSelected(isActive ? null : p)}
                activeOpacity={hasIngredients ? 0.75 : 1}
              >
                <Ionicons name={meta.icon} size={17} color={isActive ? colors.surface : meta.color} style={styles.pickerIcon} />
                <Text style={[styles.pickerName, isActive && styles.pickerNameActive, !hasIngredients && styles.pickerNameDim]} numberOfLines={2}>
                  {p.name}
                </Text>
                {hasIngredients ? (
                  <Text style={[styles.pickerBrand, isActive && styles.pickerBrandActive]}>
                    {p.brand} · {priceLabel(p)}
                  </Text>
                ) : (
                  <Text style={styles.pickerNoData}>No ingredient data</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Source card */}
      {selected && selectedIsVisible && (
        <TouchableOpacity
          style={styles.sourceCard}
          onPress={() => navigation.navigate('ProductDetail', { productId: selected.id })}
          activeOpacity={0.85}
        >
          <View style={styles.sourceLeft}>
            <Text style={styles.sourceLabel}>Comparing</Text>
            <Text style={styles.sourceName}>{selected.name}</Text>
            <Text style={styles.sourceMeta}>
              {selected.brand}
              {selected.price > 0 ? ` · $${selected.price}` : ''}
              {' · '}{selected.ingredients.length} ingredients
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.sage} />
        </TouchableOpacity>
      )}

      {/* Dupes list */}
      {selected && selectedIsVisible ? (
        <FlatList
          data={dupes}
          keyExtractor={(item) => item.product.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.resultsLabel}>
              {dupes.length} alternatives · sorted by match score
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              icon="help-circle-outline"
              title="No alternatives found"
              description="Search for more products in the same category to compare against."
            />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item.product}
              onPress={() => navigation.navigate('ProductDetail', { productId: item.product.id })}
              score={item.score}
              scoreLabel={item.score >= 70 ? 'Great' : item.score >= 40 ? 'Decent' : 'Low'}
              subtitle={dupeExplanation(item)}
            />
          )}
        />
      ) : isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.sage} />
          <Text style={styles.emptyDesc}>Searching Open Beauty Facts…</Text>
        </View>
      ) : pickerProducts.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No products found"
          description="Try a different search or category."
        />
      ) : (
        <EmptyState
          icon="swap-horizontal-outline"
          title="Pick a product to compare"
          description={
            isApiMode
              ? 'Tap a product in the strip above to find its closest ingredient matches.'
              : 'Search or filter above, then tap a product in the strip to find its best-matched alternatives.'
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },

  topBar: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { ...typography.screenTitle, color: colors.ink },
  subtitle: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: colors.surface, borderRadius: 14,
    paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.ink },
  scanBtn: { padding: 4, marginLeft: 4 },

  // flexShrink: 0 on the ScrollView itself (not just its content container)
  // stops it from being compressed once later siblings (the source card, the
  // results list) push total column content past the available height —
  // otherwise the strip clips instead of just scrolling horizontally.
  filterScroll: { flexShrink: 0 },
  // alignItems: 'flex-start' overrides the horizontal ScrollView's default
  // row stretch, which otherwise forces every chip to match the tallest
  // sibling's height, ballooning them into tall cards instead of pills.
  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8, alignItems: 'flex-start' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface,
  },
  filterChipActiveAll: { backgroundColor: colors.sageSoft, borderColor: colors.sage },
  filterChipIcon: {},
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  filterChipTextAll: { color: colors.sage },

  apiLabel: { fontSize: 12, color: colors.inkSoft, fontWeight: '600', paddingHorizontal: 16, marginBottom: 6 },

  // alignItems: 'flex-start' overrides the horizontal ScrollView's default
  // row stretch, which otherwise forces every card to match the tallest
  // sibling's height, leaving dead space below shorter cards' content.
  pickerScroll: { flexShrink: 0 },
  pickerRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 10, alignItems: 'flex-start' },
  pickerChip: {
    borderWidth: 1.5, borderRadius: 14, padding: 12, width: 140,
    backgroundColor: colors.surface, gap: 3,
  },
  pickerIcon: { marginBottom: 2 },
  pickerName: { ...typography.cardTitle, fontSize: 12, color: colors.ink, lineHeight: 16 },
  pickerNameActive: { color: colors.surface },
  pickerBrand: { fontSize: 11, color: colors.inkSoft },
  pickerBrandActive: { color: 'rgba(255,255,255,0.8)' },
  pickerChipNoData: { opacity: 0.5 },
  pickerNameDim: { color: colors.inkSoft },
  pickerNoData: { fontSize: 10, color: colors.inkSoft, fontStyle: 'italic' },

  sourceCard: {
    marginHorizontal: 16, marginBottom: 8,
    ...cardStyle, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: colors.sage,
  },
  sourceLeft: { flex: 1 },
  sourceLabel: { ...typography.eyebrow, fontSize: 10, color: colors.sage, marginBottom: 2 },
  sourceName: { ...typography.cardTitle, color: colors.ink },
  sourceMeta: { fontSize: 12, color: colors.inkSoft, marginTop: 2 },

  resultsLabel: { fontSize: 12, fontWeight: '600', color: colors.inkSoft, marginBottom: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyDesc: { ...typography.body, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
});
