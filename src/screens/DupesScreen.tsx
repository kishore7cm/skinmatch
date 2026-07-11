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
import ProductCard, { CATEGORY_META } from '../components/ProductCard';
import { Product } from '../types';
import { searchBeautyProducts } from '../api/openBeautyFacts';
import { mapOBFProducts } from '../utils/productMapper';
import { cacheProducts, getCachedProduct } from '../utils/productCache';
import { getShelfProduct } from '../utils/shelfStorage';
import { getApprovedSubmissions } from '../api/submissions';
import BarcodeScanner from '../components/BarcodeScanner';
import EmptyState from '../components/EmptyState';
import { colors, typography } from '../theme';

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

  // Products shown in the browse list
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

      {/* Results count */}
      {isApiMode ? (
        !isLoading && apiProducts.length > 0 && (
          <Text style={styles.resultsCount}>{apiProducts.length} results from Open Beauty Facts</Text>
        )
      ) : (
        <Text style={styles.resultsCount}>
          {pickerProducts.length} product{pickerProducts.length !== 1 ? 's' : ''} · tap one to compare
        </Text>
      )}

      {/* Browse list — tapping a product expands its alternatives inline */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.sage} />
          <Text style={styles.emptyDesc}>Searching Open Beauty Facts…</Text>
        </View>
      ) : (
        <FlatList
          data={pickerProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No products found"
              description="Try a different search or category."
            />
          }
          renderItem={({ item }) => {
            const hasIngredients = item.ingredients.length >= 2;
            const isExpanded = selected?.id === item.id;
            return (
              <View>
                <View style={[isExpanded && styles.productExpanded, !hasIngredients && styles.productDim]}>
                  <ProductCard
                    product={item}
                    onPress={() => { if (hasIngredients) setSelected(isExpanded ? null : item); }}
                    subtitle={hasIngredients ? undefined : 'No ingredient data'}
                  />
                </View>

                {isExpanded && (
                  <View style={styles.dupeSection}>
                    <View style={styles.dupeSectionHeader}>
                      <Text style={styles.dupeSectionLabel}>
                        {dupes.length} alternative{dupes.length !== 1 ? 's' : ''} · sorted by match score
                      </Text>
                      <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}>
                        <Text style={styles.viewDetailsLink}>View details</Text>
                      </TouchableOpacity>
                    </View>

                    {dupes.length === 0 ? (
                      <EmptyState
                        icon="help-circle-outline"
                        title="No alternatives found"
                        description="Search for more products in the same category to compare against."
                      />
                    ) : (
                      dupes.map((d) => (
                        <ProductCard
                          key={d.product.id}
                          product={d.product}
                          onPress={() => navigation.navigate('ProductDetail', { productId: d.product.id })}
                          score={d.score}
                          scoreLabel={d.score >= 70 ? 'Great' : d.score >= 40 ? 'Decent' : 'Low'}
                          subtitle={dupeExplanation(d)}
                        />
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          }}
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
  // stops it from being compressed once later siblings push total column
  // content past the available height.
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

  resultsCount: { fontSize: 12, color: colors.inkSoft, fontWeight: '600', paddingHorizontal: 16, marginBottom: 6 },

  list: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },

  // A left accent border marks which product's alternatives are currently
  // expanded, mirroring the "Comparing" source-card treatment this replaced.
  productExpanded: {
    borderLeftWidth: 4, borderLeftColor: colors.sage, borderRadius: 4,
    marginLeft: -8, paddingLeft: 8,
  },
  productDim: { opacity: 0.5 },

  dupeSection: { marginTop: 10, paddingLeft: 12, gap: 10 },
  dupeSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2,
  },
  dupeSectionLabel: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  viewDetailsLink: { fontSize: 12, fontWeight: '700', color: colors.sage },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyDesc: { ...typography.body, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
});
