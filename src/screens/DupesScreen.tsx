import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PRODUCTS } from '../data/products';
import { findDupes, dupeExplanation, DupeResult } from '../utils/matching';
import { AppStackParamList } from '../types/navigation';
import ProductCard, { CATEGORY_META } from '../components/ProductCard';
import { Product } from '../types';
import { searchBeautyProducts } from '../api/openBeautyFacts';
import { mapOBFProducts } from '../utils/productMapper';
import { cacheProducts } from '../utils/productCache';
import BarcodeScanner from '../components/BarcodeScanner';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Category = 'all' | Product['category'];

const CATEGORIES: Category[] = ['all', 'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen'];

export default function DupesScreen() {
  const [selected, setSelected] = useState<Product | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const navigation = useNavigation<Nav>();
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isApiMode = query.length >= 3;

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
    return PRODUCTS.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
      const matchesCat = category === 'all' || p.category === category;
      return matchesQuery && matchesCat;
    });
  }, [query, category, isApiMode, apiProducts]);

  // Candidate pool for dupe scoring: local products + any API products returned
  const candidatePool = useMemo(
    () => [...PRODUCTS, ...apiProducts],
    [apiProducts],
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
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search any product or brand..."
          placeholderTextColor="#BBB"
          value={query}
          onChangeText={(t) => { setQuery(t); setSelected(null); }}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {isLoading
          ? <ActivityIndicator size="small" color="#C8A2C8" style={{ marginLeft: 6 }} />
          : (
            <TouchableOpacity onPress={() => setScannerOpen(true)} style={styles.scanBtn}>
              <Text style={styles.scanIcon}>📷</Text>
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
                {meta && <Text style={styles.filterChipIcon}>{meta.icon}</Text>}
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
          contentContainerStyle={styles.pickerRow}
        >
          {pickerProducts.map((p) => {
            const meta = CATEGORY_META[p.category] ?? { icon: '📦', bg: '#F5F5F5', color: '#666' };
            const isActive = selected?.id === p.id;
            const hasIngredients = p.ingredients.length >= 2;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.pickerChip,
                  { borderColor: hasIngredients ? meta.color : '#DDD' },
                  isActive && { backgroundColor: '#C8A2C8', borderColor: '#C8A2C8' },
                  !hasIngredients && styles.pickerChipNoData,
                ]}
                onPress={() => hasIngredients && setSelected(isActive ? null : p)}
                activeOpacity={hasIngredients ? 0.75 : 1}
              >
                <Text style={styles.pickerIcon}>{meta.icon}</Text>
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
          <Text style={styles.sourceArrow}>›</Text>
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
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🤷</Text>
              <Text style={styles.emptyTitle}>No alternatives found</Text>
              <Text style={styles.emptyDesc}>
                Search for more products in the same category to compare against.
              </Text>
            </View>
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
      ) : (
        <View style={styles.emptyState}>
          {isLoading ? (
            <>
              <ActivityIndicator size="large" color="#C8A2C8" />
              <Text style={styles.emptyDesc}>Searching Open Beauty Facts…</Text>
            </>
          ) : pickerProducts.length === 0 ? (
            <>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyDesc}>Try a different search or category.</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyIcon}>🔄</Text>
              <Text style={styles.emptyTitle}>Pick a product to compare</Text>
              <Text style={styles.emptyDesc}>
                {isApiMode
                  ? 'Tap a product in the strip above to find its closest ingredient matches.'
                  : 'Search or filter above, then tap a product in the strip to find its best-matched alternatives.'}
              </Text>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },

  topBar: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#AAA', marginTop: 2 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#EBEBEB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#333' },
  scanBtn: { padding: 4, marginLeft: 4 },
  scanIcon: { fontSize: 20 },

  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E5E5', backgroundColor: '#FFF',
  },
  filterChipActiveAll: { backgroundColor: '#F0E6FF', borderColor: '#C8A2C8' },
  filterChipIcon: { fontSize: 13 },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#999' },
  filterChipTextAll: { color: '#9B59B6' },

  apiLabel: { fontSize: 12, color: '#BBB', fontWeight: '600', paddingHorizontal: 16, marginBottom: 6 },

  pickerRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  pickerChip: {
    borderWidth: 1.5, borderRadius: 14, padding: 12, width: 140,
    backgroundColor: '#FFF', gap: 3,
  },
  pickerIcon: { fontSize: 18 },
  pickerName: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', lineHeight: 16 },
  pickerNameActive: { color: '#FFF' },
  pickerBrand: { fontSize: 11, color: '#AAA' },
  pickerBrandActive: { color: 'rgba(255,255,255,0.8)' },
  pickerChipNoData: { opacity: 0.5 },
  pickerNameDim: { color: '#999' },
  pickerNoData: { fontSize: 10, color: '#BBB', fontStyle: 'italic' },

  sourceCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 4, borderLeftColor: '#C8A2C8',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  sourceLeft: { flex: 1 },
  sourceLabel: { fontSize: 10, fontWeight: '700', color: '#C8A2C8', textTransform: 'uppercase', marginBottom: 2 },
  sourceName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  sourceMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  sourceArrow: { fontSize: 24, color: '#C8A2C8', fontWeight: '300' },

  resultsLabel: { fontSize: 12, fontWeight: '600', color: '#AAA', marginBottom: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: '#AAA', textAlign: 'center', lineHeight: 20 },
});
