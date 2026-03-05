/**
 * Component test setup - comprehensive React Native mock for render tests.
 * Imported by component test files before running.
 */

// Provide a full React Native mock for component rendering
jest.mock('react-native', () => {
  const React = require('react');

  const createMockComponent = (name: string) => {
    const Component = ({ children, testID, ...props }: any) =>
      React.createElement(name, { testID, ...props }, children);
    Component.displayName = name;
    return Component;
  };

  const AnimatedValue = class {
    _value: number;
    constructor(value: number) { this._value = value; }
    setValue(v: number) { this._value = v; }
    interpolate(config: any) { return this; }
    addListener() { return ''; }
    removeListener() {}
    removeAllListeners() {}
    stopAnimation(cb?: (v: number) => void) { cb?.(this._value); }
  };

  const AnimatedValueXY = class {
    x: any;
    y: any;
    constructor(value?: { x: number; y: number }) {
      this.x = new AnimatedValue(value?.x ?? 0);
      this.y = new AnimatedValue(value?.y ?? 0);
    }
  };

  const timingFn = () => ({
    start: (cb?: () => void) => cb?.(),
    stop: () => {},
    reset: () => {},
  });

  const Animated = {
    Value: AnimatedValue,
    ValueXY: AnimatedValueXY,
    View: createMockComponent('Animated.View'),
    Text: createMockComponent('Animated.Text'),
    Image: createMockComponent('Animated.Image'),
    ScrollView: createMockComponent('Animated.ScrollView'),
    FlatList: createMockComponent('Animated.FlatList'),
    createAnimatedComponent: (c: any) => c,
    timing: timingFn,
    spring: timingFn,
    decay: timingFn,
    sequence: () => timingFn(),
    parallel: () => timingFn(),
    stagger: () => timingFn(),
    delay: () => timingFn(),
    loop: () => timingFn(),
    event: () => jest.fn(),
    add: () => new AnimatedValue(0),
    subtract: () => new AnimatedValue(0),
    multiply: () => new AnimatedValue(0),
    divide: () => new AnimatedValue(0),
    diffClamp: () => new AnimatedValue(0),
  };

  return {
    Platform: {
      OS: 'ios',
      select: (obj: Record<string, unknown>) => obj.ios ?? obj.default,
      Version: 17,
    },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      flatten: (s: any) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {}),
      hairlineWidth: 1,
      compose: (a: any, b: any) => [a, b],
    },
    View: createMockComponent('View'),
    Text: createMockComponent('Text'),
    Image: createMockComponent('Image'),
    TouchableOpacity: createMockComponent('TouchableOpacity'),
    TouchableHighlight: createMockComponent('TouchableHighlight'),
    TouchableWithoutFeedback: createMockComponent('TouchableWithoutFeedback'),
    Pressable: createMockComponent('Pressable'),
    ScrollView: createMockComponent('ScrollView'),
    FlatList: createMockComponent('FlatList'),
    SectionList: createMockComponent('SectionList'),
    ActivityIndicator: createMockComponent('ActivityIndicator'),
    SafeAreaView: createMockComponent('SafeAreaView'),
    StatusBar: createMockComponent('StatusBar'),
    TextInput: createMockComponent('TextInput'),
    Switch: createMockComponent('Switch'),
    Modal: createMockComponent('Modal'),
    Alert: { alert: jest.fn() },
    Dimensions: {
      get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    PixelRatio: { get: () => 2, roundToNearestPixel: (v: number) => v },
    Linking: { openURL: jest.fn() },
    Animated,
    Easing: {
      linear: (t: number) => t,
      ease: (t: number) => t,
      quad: (t: number) => t,
      cubic: (t: number) => t,
      bezier: () => (t: number) => t,
      in: () => (t: number) => t,
      out: () => (t: number) => t,
      inOut: () => (t: number) => t,
    },
    useColorScheme: () => 'dark',
    useWindowDimensions: () => ({ width: 375, height: 812 }),
    AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
    NativeModules: {},
    NativeEventEmitter: jest.fn().mockImplementation(() => ({
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
    I18nManager: { isRTL: false },
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement('SafeAreaView', props, children),
    SafeAreaProvider: ({ children }: any) => children,
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
  Swipeable: jest.fn(),
  DrawerLayout: jest.fn(),
  State: {},
  PanGestureHandler: jest.fn(),
  TapGestureHandler: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  default: { call: jest.fn() },
  useSharedValue: (v: number) => ({ value: v }),
  useAnimatedStyle: () => ({}),
  withTiming: (v: number) => v,
  withSpring: (v: number) => v,
  withDelay: (_d: number, v: number) => v,
  withSequence: (...args: number[]) => args[args.length - 1],
  withRepeat: (v: number) => v,
  Easing: { linear: (t: number) => t, bezier: () => (t: number) => t },
  FadeIn: { duration: () => ({ delay: () => ({}) }) },
  FadeOut: { duration: () => ({ delay: () => ({}) }) },
  SlideInRight: { duration: () => ({}) },
  SlideOutLeft: { duration: () => ({}) },
}));

// Mock @react-navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    emit: jest.fn().mockReturnValue({ defaultPrevented: false }),
  }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: jest.fn(),
  useIsFocused: () => true,
  NavigationContainer: ({ children }: any) => children,
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

// Mock expo modules
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('expo-constants', () => ({ default: { expoConfig: { extra: {} } } }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(), getStringAsync: jest.fn() }));
jest.mock('expo-av', () => ({
  Audio: { Sound: { createAsync: jest.fn() } },
  Video: jest.fn(),
}));
jest.mock('expo-image', () => {
  const React = require('react');
  return { Image: (props: any) => React.createElement('Image', props) };
});

// Mock WalletProvider
jest.mock('../../providers/WalletProvider', () => ({
  useWallet: jest.fn(() => ({
    publicKey: null,
    connected: false,
    connecting: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    signTransaction: jest.fn(),
    signMessage: jest.fn(),
  })),
  WalletProvider: ({ children }: any) => children,
}));

// Mock wallet-auth
jest.mock('../../lib/solana/wallet-auth', () => ({
  authenticateWithWallet: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));

// Mock uuid
jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

// Mock Supabase
jest.mock('../../lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

// Silence console.warn from RN internals during tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Animated')) return;
  originalWarn.call(console, ...args);
};
