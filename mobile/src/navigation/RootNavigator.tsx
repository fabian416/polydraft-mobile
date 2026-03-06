import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { MainTabs } from './MainTabs';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { PackNavigator } from './PackNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a1a' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PackFlow"
        component={PackNavigator}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}
