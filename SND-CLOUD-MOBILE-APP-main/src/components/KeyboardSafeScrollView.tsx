import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = ScrollViewProps & {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra space above the keyboard so the caret/input is not flush against it. */
  extraOffset?: number;
  avoidKeyboard?: boolean;
};

const focusedInputNode = () => {
  const state = TextInput.State as {
    currentlyFocusedInput?: () => unknown;
  };
  return (state.currentlyFocusedInput?.() ?? null) as {
    measureInWindow?: (
      callback: (x: number, y: number, width: number, height: number) => void,
    ) => void;
  } | null;
};

/**
 * ScrollView that keeps the focused TextInput visible when the keyboard opens
 * or when focus moves between fields while the keyboard stays open.
 * Use this on any screen with inputs instead of a plain ScrollView.
 *
 * Android uses softwareKeyboardLayoutMode=resize, so the window already shrinks —
 * do not subtract keyboard height again when measuring visibility.
 */
export const KeyboardSafeScrollView = forwardRef<ScrollViewInstance, Props>(function KeyboardSafeScrollView(
  {
    children,
    style,
    contentContainerStyle,
    extraOffset = 24,
    avoidKeyboard = true,
    keyboardShouldPersistTaps = 'handled',
    onScroll,
    ...rest
  },
  ref,
) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const lastFocusedRef = useRef<unknown>(null);
  const [keyboardPad, setKeyboardPad] = useState(0);

  useImperativeHandle(ref, () => scrollRef.current as ScrollViewInstance);

  const ensureFocusedVisible = useCallback(() => {
    const input = focusedInputNode();
    if (!input?.measureInWindow || !scrollRef.current) return;

    const keyboardHeight = keyboardHeightRef.current;
    if (keyboardHeight <= 0) return;

    requestAnimationFrame(() => {
      input.measureInWindow?.((_x, y, _w, height) => {
        const windowHeight = Dimensions.get('window').height;
        // Android resize already excludes the keyboard from window height.
        const covered = Platform.OS === 'android' ? 0 : keyboardHeight;
        const visibleBottom = windowHeight - covered - extraOffset;
        const inputBottom = y + height;
        if (inputBottom <= visibleBottom && y >= 0) return;

        const delta = inputBottom - visibleBottom;
        const nextY = Math.max(0, scrollYRef.current + delta);
        scrollRef.current?.scrollTo({ y: nextY, animated: true });
      });
    });
  }, [extraOffset]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      const height = event.endCoordinates?.height || 0;
      keyboardHeightRef.current = height;
      // Extra scroll room for short forms (change password). Android resize
      // already shrinks the window, so only pad a little there.
      setKeyboardPad(Platform.OS === 'android' ? Math.max(extraOffset, 48) : height + extraOffset);
      setTimeout(() => ensureFocusedVisible(), Platform.OS === 'ios' ? 16 : 100);
    };
    const onHide = () => {
      keyboardHeightRef.current = 0;
      lastFocusedRef.current = null;
      setKeyboardPad(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [ensureFocusedVisible, extraOffset]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (keyboardHeightRef.current <= 0) return;
      const current = focusedInputNode();
      if (!current || current === lastFocusedRef.current) return;
      lastFocusedRef.current = current;
      ensureFocusedVisible();
    }, 280);
    return () => clearInterval(timer);
  }, [ensureFocusedVisible]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
    onScroll?.(event);
  };

  const mergedContentStyle = useMemo(
    () => StyleSheet.flatten([contentContainerStyle, keyboardPad > 0 ? { paddingBottom: keyboardPad } : null]),
    [contentContainerStyle, keyboardPad],
  );

  const scroll = (
    <ScrollView
      ref={scrollRef}
      style={style}
      contentContainerStyle={mergedContentStyle}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      {...rest}
    >
      {children}
    </ScrollView>
  );

  if (!avoidKeyboard) return scroll;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {scroll}
    </KeyboardAvoidingView>
  );
});

export default KeyboardSafeScrollView;
