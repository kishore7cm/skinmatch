import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { getMySubmissions, SubmissionSummary, SubmissionStatus } from '../api/submissions';
import { colors, typography, cardStyle } from '../theme';

const SUBMISSION_STATUS_META: Record<SubmissionStatus, { label: string; bg: string; text: string }> = {
  pending:  { label: 'In review', bg: colors.goldSoft, text: colors.gold },
  approved: { label: 'Added',     bg: colors.sageSoft, text: colors.sage },
  rejected: { label: 'Not added', bg: colors.claySoft, text: colors.clay },
};

export default function MySubmissionsScreen() {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMySubmissions()
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.sage} style={{ marginTop: 20 }} />
        ) : submissions.length === 0 ? (
          <Text style={styles.emptyText}>
            Products you submit from a "no results" search will show up here.
          </Text>
        ) : (
          <View style={styles.list}>
            {submissions.map((s) => {
              const meta = SUBMISSION_STATUS_META[s.status];
              return (
                <View key={s.id} style={styles.row}>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{s.name || 'Untitled product'}</Text>
                    <Text style={styles.brand} numberOfLines={1}>{s.brand}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, paddingBottom: 40 },

  emptyText: { ...typography.body, fontSize: 13, color: colors.inkSoft, lineHeight: 19 },

  list: { gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...cardStyle, paddingVertical: 12,
  },
  info: { flex: 1, minWidth: 0 },
  name: { ...typography.bodyStrong, fontSize: 13, color: colors.ink },
  brand: { fontSize: 11, color: colors.inkSoft, marginTop: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
