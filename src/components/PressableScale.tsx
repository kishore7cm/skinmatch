import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
import { lightImpact } from '../utils/haptics';

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const SCALE_DOWN = 0.94;
const DURATION = 80;

// Wraps a primary action button with a scale-down press state, per the
// design system's micro-interaction spec — drop-in replacement for
// TouchableOpacity on primary CTAs only, not every touchable in the app.
export default function PressableScale({ style, children, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn(e: GestureResponderEvent) {
    Animated.timing(scale, { toValue: SCALE_DOWN, duration: DURATION, useNativeDriver: true }).start();
    lightImpact();
    onPressIn?.(e);
  }
  function handlePressOut(e: GestureResponderEvent) {
    Animated.timing(scale, { toValue: 1, duration: DURATION, useNativeDriver: true }).start();
    onPressOut?.(e);
  }

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
