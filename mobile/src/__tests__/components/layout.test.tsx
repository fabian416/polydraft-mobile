import './setup';
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Header } from '../../components/layout/Header';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { TabBar } from '../../components/layout/TabBar';

// ─── Header ──────────────────────────────────────────────────

describe('Header', () => {
  it('renders logo text', () => {
    const { getByText } = render(<Header />);
    expect(getByText('P')).toBeTruthy();
  });

  it('renders brand name parts', () => {
    const { getByText } = render(<Header />);
    // "Poly" is in the outer Text, "draft" in the inner accent Text
    expect(getByText('draft')).toBeTruthy();
  });

  it('renders points badge', () => {
    const { getByText } = render(<Header />);
    expect(getByText('0')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<Header />);
    expect(toJSON()).toBeTruthy();
  });
});

// ─── ScreenContainer ─────────────────────────────────────────

describe('ScreenContainer', () => {
  it('wraps children with SafeAreaView', () => {
    const { getByText, toJSON } = render(
      <ScreenContainer>
        <Text>Screen Content</Text>
      </ScreenContainer>
    );
    expect(getByText('Screen Content')).toBeTruthy();
    // The root should be a SafeAreaView
    const tree = toJSON() as any;
    expect(tree.type).toBe('SafeAreaView');
  });

  it('renders children correctly', () => {
    const { getByText } = render(
      <ScreenContainer>
        <Text>Hello</Text>
      </ScreenContainer>
    );
    expect(getByText('Hello')).toBeTruthy();
  });
});

// ─── TabBar ──────────────────────────────────────────────────

describe('TabBar', () => {
  const mockTabBarProps = {
    state: {
      index: 0,
      routeNames: ['Home', 'Game', 'Explore'],
      routes: [
        { key: 'Home-1', name: 'Home', params: undefined },
        { key: 'Game-2', name: 'Game', params: undefined },
        { key: 'Explore-3', name: 'Explore', params: undefined },
      ],
      history: [],
      stale: false as const,
      type: 'tab' as const,
    },
    descriptors: {
      'Home-1': {
        options: { tabBarAccessibilityLabel: 'Home' },
        render: () => null,
        route: { key: 'Home-1', name: 'Home', params: undefined },
        navigation: {} as any,
      },
      'Game-2': {
        options: { tabBarAccessibilityLabel: 'Game' },
        render: () => null,
        route: { key: 'Game-2', name: 'Game', params: undefined },
        navigation: {} as any,
      },
      'Explore-3': {
        options: { tabBarAccessibilityLabel: 'Explore' },
        render: () => null,
        route: { key: 'Explore-3', name: 'Explore', params: undefined },
        navigation: {} as any,
      },
    },
    navigation: {
      emit: jest.fn().mockReturnValue({ defaultPrevented: false }),
      navigate: jest.fn(),
    },
    insets: { top: 0, bottom: 34, left: 0, right: 0 },
  } as any;

  it('renders tab labels', () => {
    const { getByText } = render(<TabBar {...mockTabBarProps} />);
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Game')).toBeTruthy();
    expect(getByText('Explore')).toBeTruthy();
  });

  it('renders tab icons', () => {
    const { getByText } = render(<TabBar {...mockTabBarProps} />);
    // Home tab should have house emoji
    expect(getByText('\uD83C\uDFE0')).toBeTruthy();
    // Game tab should have game emoji
    expect(getByText('\uD83C\uDFAE')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<TabBar {...mockTabBarProps} />);
    expect(toJSON()).toBeTruthy();
  });
});
