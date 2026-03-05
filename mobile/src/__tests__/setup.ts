// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
    getAllKeys: jest.fn(() => Promise.resolve([])),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiSet: jest.fn(() => Promise.resolve()),
  },
}));

// Mock react-native with all components used by screens
jest.mock('react-native', () => {
  const React = require('react');
  const createElement = React.createElement;

  function createMockComponent(name: string) {
    const component = ({ children, ...props }: Record<string, unknown>) =>
      createElement(name, props, children as React.ReactNode);
    component.displayName = name;
    return component;
  }

  // Animated mock
  const AnimatedValue = class {
    _value: number;
    constructor(v: number) { this._value = v; }
    interpolate(config: { inputRange: number[]; outputRange: number[] }) {
      return this;
    }
    setValue(v: number) { this._value = v; }
  };

  const AnimatedMethods = {
    timing: jest.fn(() => ({ start: jest.fn((cb?: () => void) => cb?.()) })),
    spring: jest.fn(() => ({ start: jest.fn((cb?: () => void) => cb?.()) })),
    sequence: jest.fn(() => ({ start: jest.fn((cb?: () => void) => cb?.()) })),
    parallel: jest.fn(() => ({ start: jest.fn((cb?: () => void) => cb?.()) })),
    stagger: jest.fn((_delay: number, animations: unknown[]) => ({
      start: jest.fn((cb?: () => void) => cb?.()),
    })),
    loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    delay: jest.fn(() => ({ start: jest.fn((cb?: () => void) => cb?.()) })),
    multiply: jest.fn(() => new AnimatedValue(1)),
    add: jest.fn(() => new AnimatedValue(1)),
    Value: AnimatedValue,
  };

  const Animated = {
    ...AnimatedMethods,
    View: createMockComponent('Animated.View'),
    Text: createMockComponent('Animated.Text'),
    Image: createMockComponent('Animated.Image'),
    ScrollView: createMockComponent('Animated.ScrollView'),
    FlatList: createMockComponent('Animated.FlatList'),
    createAnimatedComponent: (comp: unknown) => comp,
    event: jest.fn(() => jest.fn()),
  };

  // FlatList needs special handling: it renders items
  const FlatList = ({ data, renderItem, ListHeaderComponent, ListEmptyComponent, ListFooterComponent, keyExtractor, ...props }: Record<string, unknown>) => {
    const items = (data as Array<unknown>) || [];
    return createElement(
      'FlatList',
      props,
      ListHeaderComponent ? (typeof ListHeaderComponent === 'function' ? createElement(ListHeaderComponent as React.FunctionComponent) : ListHeaderComponent) : null,
      items.length === 0 && ListEmptyComponent
        ? (typeof ListEmptyComponent === 'function' ? createElement(ListEmptyComponent as React.FunctionComponent) : ListEmptyComponent)
        : items.map((item: unknown, index: number) => {
            const key = keyExtractor ? (keyExtractor as (item: unknown, index: number) => string)(item, index) : String(index);
            return createElement('FlatListItem', { key }, (renderItem as (info: { item: unknown; index: number }) => React.ReactNode)?.({ item, index }));
          }),
      ListFooterComponent ? (typeof ListFooterComponent === 'function' ? createElement(ListFooterComponent as React.FunctionComponent) : ListFooterComponent) : null,
    );
  };
  FlatList.displayName = 'FlatList';

  return {
    Platform: { OS: 'ios', select: (obj: Record<string, unknown>) => obj.ios ?? obj.default },
    StyleSheet: {
      create: <T extends Record<string, unknown>>(styles: T): T => styles,
      flatten: (style: unknown) => style,
      compose: (a: unknown, b: unknown) => [a, b],
    },
    Dimensions: {
      get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    Animated,
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      inOut: jest.fn(() => jest.fn()),
      in: jest.fn(() => jest.fn()),
      out: jest.fn(() => jest.fn()),
      bezier: jest.fn(() => jest.fn()),
    },
    View: createMockComponent('View'),
    Text: createMockComponent('Text'),
    ScrollView: createMockComponent('ScrollView'),
    FlatList,
    Pressable: createMockComponent('Pressable'),
    TouchableOpacity: createMockComponent('TouchableOpacity'),
    TextInput: createMockComponent('TextInput'),
    Image: createMockComponent('Image'),
    StatusBar: createMockComponent('StatusBar'),
    ActivityIndicator: createMockComponent('ActivityIndicator'),
    Alert: { alert: jest.fn() },
    RefreshControl: createMockComponent('RefreshControl'),
    PixelRatio: { get: () => 2, roundToNearestPixel: (v: number) => v },
    I18nManager: { isRTL: false },
    useColorScheme: () => 'dark',
    useWindowDimensions: () => ({ width: 375, height: 812 }),
  };
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234-5678-abcd',
}));

