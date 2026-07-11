import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkinType, BudgetPreference, IntensityPreference } from '../types';

export interface UserProfile {
  skinType: SkinType | null;
  concerns: string[];
  onboarded: boolean;
  budgetPreference: BudgetPreference;
  intensityPreference: IntensityPreference;
  cleanPreference: boolean; // prefer products without commonly-avoided ingredients
}

const KEYS = {
  skinType:            'skinmatch_skin_type',
  concerns:            'skinmatch_concerns',
  onboarded:           'skinmatch_onboarded',
  budgetPreference:    'skinmatch_budget_preference',
  intensityPreference: 'skinmatch_intensity_preference',
  cleanPreference:     'skinmatch_clean_preference',
};

export async function getProfile(): Promise<UserProfile> {
  const [skinType, concernsRaw, onboarded, budgetPreference, intensityPreference, cleanPreference] = await Promise.all([
    AsyncStorage.getItem(KEYS.skinType),
    AsyncStorage.getItem(KEYS.concerns),
    AsyncStorage.getItem(KEYS.onboarded),
    AsyncStorage.getItem(KEYS.budgetPreference),
    AsyncStorage.getItem(KEYS.intensityPreference),
    AsyncStorage.getItem(KEYS.cleanPreference),
  ]);
  return {
    skinType: (skinType as SkinType | null),
    concerns: concernsRaw ? (JSON.parse(concernsRaw) as string[]) : [],
    onboarded: !!onboarded,
    budgetPreference: (budgetPreference as BudgetPreference | null) ?? 'balanced',
    intensityPreference: (intensityPreference as IntensityPreference | null) ?? 'balanced',
    cleanPreference: cleanPreference === '1',
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
  if (updates.budgetPreference !== undefined) {
    tasks.push(AsyncStorage.setItem(KEYS.budgetPreference, updates.budgetPreference));
  }
  if (updates.intensityPreference !== undefined) {
    tasks.push(AsyncStorage.setItem(KEYS.intensityPreference, updates.intensityPreference));
  }
  if (updates.cleanPreference !== undefined) {
    tasks.push(AsyncStorage.setItem(KEYS.cleanPreference, updates.cleanPreference ? '1' : ''));
  }
  await Promise.all(tasks);
}

// Clears the profile only (skin type, concerns, preferences, onboarded flag)
// — leaves shelf items and routine assignments untouched, since resetting is
// meant for retesting the onboarding questions, not wiping saved products.
export async function resetProfile(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
