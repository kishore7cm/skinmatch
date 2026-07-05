import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'skinmatch_routine_assignments';

export async function getAssignments(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function setAssignment(stepType: string, productId: string): Promise<void> {
  const current = await getAssignments();
  current[stepType] = productId;
  await AsyncStorage.setItem(KEY, JSON.stringify(current));
}

export async function removeAssignment(stepType: string): Promise<void> {
  const current = await getAssignments();
  delete current[stepType];
  await AsyncStorage.setItem(KEY, JSON.stringify(current));
}