// Mock Supabase client
jest.mock('../lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

// ============================================
// Navigation Mocks
// ============================================

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockReplace = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockNavigate }));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      reset: mockReset,
      replace: mockReplace,
      getParent: mockGetParent,
    }),
    useRoute: () => ({
      params: { eventId: 'test-event-id', packId: 'test-pack-id' },
    }),
    NavigationContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('NavigationContainer', null, children),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
    CommonActions: {
      navigate: jest.fn(),
      reset: jest.fn(),
    },
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  })),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 49,
  createBottomTabNavigator: jest.fn(() => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({ children }: { children: React.ReactNode }) => children,
  })),
}));

// ============================================
// Expo Mocks
// ============================================

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        ACTIVE_VENUE: 'polymarket',
      },
    },
    manifest: null,
  },
}));

jest.mock('expo-image', () => {
  const React = require('react');
  return {
    Image: (props: Record<string, unknown>) =>
      React.createElement('ExpoImage', props),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(async () => ({
        sound: {
          playAsync: jest.fn(),
          pauseAsync: jest.fn(),
          unloadAsync: jest.fn(),
          setPositionAsync: jest.fn(),
        },
        status: { isLoaded: true },
      })),
    },
    setAudioModeAsync: jest.fn(),
  },
}));

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(() => Promise.resolve('')),
}));

// ============================================
// React Native Ecosystem Mocks
// ============================================

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('SafeAreaView', props, children),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('SafeAreaProvider', null, children),
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  };
});

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  enableFreeze: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  PanGestureHandler: 'PanGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
  State: {},
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    createAnimatedComponent: (comp: unknown) => comp,
    call: jest.fn(),
  },
  useSharedValue: jest.fn((v: unknown) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((v: unknown) => v),
  withSpring: jest.fn((v: unknown) => v),
  withDelay: jest.fn((_d: number, v: unknown) => v),
  withSequence: jest.fn((...args: unknown[]) => args[0]),
  Easing: { linear: jest.fn(), ease: jest.fn(), inOut: jest.fn(() => jest.fn()) },
  FadeIn: { duration: jest.fn().mockReturnThis() },
  FadeOut: { duration: jest.fn().mockReturnThis() },
  SlideInDown: { duration: jest.fn().mockReturnThis() },
}));


// ============================================
// Solana Mocks
// ============================================

const MOCK_PUBKEY_BYTES = new Uint8Array(32).fill(0);
MOCK_PUBKEY_BYTES[31] = 1;

class MockPublicKey {
  private _bytes: Uint8Array;
  constructor(input: string | Uint8Array | number[] | Buffer) {
    if (typeof input === 'string') {
      this._bytes = new Uint8Array(32);
      for (let i = 0; i < Math.min(input.length, 32); i++) {
        this._bytes[i] = input.charCodeAt(i);
      }
    } else {
      this._bytes = new Uint8Array(input);
    }
  }
  toBase58() {
    return 'MockBase58Address' + Array.from(this._bytes.slice(0, 4)).join('');
  }
  toBuffer() {
    return Buffer.from(this._bytes);
  }
  toBytes() {
    return this._bytes;
  }
  equals(other: MockPublicKey) {
    return this.toBase58() === other.toBase58();
  }
  toString() {
    return this.toBase58();
  }
  static findProgramAddressSync(_seeds: Buffer[], _programId: MockPublicKey): [MockPublicKey, number] {
    return [new MockPublicKey('PDAAddress'), 255];
  }
}

