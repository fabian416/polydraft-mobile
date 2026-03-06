/**
 * Audio manager for game SFX using expo-av.
 * Matches the sound names from the PSG1 web version.
 *
 * Currently a no-op when .mp3 files aren't bundled — structured so
 * dropping real assets into /assets/sounds/ and uncommenting the
 * require() lines below is all that's needed.
 */

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SoundName =
  | 'pack_open'
  | 'card_deal'
  | 'card_pick'
  | 'reveal_common'
  | 'reveal_rare'
  | 'reveal_epic'
  | 'reveal_legendary'
  | 'modal_open'
  | 'modal_close'
  | 'purchase_confirm'
  | 'purchase_success'
  | 'error';

/**
 * Map of sound names to bundled assets.
 * Uncomment and add require() calls when .mp3 files are available
 * in /assets/sounds/:
 */
const soundFiles: Partial<Record<SoundName, number>> = {
  // pack_open: require('../../assets/sounds/pack_open.mp3'),
  // card_deal: require('../../assets/sounds/card_deal.mp3'),
  // card_pick: require('../../assets/sounds/card_pick.mp3'),
  // reveal_common: require('../../assets/sounds/reveal_common.mp3'),
  // reveal_rare: require('../../assets/sounds/reveal_rare.mp3'),
  // reveal_epic: require('../../assets/sounds/reveal_epic.mp3'),
  // reveal_legendary: require('../../assets/sounds/reveal_legendary.mp3'),
  // modal_open: require('../../assets/sounds/modal_open.mp3'),
  // modal_close: require('../../assets/sounds/modal_close.mp3'),
  // purchase_confirm: require('../../assets/sounds/purchase_confirm.mp3'),
  // purchase_success: require('../../assets/sounds/purchase_success.mp3'),
  // error: require('../../assets/sounds/error.mp3'),
};

const MUTED_KEY = 'polydraft_audio_muted';

// Cache of loaded Sound objects
const loadedSounds: Partial<Record<SoundName, Audio.Sound>> = {};

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
    const stored = await AsyncStorage.getItem(MUTED_KEY);
    if (stored === 'true') {
      muted = true;
    }
  } catch {
    // AsyncStorage unavailable — fail silently
  }
}

// Start initialization immediately
initAudio();

/**
 * Configure audio mode for game SFX.
 * Call early in the app lifecycle (e.g., on first screen mount).
 */
export async function preloadSounds(): Promise<void> {
  await initAudio();

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
  });

  // Pre-load any available sound files
  const entries = Object.entries(soundFiles) as [SoundName, number][];
  await Promise.allSettled(
    entries.map(async ([name, file]) => {
      if (loadedSounds[name]) return;
      try {
        const { sound } = await Audio.Sound.createAsync(file);
        loadedSounds[name] = sound;
      } catch {
        // Asset missing or load failed — skip silently
      }
    })
  );
}

/**
 * Play a named sound effect.
 * If the sound file isn't available, this is a silent no-op.
 */
export async function playSound(name: SoundName): Promise<void> {
  if (muted) return;

  try {
    const file = soundFiles[name];
    if (!file) return; // No sound file available yet

    // Reuse or create sound
    if (!loadedSounds[name]) {
      const { sound } = await Audio.Sound.createAsync(file);
      loadedSounds[name] = sound;
    }

    const sound = loadedSounds[name]!;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    // Sound playback not critical — fail silently
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
    Object.values(loadedSounds)
      .filter((s): s is Audio.Sound => s !== undefined)
      .map((sound) => sound.unloadAsync())
  );

  for (const key of Object.keys(loadedSounds) as SoundName[]) {
    delete loadedSounds[key];
  }
}
