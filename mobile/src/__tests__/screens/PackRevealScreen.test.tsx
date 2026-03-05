/**
 * @jest-environment jsdom
 */
import './setup-screens';
import React from 'react';
import { render } from '@testing-library/react-native';
import { PackRevealScreen } from '../../screens/PackRevealScreen';

describe('PackRevealScreen', () => {
  it('renders without crashing', () => {
    // PackRevealScreen reads route.params.packId; with no stored pack, shows "Pack not found"
    const { getByText } = render(<PackRevealScreen />);
    expect(getByText('Pack not found')).toBeTruthy();
  });
});
