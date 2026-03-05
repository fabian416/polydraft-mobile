/**
 * @jest-environment jsdom
 */
import './setup-screens';
import React from 'react';
import { render } from '@testing-library/react-native';
import { PackDetailScreen } from '../../screens/PackDetailScreen';

describe('PackDetailScreen', () => {
  it('renders without crashing', () => {
    // PackDetailScreen reads route.params.packId; with no stored pack, shows "Pack not found"
    const { getByText } = render(<PackDetailScreen />);
    expect(getByText('Pack not found')).toBeTruthy();
  });
});
