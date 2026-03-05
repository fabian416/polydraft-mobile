/**
 * @jest-environment jsdom
 */
import './setup-screens';
import React from 'react';
import { render } from '@testing-library/react-native';
import { GameScreen } from '../../screens/GameScreen';

describe('GameScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<GameScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