class MockTransactionInstruction {
  programId: MockPublicKey;
  keys: unknown[];
  data: Buffer;
  constructor(opts: { programId: MockPublicKey; keys: unknown[]; data: Buffer }) {
    this.programId = opts.programId;
    this.keys = opts.keys;
    this.data = opts.data;
  }
}

class MockTransactionMessage {
  payerKey: MockPublicKey;
  recentBlockhash: string;
  instructions: MockTransactionInstruction[];
  constructor(opts: { payerKey: MockPublicKey; recentBlockhash: string; instructions: MockTransactionInstruction[] }) {
    this.payerKey = opts.payerKey;
    this.recentBlockhash = opts.recentBlockhash;
    this.instructions = opts.instructions;
  }
  compileToV0Message() {
    return { payerKey: this.payerKey, instructions: this.instructions };
  }
}

class MockVersionedTransaction {
  message: unknown;
  signatures: Uint8Array[] = [];
  constructor(message: unknown) {
    this.message = message;
  }
  serialize() {
    return new Uint8Array([1, 2, 3]);
  }
}

class MockConnection {
  rpcEndpoint: string;
  constructor(endpoint: string, _commitment?: string) {
    this.rpcEndpoint = endpoint;
  }
  async getLatestBlockhash() {
    return { blockhash: 'mockBlockhash123', lastValidBlockHeight: 100 };
  }
  async getAccountInfo(_pubkey: MockPublicKey) {
    return null;
  }
  async sendRawTransaction(_data: Uint8Array) {
    return 'mockSignature123';
  }
}

jest.mock('@solana/web3.js', () => ({
  PublicKey: MockPublicKey,
  Connection: MockConnection,
  TransactionInstruction: MockTransactionInstruction,
  TransactionMessage: MockTransactionMessage,
  VersionedTransaction: MockVersionedTransaction,
  SystemProgram: { programId: new MockPublicKey('11111111111111111111111111111111') },
  LAMPORTS_PER_SOL: 1_000_000_000,
}));

jest.mock('@solana/spl-token', () => ({
  getAssociatedTokenAddress: jest.fn(async (_mint: unknown, _owner: unknown) => {
    return new MockPublicKey('AssociatedTokenAddress');
  }),
  createAssociatedTokenAccountIdempotentInstruction: jest.fn(
    (_payer: unknown, _ata: unknown, _owner: unknown, _mint: unknown) => {
      return new MockTransactionInstruction({
        programId: new MockPublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        keys: [],
        data: Buffer.from([]),
      });
    }
  ),
  createTransferCheckedInstruction: jest.fn(
    (_source: unknown, _mint: unknown, _dest: unknown, _owner: unknown, _amount: unknown, _decimals: unknown) => {
      return new MockTransactionInstruction({
        programId: new MockPublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        keys: [],
        data: Buffer.from([]),
      });
    }
  ),
  TOKEN_PROGRAM_ID: new MockPublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
}));

jest.mock('@solana-mobile/mobile-wallet-adapter-protocol-web3js', () => ({
  transact: jest.fn(async (callback: (wallet: unknown) => Promise<void>) => {
    const mockWallet = {
      authorize: jest.fn(async () => ({
        auth_token: 'mock-auth-token',
        accounts: [{ address: new Uint8Array(32).fill(1) }],
      })),
      reauthorize: jest.fn(async () => ({
        auth_token: 'mock-reauth-token',
      })),
      signTransactions: jest.fn(async ({ transactions }: { transactions: unknown[] }) => {
        return transactions;
      }),
      signMessages: jest.fn(async () => {
        return [new Uint8Array(64).fill(42)];
      }),
    };
    return callback(mockWallet);
  }),
}));

jest.mock('bs58', () => ({
  encode: jest.fn((bytes: Uint8Array) => 'bs58encoded' + bytes.length),
  decode: jest.fn((_str: string) => new Uint8Array(32)),
}));

jest.mock('tweetnacl', () => ({
  sign: {
    detached: {
      verify: jest.fn(() => true),
    },
  },
}));
