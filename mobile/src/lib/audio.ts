/**
 * Audio manager for game SFX using expo-av.
 * Retro 8-bit sounds from polydraftpsg1 web client (CC0 — public domain).
 */

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SoundName =
  | 'pack_open'
  | 'card_deal'
  | 'reveal_common'
  | 'reveal_rare'
  | 'reveal_epic'
  | 'reveal_legendary'
  | 'focus_pop'
  | 'nav_tick'
  | 'nav_back'
  | 'carousel_slide'
  | 'amount_tick'
  | 'modal_close'
  | 'purchase_confirm'
  | 'purchase_success';

const soundFiles: Record<SoundName, number> = {
  pack_open: require('../../assets/sounds/pack_open.mp3'),
  card_deal: require('../../assets/sounds/card_deal.mp3'),
  reveal_common: require('../../assets/sounds/reveal_common.mp3'),
  reveal_rare: require('../../assets/sounds/reveal_rare.mp3'),
  reveal_epic: require('../../assets/sounds/reveal_epic.mp3'),
  reveal_legendary: require('../../assets/sounds/reveal_legendary.mp3'),
  focus_pop: require('../../assets/sounds/focus_pop.mp3'),
  nav_tick: require('../../assets/sounds/nav_tick.mp3'),
  nav_back: require('../../assets/sounds/nav_back.mp3'),
  carousel_slide: require('../../assets/sounds/carousel_slide.mp3'),
  amount_tick: require('../../assets/sounds/amount_tick.mp3'),
  modal_close: require('../../assets/sounds/modal_close.mp3'),
  purchase_confirm: require('../../assets/sounds/purchase_confirm.mp3'),
  purchase_success: require('../../assets/sounds/purchase_success.mp3'),
};

const MUTED_KEY = 'polydraft_audio_muted';

// Cache of loaded Sound objects
const loadedSounds: Partial<Record<SoundName, Audio.Sound>> = {};

let muted = false;
let initialized = false;

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
 * Configure audio mode and preload critical sounds.
 */
export async function preloadSounds(): Promise<void> {
  await initAudio();

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
  });

  const criticalSounds: SoundName[] = [
    'nav_tick', 'focus_pop', 'pack_open', 'card_deal',
    'carousel_slide', 'purchase_success',
  ];

  await Promise.allSettled(
    criticalSounds.map(async (name) => {
      if (loadedSounds[name]) return;
      try {
        const file = soundFiles[name];
        if (!file) return;
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
 */
export async function playSound(name: SoundName): Promise<void> {
  if (muted) return;

  try {
    const file = soundFiles[name];
    if (!file) return;

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
