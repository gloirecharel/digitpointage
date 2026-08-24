import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

export function AnimatedEntrance({ children, delay = 0, index = 0 }: { children: ReactNode; delay?: number; index?: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);

  useEffect(() => {
    const total = delay + index * 60;
    opacity.value = withDelay(total, withTiming(1, { duration: 380, easing: Easing.out(Easing.exp) }));
    translateY.value = withDelay(total, withTiming(0, { duration: 420, easing: Easing.out(Easing.exp) }));
  }, [delay, index]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={style}>
      {children}
    </Animated.View>
  );
}

export function StaggeredEntrance({ children, gap = 70 }: { children: ReactNode; gap?: number }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.exp) });
    translateY.value = withTiming(0, { duration: 480, easing: Easing.out(Easing.exp) });
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={style}>
      {children}
    </Animated.View>
  );
}

export function usePulse() {
  const scale = useSharedValue(1);
  const trigger = () => {
    scale.value = withTiming(1.05, { duration: 120 }, () => {
      scale.value = withTiming(1, { duration: 180 });
    });
  };
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return { style, trigger };
}

const styles = StyleSheet.create({});
