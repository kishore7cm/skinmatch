import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, useTheme, ColorTokens } from '../theme';

const OBF_URL = 'https://world.openbeautyfacts.org';

export default function AboutScreen() {
  const { colors, cardStyle } = useTheme();
  const styles = useMemo(() => createStyles(colors, cardStyle), [colors, cardStyle]);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>Data Sources</Text>
          <Text style={styles.title}>Open Beauty Facts</Text>
          <Text style={styles.body}>
            Some product listings and ingredient lists in SkinMatch — especially barcode scans and
            search results beyond our own catalog — come from Open Beauty Facts, a free, open,
            collaborative database of cosmetic products built by a global community.
          </Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(OBF_URL)}>
            <Ionicons name="link-outline" size={15} color={colors.sage} />
            <Text style={styles.linkText}>world.openbeautyfacts.org</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>License</Text>
          <Text style={styles.body}>
            The Open Beauty Facts database structure is available under the Open Database License
            (ODbL); individual product entries are available under the Database Contents License
            (DbCL); product photos are available under a Creative Commons Attribution-ShareAlike
            license.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>How we use it</Text>
          <Text style={styles.body}>
            Ingredient safety flags (pore-clogging, irritant), dupe-match scoring, and skin-type
            fit are SkinMatch's own analysis — layered on top of the raw ingredient lists Open
            Beauty Facts and our own local catalog provide. That analysis isn't part of Open Beauty
            Facts' own data and shouldn't be attributed to them.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorTokens, cardStyle: object) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, paddingBottom: 40, gap: 14 },

  card: { ...cardStyle, gap: 8 },
  eyebrow: { ...typography.eyebrow, color: colors.inkSoft },
  title: { ...typography.cardTitle, fontSize: 18, color: colors.ink },
  body: { ...typography.body, color: colors.inkSoft, lineHeight: 20 },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  linkText: { ...typography.bodyStrong, fontSize: 13, color: colors.sage },
});
