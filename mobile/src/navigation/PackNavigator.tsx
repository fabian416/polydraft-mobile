import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PackStackParamList } from './types';
import { PackOpenScreen } from '../screens/PackOpenScreen';
import { PackRevealScreen } from '../screens/PackRevealScreen';
import { PackDetailScreen } from '../screens/PackDetailScreen';

const Stack = createNativeStackNavigator<PackStackParamList>();

export function PackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a1a' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="PackOpen" component={PackOpenScreen} />
      <Stack.Screen name="PackReveal" component={PackRevealScreen} />
      <Stack.Screen name="PackDetail" component={PackDetailScreen} />
    </Stack.Navigator>
  );
}
