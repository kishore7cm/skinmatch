import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Product } from '../types';

export const CATEGORY_META: Record<string, { icon: string; bg: string; color: string }> = {
  cleanser:    { icon: '🫧', bg: '#E8F4FD', color: '#2471A3' },
  toner:       { icon: '💧', bg: '#EAF4FB', color: '#1A8FC1' },
  serum:       { icon: '✨', bg: '#FEF9E7', color: '#B7950B' },
  moisturizer: { icon: '🧴', bg: '#E9F7EF', color: '#1E8449' },
  sunscreen:   { icon: '☀️', bg: '#FEF5E7', color: '#CA6F1E' },
};

interface Props {
  product: Product;
  onPress: () => void;
  score?: number;
  scoreLabel?: string;
  subtitle?: string;
}

function scoreBadgeStyle(score: number) {
  if (score >= 70) return { bg: '#D4F5E2', text: '#1A6B3C' };
  if (score >= 40) return { bg: '#FFF3CD', text: '#7A5700' };
  return { bg: '#FFE0E0', text: '#8B1A1A' };
}

export default function ProductCard({ product, onPress, score, scoreLabel, subtitle }: Props) {
  const meta = CATEGORY_META[product.category] ?? { icon: '📦', bg: '#F5F5F5', color: '#666' };
  const badge = score !== undefined ? scoreBadgeStyle(score) : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {product.imageUrl ? (
        <Image
          source={{ uri: product.imageUrl }}
          style={[styles.iconBox, { backgroundColor: meta.bg }]}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
          <Text style={styles.icon}>{meta.icon}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.brand}>{product.brand}</Text>
        <View style={[styles.categoryChip, { backgroundColor: meta.bg }]}>
          <Text style={[styles.categoryText, { color: meta.color }]}>{product.category}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <View style={styles.right}>
        <Text style={styles.price}>{product.price > 0 ? `$${product.price}` : '–'}</Text>
        {badge && score !== undefined && (
          <View style={[styles.scoreBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.scoreNum, { color: badge.text }]}>{score}</Text>
            {scoreLabel && <Text style={[styles.scoreLabel, { color: badge.text }]}>{scoreLabel}</Text>}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 24 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  brand: { fontSize: 12, color: '#888' },
  categoryChip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  subtitle: { fontSize: 11, color: '#888', marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 6 },
  price: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  scoreBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  scoreNum: { fontSize: 18, fontWeight: '800' },
  scoreLabel: { fontSize: 9, fontWeight: '600', marginTop: 1 },
});
