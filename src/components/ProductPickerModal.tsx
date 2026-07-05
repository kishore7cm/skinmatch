import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView,
} from 'react-native';
import { Product } from '../types';
import { PRODUCTS } from '../data/products';
import { getShelf, getShelfProduct } from '../utils/shelfStorage';
import { getCachedProduct } from '../utils/productCache';
import { CATEGORY_META } from './ProductCard';

// Maps routine step types to the product category they expect
export const STEP_CATEGORY: Record<string, Product['category']> = {
  cleanse:    'cleanser',
  tone:       'toner',
  treat:      'serum',
  moisturize: 'moisturizer',
  protect:    'sunscreen',
};

interface Props {
  visible: boolean;
  stepType: string;
  stepLabel: string;
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export default function ProductPickerModal({ visible, stepType, stepLabel, onSelect, onClose }: Props) {
  const [shelfProducts, setShelfProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!visible) return;
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
  }, [visible]);

  const expectedCategory = STEP_CATEGORY[stepType];

  // Sort: matching category first
  const sorted = [...shelfProducts].sort((a, b) => {
    const aMatch = a.category === expectedCategory ? 0 : 1;
    const bMatch = b.category === expectedCategory ? 0 : 1;
    return aMatch - bMatch;
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Assign to {stepLabel}</Text>
            <Text style={styles.subtitle}>
              Pick a product from your shelf
              {expectedCategory ? ` · best match: ${expectedCategory}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {shelfProducts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔖</Text>
            <Text style={styles.emptyTitle}>Your shelf is empty</Text>
            <Text style={styles.emptyDesc}>
              Go to the Ingredients tab, find a product, and tap the bookmark to save it to your shelf first.
            </Text>
            <TouchableOpacity style={styles.closeActionBtn} onPress={onClose}>
              <Text style={styles.closeActionText}>Got it</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const meta = CATEGORY_META[item.category] ?? { icon: '📦', bg: '#F5F5F5', color: '#666' };
              const isMatch = item.category === expectedCategory;
              return (
                <TouchableOpacity
                  style={[styles.row, isMatch && styles.rowMatch]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                    <Text style={styles.icon}>{meta.icon}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.brand}>{item.brand}</Text>
                  </View>
                  <View style={styles.right}>
                    {isMatch && (
                      <View style={[styles.matchChip, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.matchText, { color: meta.color }]}>Best fit</Text>
                      </View>
                    )}
                    <View style={[styles.catChip, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.catText, { color: meta.color }]}>{item.category}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 12, color: '#AAA', marginTop: 3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#555', fontWeight: '700' },

  list: { padding: 16, gap: 10 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: '#EBEBEB',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  rowMatch: { borderColor: '#C8A2C8' },

  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  icon: { fontSize: 22 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  brand: { fontSize: 12, color: '#888' },
  right: { alignItems: 'flex-end', gap: 4 },
  matchChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  matchText: { fontSize: 10, fontWeight: '700' },
  catChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  catText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: '#AAA', textAlign: 'center', lineHeight: 20 },
  closeActionBtn: {
    backgroundColor: '#1A1A2E', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  closeActionText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
