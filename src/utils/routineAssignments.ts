import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'skinmatch_routine_assignments';

export type AssignmentSource = 'auto' | 'manual';

export interface Assignment {
  productId: string;
  source: AssignmentSource;
}

export async function getAssignments(): Promise<Record<string, Assignment>> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  // Older saved data stored a bare productId string per step — treat those
  // as 'manual' since we can no longer tell how they were originally picked.
  const result: Record<string, Assignment> = {};
  for (const [stepType, value] of Object.entries(parsed)) {
    result[stepType] = typeof value === 'string' ? { productId: value, source: 'manual' } : (value as Assignment);
  }
  return result;
}

export async function setAssignment(stepType: string, productId: string, source: AssignmentSource): Promise<void> {
  const current = await getAssignments();
  current[stepType] = { productId, source };
  await AsyncStorage.setItem(KEY, JSON.stringify(current));
}

export async function removeAssignment(stepType: string): Promise<void> {
  const current = await getAssignments();
  delete current[stepType];
  await AsyncStorage.setItem(KEY, JSON.stringify(current));
}

// Clears every step's assignment — used when the profile changes enough that
// prior picks may no longer reflect what the routine now recommends.
export async function clearAllAssignments(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
