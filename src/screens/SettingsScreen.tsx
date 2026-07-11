import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resetProfile } from '../utils/profileStorage';
import { SettingsScreenProps } from '../types/navigation';
import { colors, typography, cardStyle } from '../theme';

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  function handleResetPress() {
    Alert.alert(
      'Reset profile?',
      'This clears your skin type, concerns, and preferences so you can go through onboarding again. Your shelf and routine picks stay untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: handleResetConfirm },
      ],
    );
  }

  async function handleResetConfirm() {
    await resetProfile();
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      Alert.alert('Profile reset', 'Close and reopen the app to go through onboarding again.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.group}>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('ProfileEdit')} activeOpacity={0.75}>
            <View style={[styles.iconBox, { backgroundColor: colors.sageSoft }]}>
              <Ionicons name="person-circle-outline" size={20} color={colors.sage} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Edit Profile</Text>
              <Text style={styles.rowDesc}>Skin type, concerns, and preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('MySubmissions')} activeOpacity={0.75}>
            <View style={[styles.iconBox, { backgroundColor: colors.sageSoft }]}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.sage} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>My Submissions</Text>
              <Text style={styles.rowDesc}>Track products you've submitted for review</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('About')} activeOpacity={0.75}>
            <View style={[styles.iconBox, { backgroundColor: colors.sageSoft }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.sage} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>About & Data Sources</Text>
              <Text style={styles.rowDesc}>Open Beauty Facts attribution and licensing</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
          </TouchableOpacity>

          <View style={[styles.row, styles.rowDisabled]}>
            <View style={[styles.iconBox, { backgroundColor: colors.line }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.inkSoft} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Notifications</Text>
              <Text style={styles.rowDesc}>Coming soon</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetPress} activeOpacity={0.75}>
          <Ionicons name="refresh-outline" size={16} color={colors.clay} />
          <Text style={styles.resetBtnText}>Reset profile & start over</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 20 },

  group: { gap: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...cardStyle,
  },
  rowDisabled: { opacity: 0.6 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...typography.bodyStrong, fontSize: 14, color: colors.ink },
  rowDesc: { fontSize: 12, color: colors.inkSoft },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12,
  },
  resetBtnText: { fontSize: 13, fontWeight: '700', color: colors.clay },
});
