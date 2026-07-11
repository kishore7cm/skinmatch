import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { PRODUCTS } from '../data/products';
import { getCachedProduct } from '../utils/productCache';
import { getShelf, getShelfProduct, toggleShelf } from '../utils/shelfStorage';
import { checkConflicts, DetectedConflict } from '../utils/conflictChecker';
import { AppStackParamList } from '../types/navigation';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { colors, typography, cardStyle } from '../theme';
import { conflictWarning } from '../utils/haptics';
import EmptyState from '../components/EmptyState';
import { useToast } from '../context/ToastContext';

type Nav = NativeStackNavigationProp<AppStackParamList>;

const SEVERITY_META: Record<string, { label: string; bg: string; text: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  avoid:   { label: 'Avoid Together', bg: colors.claySoft, text: colors.clay, icon: 'close-circle-outline' },
  caution: { label: 'Use Caution',    bg: colors.goldSoft, text: colors.gold, icon: 'warning-outline' },
  note:    { label: 'Good to Know',   bg: colors.sageSoft, text: colors.sage, icon: 'information-circle-outline' },
};

function ConflictCard({
  conflict,
  onRemove,
  onFindAlternative,
}: {
  conflict: DetectedConflict;
  onRemove: (product: Product) => void;
  onFindAlternative: (product: Product) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = SEVERITY_META[conflict.pair.severity];
  const sameProduct = conflict.productA.id === conflict.productB.id;
  const conflictProducts = sameProduct ? [conflict.productA] : [conflict.productA, conflict.productB];

  return (
    <TouchableOpacity style={styles.conflictCard} onPress={() => setExpanded((v) => !v)} activeOpacity={0.85}>
      <View style={styles.conflictHeader}>
        <View style={[styles.severityBadge, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={13} color={meta.text} />
          <Text style={[styles.severityLabel, { color: meta.text }]}>{meta.label}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.inkSoft} />
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
            <View style={styles.tipLabelRow}>
              <Ionicons name="bulb-outline" size={13} color={meta.text} />
              <Text style={[styles.tipLabel, { color: meta.text }]}>Tip</Text>
            </View>
            <Text style={[styles.tipText, { color: meta.text }]}>{conflict.pair.tip}</Text>
          </View>

          <View style={styles.resolveSection}>
            <Text style={styles.resolveLabel}>Resolve</Text>
            {conflictProducts.map((p) => (
              <View key={p.id} style={styles.resolveRow}>
                <Text style={styles.resolveProductName} numberOfLines={1}>{p.name}</Text>
                <View style={styles.resolveChips}>
                  <TouchableOpacity
                    style={styles.resolveChip}
                    onPress={() => onFindAlternative(p)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="swap-horizontal-outline" size={12} color={colors.sage} />
                    <Text style={styles.resolveChipText}>Find gentler alternative</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.resolveChip, styles.resolveChipNeutral]}
                    onPress={() => onRemove(p)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="bookmark-outline" size={12} color={colors.inkSoft} />
                    <Text style={[styles.resolveChipText, styles.resolveChipTextNeutral]}>Remove from shelf</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ShelfScreen() {
  const [shelfProducts, setShelfProducts] = useState<Product[]>([]);
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();
  const prevConflictCount = useRef(0);

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

  async function handleRemoveFromShelf(product: Product) {
    await toggleShelf(product);
    setShelfProducts((prev) => prev.filter((p) => p.id !== product.id));
    showToast(`Removed ${product.name} from your shelf`);
  }

  function handleFindAlternative(product: Product) {
    (navigation.getParent()?.navigate as any)('Dupes', { screen: 'Home', params: { productId: product.id } });
  }

  // Only fires when a NEW conflict appears, not on every re-render/refocus
  // where an existing conflict count is unchanged.
  useEffect(() => {
    if (conflicts.length > prevConflictCount.current) {
      conflictWarning();
    }
    prevConflictCount.current = conflicts.length;
  }, [conflicts.length]);

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
          <EmptyState
            icon="bookmark-outline"
            title="Your shelf is empty"
            description="Open any product and tap the bookmark icon to add it here. Once you have 2+ products, we'll check for ingredient conflicts."
            action={{ label: 'Browse Products', onPress: () => navigation.getParent()?.navigate('Ingredients' as never) }}
          />
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
                <Ionicons name="checkmark-circle" size={36} color={colors.sage} />
                <Text style={styles.noConflictText}>
                  No conflicts detected between your shelf products. Great choices!
                </Text>
              </View>
            ) : (
              <View style={styles.conflictList}>
                {conflicts.map((c, i) => (
                  <ConflictCard
                    key={i}
                    conflict={c}
                    onRemove={handleRemoveFromShelf}
                    onFindAlternative={handleFindAlternative}
                  />
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
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, paddingBottom: 40, gap: 16 },

  topBar: { gap: 2 },
  title: { ...typography.screenTitle, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft },

  productList: { gap: 10 },

  conflictSection: { gap: 12 },
  conflictSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionLabel: { ...typography.eyebrow, color: colors.inkSoft, flex: 1 },
  conflictCount: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  conflictCountGreen: { backgroundColor: colors.sageSoft },
  conflictCountRed: { backgroundColor: colors.claySoft },
  conflictCountText: { fontSize: 12, fontWeight: '700', color: colors.ink },

  conflictList: { gap: 10 },

  conflictCard: { ...cardStyle, gap: 8 },
  conflictHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  severityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  severityLabel: { fontSize: 11, fontWeight: '700' },

  conflictTitle: { ...typography.cardTitle, color: colors.ink },

  conflictProducts: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  conflictIngredient: { fontSize: 12, color: colors.inkSoft, fontStyle: 'italic', flexShrink: 1 },
  conflictArrow: { fontSize: 14, color: colors.inkSoft, fontWeight: '700' },
  conflictProductNames: { fontSize: 11, color: colors.inkSoft },

  conflictExpanded: { gap: 10, marginTop: 4 },
  conflictReason: { ...typography.body, color: colors.inkSoft, lineHeight: 19 },
  tipBox: { borderRadius: 10, padding: 12, gap: 4 },
  tipLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tipLabel: { fontSize: 12, fontWeight: '700' },
  tipText: { fontSize: 13, lineHeight: 18 },

  resolveSection: { gap: 8 },
  resolveLabel: { ...typography.eyebrow, fontSize: 11, color: colors.inkSoft },
  resolveRow: { gap: 6 },
  resolveProductName: { fontSize: 12, fontWeight: '700', color: colors.ink },
  resolveChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resolveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.sageSoft, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  resolveChipText: { fontSize: 11, fontWeight: '700', color: colors.sage },
  resolveChipNeutral: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  resolveChipTextNeutral: { color: colors.inkSoft },

  noConflict: {
    backgroundColor: colors.sageSoft,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  noConflictText: { fontSize: 14, color: colors.sage, textAlign: 'center', lineHeight: 20 },

  needMoreHint: {
    backgroundColor: colors.line,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  needMoreText: { fontSize: 13, color: colors.inkSoft, textAlign: 'center' },
});
