/**
 * @jest-environment jsdom
 */
import './setup-screens';
import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreen } from '../../screens/HomeScreen';

describe('HomeScreen', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('POLYDRAFT')).toBeTruthy();
  });

  it('displays both mode cards', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('EXPLORE')).toBeTruthy();
    expect(getByText('PLAY DRAFT')).toBeTruthy();
  });
});
