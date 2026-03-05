/**
 * @jest-environment jsdom
 */
import './setup-screens';
import React from 'react';
import { render } from '@testing-library/react-native';
import { PackOpenScreen } from '../../screens/PackOpenScreen';

describe('PackOpenScreen', () => {
  it('renders without crashing', () => {
    // PackOpenScreen starts in 'loading' phase
    const { toJSON } = render(<PackOpenScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
