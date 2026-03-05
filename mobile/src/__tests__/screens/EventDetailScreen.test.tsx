/**
 * @jest-environment jsdom
 */
import './setup-screens';
import React from 'react';
import { render } from '@testing-library/react-native';
import { EventDetailScreen } from '../../screens/EventDetailScreen';

describe('EventDetailScreen', () => {
  it('renders without crashing', () => {
    // EventDetailScreen reads route.params.eventId and shows loading state
    const { toJSON } = render(<EventDetailScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
