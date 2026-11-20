import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** Matches native expo-splash-screen background. */
export const BRAND_SPLASH_BG = '#312E81';

const SLIDE_MS = 700;
const HOLD_MS = 450;

type BrandSplashProps = {
  /** Native splash can hide — brand UI is painted. */
  onReady?: () => void;
  /** Slide + fade finished. */
  onFinished?: () => void;
  /** Play slide animation (boot). PersistGate can skip. */
  animate?: boolean;
};

/**
 * Text slides left → right into center, holds, then splash fades out.
 */
export function BrandSplash({
  onReady,
  onFinished,
  animate = true,
}: BrandSplashProps) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(animate ? -width : 0);

  useEffect(() => {
    onReady?.();
    if (!animate) return undefined;

    const finish = () => {
      onFinished?.();
    };

    // Slide from left into center — text stays fully visible (no fade/hide).
    translateX.value = withTiming(0, {
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
    });

    // After center hold, continue boot (text is not faded out).
    const timer = setTimeout(finish, SLIDE_MS + HOLD_MS);

    return () => {
      clearTimeout(timer);
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={styles.screen}>
      <StatusBar style="light" backgroundColor={BRAND_SPLASH_BG} />
      <Animated.View style={[styles.copy, textStyle]}>
        <Text style={styles.title}>{"Jaffar Son's"}</Text>
        <Text style={styles.subtitle}>International</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_SPLASH_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  copy: {
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});
