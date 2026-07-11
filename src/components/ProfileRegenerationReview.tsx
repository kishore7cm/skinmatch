import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { Assignment } from '../utils/routineAssignments';
import { StepRecommendation } from '../utils/routineRecommendations';
import { STEP_TYPE_LABELS } from '../data/routines';
import { STEP_META } from '../screens/RoutineScreen';
import { colors, typography, cardStyle, borders } from '../theme';
import PressableScale from './PressableScale';

export interface RegenerationPlanStep {
  stepType: string;
  currentAssignment: Assignment | null;
  currentProduct: Product | null;
  suggestion: StepRecommendation | null;
}

export type ManualChoice = 'keep' | 'suggested';

interface Props {
  visible: boolean;
  plan: RegenerationPlanStep[];
  onCancel: () => void;
  onConfirm: (choices: Record<string, ManualChoice>) => void;
}

export default function ProfileRegenerationReview({ visible, plan, onCancel, onConfirm }: Props) {
  const [choices, setChoices] = useState<Record<string, ManualChoice>>({});

  function setChoice(stepType: string, choice: ManualChoice) {
    setChoices((prev) => ({ ...prev, [stepType]: choice }));
  }

  function handleConfirm() {
    onConfirm(choices);
    setChoices({});
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Review Routine Changes</Text>
          <Text style={styles.subtitle}>
            Your profile changed — here's what happens to each step. Manually-picked products are
            never overwritten unless you choose to.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {plan.map((step) => {
            const meta = STEP_META[step.stepType] ?? { icon: 'ellipse-outline' as const };
            const label = STEP_TYPE_LABELS[step.stepType] ?? step.stepType;
            const isManual = step.currentAssignment?.source === 'manual';
            const isAuto = step.currentAssignment?.source === 'auto';
            const choice = choices[step.stepType] ?? 'keep';

            return (
              <View key={step.stepType} style={[styles.stepCard, isManual && styles.stepCardManual]}>
                <View style={styles.stepHeader}>
                  <Ionicons name={meta.icon} size={18} color={colors.inkSoft} />
                  <Text style={styles.stepLabel}>{label}</Text>
                </View>

                {!step.currentAssignment && (
                  <Text style={styles.neutralText}>
                    Not assigned — {step.suggestion ? `will suggest ${step.suggestion.product.name} once you visit Routine` : 'no matching product yet'}
                  </Text>
                )}

                {isAuto && (
                  <View style={styles.gap6}>
                    <View style={styles.autoBadge}>
                      <Ionicons name="sync-outline" size={11} color={colors.sage} />
                      <Text style={styles.autoBadgeText}>Updating automatically</Text>
                    </View>
                    <Text style={styles.productLine}>
                      {step.currentProduct?.name ?? 'Unknown product'}
                      {step.suggestion ? `  →  ${step.suggestion.product.name}` : '  →  will be unassigned (no match for your new profile)'}
                    </Text>
                    {step.suggestion && <Text style={styles.reasonText}>{step.suggestion.reason}</Text>}
                  </View>
                )}

                {isManual && (
                  <View style={styles.gap6}>
                    <View style={styles.manualBadge}>
                      <Ionicons name="hand-left-outline" size={11} color={colors.gold} />
                      <Text style={styles.manualBadgeText}>You picked this</Text>
                    </View>
                    <Text style={styles.productLine}>{step.currentProduct?.name ?? 'Unknown product'}</Text>

                    <View style={styles.choiceRow}>
                      <TouchableOpacity
                        style={[styles.choiceBtn, choice === 'keep' && styles.choiceBtnActive]}
                        onPress={() => setChoice(step.stepType, 'keep')}
                      >
                        <Text style={[styles.choiceBtnText, choice === 'keep' && styles.choiceBtnTextActive]}>
                          Keep my product
                        </Text>
                      </TouchableOpacity>
                      {step.suggestion && (
                        <TouchableOpacity
                          style={[styles.choiceBtn, choice === 'suggested' && styles.choiceBtnActive]}
                          onPress={() => setChoice(step.stepType, 'suggested')}
                        >
                          <Text style={[styles.choiceBtnText, choice === 'suggested' && styles.choiceBtnTextActive]} numberOfLines={1}>
                            Use suggested: {step.suggestion.product.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {choice === 'suggested' && step.suggestion && (
                      <Text style={styles.reasonText}>{step.suggestion.reason}</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <PressableScale style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmBtnText}>Apply Changes</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: { padding: 20, paddingBottom: 12, gap: 6 },
  title: { ...typography.screenTitle, fontSize: 20, color: colors.ink },
  subtitle: { ...typography.body, fontSize: 13, color: colors.inkSoft, lineHeight: 19 },

  content: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  gap6: { gap: 6 },

  stepCard: { ...cardStyle, gap: 8 },
  stepCardManual: { borderWidth: borders.manualOverride, borderColor: colors.gold },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepLabel: { ...typography.eyebrow, color: colors.inkSoft },

  neutralText: { fontSize: 12, color: colors.inkSoft, fontStyle: 'italic' },

  autoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: colors.sageSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  autoBadgeText: { fontSize: 11, fontWeight: '700', color: colors.sage },

  manualBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: colors.goldSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  manualBadgeText: { fontSize: 11, fontWeight: '700', color: colors.gold },

  productLine: { ...typography.bodyStrong, fontSize: 13, color: colors.ink },
  reasonText: { fontSize: 11, color: colors.inkSoft, lineHeight: 15 },

  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  choiceBtn: {
    borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper,
    paddingHorizontal: 12, paddingVertical: 8, maxWidth: '100%',
  },
  choiceBtnActive: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
  choiceBtnText: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },
  choiceBtnTextActive: { color: colors.sage },

  footer: {
    flexDirection: 'row', gap: 10, padding: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.line,
  },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, borderWidth: 1, borderColor: colors.line, paddingVertical: 15,
  },
  cancelBtnText: { ...typography.bodyStrong, color: colors.inkSoft },
  confirmBtn: {
    flex: 2, backgroundColor: colors.sage, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  confirmBtnText: { ...typography.bodyStrong, color: colors.surface },
});
