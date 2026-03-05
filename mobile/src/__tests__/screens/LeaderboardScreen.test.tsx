/**
 * @jest-environment jsdom
 */
import './setup-screens';
import React from 'react';
import { render } from '@testing-library/react-native';
import { LeaderboardScreen } from '../../screens/LeaderboardScreen';

describe('LeaderboardScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<LeaderboardScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
