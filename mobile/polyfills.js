// Polyfills required by Solana/web3 dependencies in React Native
import { Buffer } from 'buffer';
import * as ExpoCrypto from 'expo-crypto';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// crypto.getRandomValues polyfill (needed by uuid and other crypto libs)
if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}
if (typeof global.crypto.getRandomValues === 'undefined') {
  global.crypto.getRandomValues = (array) => {
    const bytes = ExpoCrypto.getRandomBytes(array.length);
    array.set(bytes);
    return array;
  };
}

// URL polyfill (some Solana libs need it)
if (typeof global.URL === 'undefined') {
  try {
    global.URL = require('react-native-url-polyfill').URL;
  } catch {
    // polyfill not installed, skip
  }
}
