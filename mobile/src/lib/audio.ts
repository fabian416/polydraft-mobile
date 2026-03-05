/**
 * Audio manager for game SFX using expo-av.
 * Provides sound playback with preloading and caching.
 * Gracefully handles missing files (no crash).
 */

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sound asset map — keyed by logical name
// Assets are bundled via require() for Expo compatibility
const SOUND_ASSETS = {
  pack_open: require('../assets/audio/pack_open.mp3'),
  card_deal: require('../assets/audio/card_deal.mp3'),
  reveal_correct: require('../assets/audio/reveal_correct.mp3'),
  reveal_wrong: require('../assets/audio/reveal_wrong.mp3'),
  coin_collect: require('../assets/audio/coin_collect.mp3'),
  level_up: require('../assets/audio/level_up.mp3'),
} as const;

export type SoundName = keyof typeof SOUND_ASSETS;

const MUTED_KEY = 'polydraft_audio_muted';

// Cache of loaded Sound objects
const cache = new Map<SoundName, Audio.Sound>();

let muted = false;
let initialized = false;

/**
 * Initialize audio settings (restore muted state).
 * Call once on app start.
 */
async function initAudio(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    // Configure audio mode for game SFX
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
    });

    const stored = await AsyncStorage.getItem(MUTED_KEY);
    if (stored === 'true') {
      muted = true;
    }
  } catch {
    // AsyncStorage or Audio unavailable — fail silently
  }
}

// Start initialization immediately
initAudio();

/**
 * Preload all sounds into memory for instant playback.
 * Call early in the app lifecycle (e.g., on first screen mount).
 */
export async function preloadSounds(): Promise<void> {
  await initAudio();

  const names = Object.keys(SOUND_ASSETS) as SoundName[];

  await Promise.allSettled(
    names.map(async (name) => {
      if (cache.has(name)) return;
      try {
        const { sound } = await Audio.Sound.createAsync(SOUND_ASSETS[name]);
        cache.set(name, sound);
      } catch {
        // Asset missing or load failed — skip silently
      }
    })
  );
}

/**
 * Play a named sound effect.
 * If the sound isn't preloaded, it will be loaded on-demand.
 */
export async function playSound(name: SoundName): Promise<void> {
  if (muted) return;

  try {
    let sound = cache.get(name);

    if (!sound) {
      // Load on demand
      const asset = SOUND_ASSETS[name];
      if (!asset) return;

      const { sound: newSound } = await Audio.Sound.createAsync(asset);
      cache.set(name, newSound);
      sound = newSound;
    }

    // Replay from start if already played
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Playback failed — fail silently
  }
}

/**
 * Set muted state and persist to storage.
 */
export async function setMuted(value: boolean): Promise<void> {
  muted = value;
  try {
    await AsyncStorage.setItem(MUTED_KEY, String(value));
  } catch {
    // Storage unavailable
  }
}

/**
 * Check if audio is muted.
 */
export function isMuted(): boolean {
  return muted;
}

/**
 * Unload all cached sounds to free memory.
 * Call when leaving the game or on app background.
 */
export async function unloadSounds(): Promise<void> {
  await Promise.allSettled(
    Array.from(cache.values()).map((sound) => sound.unloadAsync())
  );
  cache.clear();
}
