import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  score: number; // 0–100
  size?: number;
}

const STROKE_WIDTH = 5;
const DURATION = 1000;

// Draws in on mount (stroke-dashoffset from empty to the score's fraction)
// rather than rendering pre-filled — the score is a claim worth watching
// arrive, not a static number.
export default function ScoreRing({ score, size = 56 }: Props) {
  const { colors, scoreColor } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then((reduceMotion) => {
      Animated.timing(progress, {
        toValue: score,
        duration: reduceMotion ? 0 : DURATION,
        useNativeDriver: false, // strokeDashoffset isn't supported by the native driver
      }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const tint = scoreColor(score);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.line}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tint}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.num, { color: tint }]}>{score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  num: { fontSize: 15, fontWeight: '800' },
});
