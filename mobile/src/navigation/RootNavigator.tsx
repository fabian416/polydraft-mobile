import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { HomeScreen } from '../screens/HomeScreen';
import { MainTabs } from './MainTabs';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { PackNavigator } from './PackNavigator';
import { useEventSync } from '../hooks/useEventSync';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  useEventSync();

  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a1a' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Home" component={HomeScreen} />
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
