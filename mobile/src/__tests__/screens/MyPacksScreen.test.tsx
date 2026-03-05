/**
 * @jest-environment jsdom
 */
import './setup-screens';
import React from 'react';
import { render } from '@testing-library/react-native';
import { MyPacksScreen } from '../../screens/MyPacksScreen';

describe('MyPacksScreen', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<MyPacksScreen />);
    expect(getByText('MY PACKS')).toBeTruthy();
  });
});
