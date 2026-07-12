import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resetProfile } from '../utils/profileStorage';
import { SettingsScreenProps } from '../types/navigation';
import { typography, useTheme, THEMES, ColorTokens, ThemeName } from '../theme';

const THEME_LIST = Object.values(THEMES);

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { colors, cardStyle, themeName, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors, cardStyle), [colors, cardStyle]);

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

        <Text style={styles.title}>Settings</Text>

        <View>
          <Text style={styles.sectionLabel}>Theme</Text>
          <View style={styles.themeRow}>
            {THEME_LIST.map((t) => {
              const active = themeName === t.name;
              return (
                <TouchableOpacity
                  key={t.name}
                  style={[styles.themeCard, active && { borderColor: colors.sage, borderWidth: 2 }]}
                  onPress={() => setTheme(t.name as ThemeName)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.themeSwatchBg, { backgroundColor: t.colors.paper, borderColor: t.colors.line }]}>
                    <View
                      style={[
                        styles.themeSwatchCard,
                        {
                          backgroundColor: t.colors.surface,
                          borderColor: t.colors.line,
                          borderWidth: t.cardBorderWidth,
                          borderRadius: Math.min(t.cardRadius, 8),
                        },
                      ]}
                    >
                      <View style={[styles.themeDot, { backgroundColor: t.colors.sage }]} />
                      <View style={[styles.themeDot, { backgroundColor: t.colors.clay }]} />
                      <View style={[styles.themeDot, { backgroundColor: t.colors.gold }]} />
                    </View>
                    {active && (
                      <View style={[styles.themeCheckmark, { backgroundColor: colors.sage }]}>
                        <Ionicons name="checkmark" size={11} color={colors.surface} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.themeLabel}>{t.label}</Text>
                  <Text style={styles.themeDesc} numberOfLines={2}>{t.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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

          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Shelf')} activeOpacity={0.75}>
            <View style={[styles.iconBox, { backgroundColor: colors.sageSoft }]}>
              <Ionicons name="bookmark-outline" size={20} color={colors.sage} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>My Shelf</Text>
              <Text style={styles.rowDesc}>Saved products and conflict checks</Text>
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

const createStyles = (colors: ColorTokens, cardStyle: object) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 20 },

  title: { ...typography.screenTitle, color: colors.ink },

  sectionLabel: { ...typography.eyebrow, color: colors.inkSoft, marginBottom: 10 },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeCard: {
    flex: 1, ...cardStyle, padding: 10, gap: 6, alignItems: 'center',
  },
  themeSwatchBg: {
    width: '100%', aspectRatio: 1, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  themeSwatchCard: {
    flexDirection: 'row', padding: 8, gap: 4, alignItems: 'center', justifyContent: 'center', width: '70%',
  },
  themeDot: { width: 10, height: 10, borderRadius: 5 },
  themeCheckmark: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },
  themeLabel: { ...typography.bodyStrong, fontSize: 12, color: colors.ink, textAlign: 'center' },
  themeDesc: { fontSize: 10, color: colors.inkSoft, textAlign: 'center', lineHeight: 13 },

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
