import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PRODUCTS } from '../data/products';
import { getCachedProduct } from '../utils/productCache';
import { getShelf, getShelfProduct } from '../utils/shelfStorage';
import { checkConflicts, DetectedConflict } from '../utils/conflictChecker';
import { AppStackParamList } from '../types/navigation';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const SEVERITY_META = {
  avoid:   { label: 'Avoid Together', bg: '#FFE0E0', text: '#C0392B', icon: '🚫' },
  caution: { label: 'Use Caution',    bg: '#FFF3CD', text: '#7A5700', icon: '⚠️' },
  note:    { label: 'Good to Know',   bg: '#E8F4FD', text: '#2471A3', icon: 'ℹ️' },
};

function ConflictCard({ conflict }: { conflict: DetectedConflict }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SEVERITY_META[conflict.pair.severity];
  const sameProduct = conflict.productA.id === conflict.productB.id;

  return (
    <TouchableOpacity style={styles.conflictCard} onPress={() => setExpanded((v) => !v)} activeOpacity={0.85}>
      <View style={styles.conflictHeader}>
        <View style={[styles.severityBadge, { backgroundColor: meta.bg }]}>
          <Text style={styles.severityIcon}>{meta.icon}</Text>
          <Text style={[styles.severityLabel, { color: meta.text }]}>{meta.label}</Text>
        </View>
        <Text style={styles.expandChevron}>{expanded ? '▲' : '▼'}</Text>
      </View>

      <Text style={styles.conflictTitle}>{conflict.pair.title}</Text>

      <View style={styles.conflictProducts}>
        <Text style={styles.conflictIngredient} numberOfLines={1}>
          "{conflict.matchedA}"
        </Text>
        <Text style={styles.conflictArrow}>×</Text>
        <Text style={styles.conflictIngredient} numberOfLines={1}>
          "{conflict.matchedB}"
        </Text>
      </View>

      {!sameProduct && (
        <Text style={styles.conflictProductNames} numberOfLines={1}>
          {conflict.productA.name} · {conflict.productB.name}
        </Text>
      )}

      {expanded && (
        <View style={styles.conflictExpanded}>
          <Text style={styles.conflictReason}>{conflict.pair.reason}</Text>
          <View style={[styles.tipBox, { backgroundColor: meta.bg }]}>
            <Text style={[styles.tipLabel, { color: meta.text }]}>💡 Tip</Text>
            <Text style={[styles.tipText, { color: meta.text }]}>{conflict.pair.tip}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ShelfScreen() {
  const [shelfProducts, setShelfProducts] = useState<Product[]>([]);
  const navigation = useNavigation<Nav>();

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const ids = await getShelf();
        const resolved = await Promise.all(
          ids.map(async (id) =>
            PRODUCTS.find((p) => p.id === id) ??
            getCachedProduct(id) ??
            (await getShelfProduct(id)),
          ),
        );
        setShelfProducts(resolved.filter(Boolean) as Product[]);
      }
      load();
    }, []),
  );

  const conflicts = shelfProducts.length >= 2 ? checkConflicts(shelfProducts) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <View style={styles.topBar}>
          <Text style={styles.title}>My Shelf</Text>
          <Text style={styles.subtitle}>
            {shelfProducts.length === 0
              ? 'Save products from their detail page'
              : `${shelfProducts.length} product${shelfProducts.length !== 1 ? 's' : ''} saved`}
          </Text>
        </View>

        {shelfProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧴</Text>
            <Text style={styles.emptyTitle}>Your shelf is empty</Text>
            <Text style={styles.emptyDesc}>
              Open any product and tap the bookmark icon to add it here. Once you have 2+ products, we'll check for ingredient conflicts.
            </Text>
          </View>
        ) : (
          <View style={styles.productList}>
            {shelfProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
              />
            ))}
          </View>
        )}

        {/* Conflict section */}
        {shelfProducts.length >= 2 && (
          <View style={styles.conflictSection}>
            <View style={styles.conflictSectionHeader}>
              <Text style={styles.sectionLabel}>Conflict Report</Text>
              <View style={[
                styles.conflictCount,
                conflicts.length === 0 ? styles.conflictCountGreen : styles.conflictCountRed,
              ]}>
                <Text style={styles.conflictCountText}>
                  {conflicts.length === 0 ? '✓ Clean' : `${conflicts.length} found`}
                </Text>
              </View>
            </View>

            {conflicts.length === 0 ? (
              <View style={styles.noConflict}>
                <Text style={styles.noConflictIcon}>✅</Text>
                <Text style={styles.noConflictText}>
                  No conflicts detected between your shelf products. Great choices!
                </Text>
              </View>
            ) : (
              <View style={styles.conflictList}>
                {conflicts.map((c, i) => (
                  <ConflictCard key={i} conflict={c} />
                ))}
              </View>
            )}
          </View>
        )}

        {shelfProducts.length === 1 && (
          <View style={styles.needMoreHint}>
            <Text style={styles.needMoreText}>
              Add one more product to enable conflict checking.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  content: { padding: 16, paddingBottom: 40, gap: 16 },

  topBar: { gap: 2 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#AAA' },

  productList: { gap: 10 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  emptyDesc: { fontSize: 14, color: '#AAA', textAlign: 'center', lineHeight: 20, maxWidth: 280 },

  conflictSection: { gap: 12 },
  conflictSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#AAA', textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
  conflictCount: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  conflictCountGreen: { backgroundColor: '#D4F5E2' },
  conflictCountRed: { backgroundColor: '#FFE0E0' },
  conflictCountText: { fontSize: 12, fontWeight: '700', color: '#333' },

  conflictList: { gap: 10 },

  conflictCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  conflictHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  severityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  severityIcon: { fontSize: 13 },
  severityLabel: { fontSize: 11, fontWeight: '700' },
  expandChevron: { fontSize: 11, color: '#CCC' },

  conflictTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },

  conflictProducts: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  conflictIngredient: { fontSize: 12, color: '#666', fontStyle: 'italic', flexShrink: 1 },
  conflictArrow: { fontSize: 14, color: '#CCC', fontWeight: '700' },
  conflictProductNames: { fontSize: 11, color: '#AAA' },

  conflictExpanded: { gap: 10, marginTop: 4 },
  conflictReason: { fontSize: 13, color: '#555', lineHeight: 19 },
  tipBox: { borderRadius: 10, padding: 12, gap: 4 },
  tipLabel: { fontSize: 12, fontWeight: '700' },
  tipText: { fontSize: 13, lineHeight: 18 },

  noConflict: {
    backgroundColor: '#F0FBF4',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  noConflictIcon: { fontSize: 36 },
  noConflictText: { fontSize: 14, color: '#1E8449', textAlign: 'center', lineHeight: 20 },

  needMoreHint: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  needMoreText: { fontSize: 13, color: '#AAA', textAlign: 'center' },
});
