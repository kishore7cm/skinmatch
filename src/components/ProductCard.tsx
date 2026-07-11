import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { colors, typography, cardStyle, scoreColor } from '../theme';
import ScoreRing from './ScoreRing';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Category is differentiated by icon only, not a per-category hue — one
// consistent icon-box treatment (sageSoft/sage) across the app.
export const CATEGORY_META: Record<string, { icon: IoniconName; bg: string; color: string }> = {
  cleanser:    { icon: 'water-outline', bg: colors.sageSoft, color: colors.sage },
  toner:       { icon: 'leaf-outline', bg: colors.sageSoft, color: colors.sage },
  serum:       { icon: 'sparkles', bg: colors.sageSoft, color: colors.sage },
  moisturizer: { icon: 'cube-outline', bg: colors.sageSoft, color: colors.sage },
  sunscreen:   { icon: 'sunny-outline', bg: colors.sageSoft, color: colors.sage },
};

interface Props {
  product: Product;
  onPress: () => void;
  score?: number;
  scoreLabel?: string;
  subtitle?: React.ReactNode;
}

export default function ProductCard({ product, onPress, score, scoreLabel, subtitle }: Props) {
  const meta = CATEGORY_META[product.category] ?? { icon: 'cube-outline' as IoniconName, bg: colors.line, color: colors.inkSoft };

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
          <Ionicons name={meta.icon} size={24} color={meta.color} />
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
        {score !== undefined && (
          <View style={styles.scoreWrap}>
            <ScoreRing score={score} size={48} />
            {scoreLabel && <Text style={[styles.scoreLabel, { color: scoreColor(score) }]}>{scoreLabel}</Text>}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 3 },
  name: { ...typography.cardTitle, color: colors.ink },
  brand: { fontSize: 12, color: colors.inkSoft },
  categoryChip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  categoryText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  subtitle: { fontSize: 11, color: colors.inkSoft, marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 6 },
  price: { ...typography.bodyStrong, fontSize: 15, color: colors.ink },
  scoreWrap: { alignItems: 'center', gap: 2 },
  scoreLabel: { fontSize: 9, fontWeight: '600' },
});
