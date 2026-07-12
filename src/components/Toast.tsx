import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet, AccessibilityInfo } from 'react-native';
import { typography, useTheme, ColorTokens } from '../theme';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastProps {
  message: string;
  action?: ToastAction;
  onDismiss: () => void;
}

const VISIBLE_MS = 2200;
const ANIM_MS = 220;

export default function Toast({ message, action, onDismiss }: ToastProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let reduceMotion = false;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduceMotion = v; });

    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: reduceMotion ? 0 : ANIM_MS, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 0 : ANIM_MS, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 40, duration: reduceMotion ? 0 : ANIM_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: reduceMotion ? 0 : ANIM_MS, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, VISIBLE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }], opacity }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      {action && (
        <TouchableOpacity
          onPress={() => { action.onPress(); onDismiss(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.action}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  container: {
    position: 'absolute', left: 16, right: 16, bottom: 24,
    backgroundColor: colors.ink, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: { ...typography.body, color: colors.surface, flex: 1 },
  action: { ...typography.bodyStrong, color: colors.sageSoft },
});
