/**
 * @jest-environment jsdom
 */
import './setup-screens';
import React from 'react';
import { render } from '@testing-library/react-native';
import { ExploreScreen } from '../../screens/ExploreScreen';

describe('ExploreScreen', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<ExploreScreen />);
    expect(getByText('Explore')).toBeTruthy();
  });
});
