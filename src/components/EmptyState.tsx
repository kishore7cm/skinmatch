import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, useTheme, ColorTokens } from '../theme';
import PressableScale from './PressableScale';
import { IoniconName } from './ProductCard';

interface Props {
  icon: IoniconName;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
}

export default function EmptyState({ icon, title, description, action }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={44} color={colors.line} />
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {action ? (
        <PressableScale style={styles.actionBtn} onPress={action.onPress}>
          <Text style={styles.actionText}>{action.label}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 40, gap: 10 },
  title: { ...typography.cardTitle, fontSize: 17, color: colors.ink, textAlign: 'center' },
  desc: { ...typography.body, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  actionBtn: {
    marginTop: 6, backgroundColor: colors.sage, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  actionText: { ...typography.bodyStrong, fontSize: 13, color: colors.surface },
});
