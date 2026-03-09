import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WalletProvider } from './src/providers/WalletProvider';
import { RootNavigator } from './src/navigation';
import { preloadSounds } from './src/lib/audio';

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
  const [fontsLoaded] = useFonts({
    'PressStart2P-Regular': require('./assets/fonts/PressStart2P-Regular.ttf'),
    'VT323-Regular': require('./assets/fonts/VT323-Regular.ttf'),
    'JetBrainsMono-Regular': require('./assets/fonts/JetBrainsMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      preloadSounds();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ffd700" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <WalletProvider>
          <NavigationContainer theme={DarkTheme}>
            <RootNavigator />
            <StatusBar style="light" />
          </NavigationContainer>
        </WalletProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
