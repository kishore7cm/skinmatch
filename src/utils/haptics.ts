import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// expo-haptics has no native bridge on web — guard every call so the web
// preview (used for development) never throws.
export function lightImpact(): void {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function conflictWarning(): void {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
