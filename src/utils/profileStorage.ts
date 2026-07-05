import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkinType } from '../types';

export interface UserProfile {
  skinType: SkinType | null;
  concerns: string[];
  onboarded: boolean;
}

const KEYS = {
  skinType:  'skinmatch_skin_type',
  concerns:  'skinmatch_concerns',
  onboarded: 'skinmatch_onboarded',
};

export async function getProfile(): Promise<UserProfile> {
  const [skinType, concernsRaw, onboarded] = await Promise.all([
    AsyncStorage.getItem(KEYS.skinType),
    AsyncStorage.getItem(KEYS.concerns),
    AsyncStorage.getItem(KEYS.onboarded),
  ]);
  return {
    skinType: (skinType as SkinType | null),
    concerns: concernsRaw ? (JSON.parse(concernsRaw) as string[]) : [],
    onboarded: !!onboarded,
  };
}

export async function saveProfile(updates: Partial<UserProfile>): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (updates.skinType !== undefined && updates.skinType !== null) {
    tasks.push(AsyncStorage.setItem(KEYS.skinType, updates.skinType));
  }
  if (updates.concerns !== undefined) {
    tasks.push(AsyncStorage.setItem(KEYS.concerns, JSON.stringify(updates.concerns)));
  }
  if (updates.onboarded !== undefined) {
    tasks.push(AsyncStorage.setItem(KEYS.onboarded, updates.onboarded ? '1' : ''));
  }
  await Promise.all(tasks);
}
