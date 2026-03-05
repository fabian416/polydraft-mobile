import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WalletProvider } from './src/providers/WalletProvider';
import { RootNavigator } from './src/navigation';

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#00ff88',
    background: '#0a0a1a',
    card: '#1a1a2e',
    text: '#ffffff',
    border: 'rgba(255,255,255,0.1)',
    notification: '#00ff88',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <NavigationContainer theme={DarkTheme}>
          <RootNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </WalletProvider>
    </SafeAreaProvider>
  );
}
