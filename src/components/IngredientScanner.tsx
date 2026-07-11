import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { extractIngredientsFromImage } from '../api/claudeVision';
import { getIngredientFlag, countFlags } from '../utils/ingredientUtils';
import { parseIngredients } from '../utils/parseIngredients';
import { colors, typography, cardStyle } from '../theme';

type Screen = 'camera' | 'processing' | 'results' | 'error';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function IngredientScanner({ visible, onClose }: Props) {
  const [screen, setScreen] = useState<Screen>('camera');
  const [permission, requestPermission] = useCameraPermissions();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!visible) return;
    setScreen('camera');
  }, [visible]);

  function handleClose() {
    setScreen('camera');
    setIngredients([]);
    setErrorMsg('');
    onClose();
  }

  async function handleCapture() {
    if (!cameraRef.current) return;
    setScreen('processing');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo?.base64) throw new Error('Failed to capture image');

      const raw = await extractIngredientsFromImage(photo.base64);

      if (raw === 'NO_INGREDIENTS') {
        setErrorMsg("No ingredient list detected. Try getting closer and making sure the text is in focus.");
        setScreen('error');
        return;
      }

      const parsed = parseIngredients(raw);
      if (parsed.length < 2) {
        setErrorMsg("Couldn't parse enough ingredients. Try again with better lighting.");
        setScreen('error');
        return;
      }

      setIngredients(parsed);
      setScreen('results');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
      setScreen('error');
    }
  }

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <SafeAreaView style={styles.center}>
          <Ionicons name="camera-outline" size={52} color={colors.inkSoft} />
          <Text style={styles.title}>Requires iOS or Android</Text>
          <Text style={styles.subtitle}>Camera scanning isn't available in the web preview.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleClose}>
            <Text style={styles.primaryBtnText}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>

        {/* ── Camera ── */}
        {screen === 'camera' && (
          <>
            {!permission?.granted ? (
              <View style={styles.center}>
                <Text style={styles.title}>Camera permission needed</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                  <Text style={styles.primaryBtnText}>Allow Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClose} style={{ marginTop: 16 }}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} />

                {/* Dark overlay */}
                <View style={styles.cameraOverlay} pointerEvents="none">
                  <View style={styles.overlayTop} />
                  <View style={styles.overlayRow}>
                    <View style={styles.overlaySide} />
                    <View style={styles.scanWindow}>
                      <View style={[styles.corner, styles.cornerTL]} />
                      <View style={[styles.corner, styles.cornerTR]} />
                      <View style={[styles.corner, styles.cornerBL]} />
                      <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                    <View style={styles.overlaySide} />
                  </View>
                  <View style={styles.overlayBottom} />
                </View>

                {/* Header */}
                <View style={styles.cameraHeader}>
                  <TouchableOpacity style={styles.closeIconBtn} onPress={handleClose}>
                    <Ionicons name="close" size={16} color={colors.surface} />
                  </TouchableOpacity>
                  <Text style={styles.cameraTitle}>Scan Ingredients</Text>
                </View>

                {/* Hint + capture */}
                <View style={styles.cameraFooter}>
                  <Text style={styles.cameraHint}>
                    Point at the ingredient list on the back of the product
                  </Text>
                  <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                    <View style={styles.captureInner} />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}

        {/* ── Processing ── */}
        {screen === 'processing' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.sage} />
            <Text style={styles.title}>Reading ingredients…</Text>
            <Text style={styles.subtitle}>Claude is analysing your photo</Text>
          </View>
        )}

        {/* ── Error ── */}
        {screen === 'error' && (
          <View style={styles.center}>
            <Ionicons name="sad-outline" size={52} color={colors.inkSoft} />
            <Text style={styles.title}>Couldn't read ingredients</Text>
            <Text style={styles.subtitle}>{errorMsg}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setScreen('camera')}>
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={{ marginTop: 16 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Results ── */}
        {screen === 'results' && (
          <View style={{ flex: 1 }}>
            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.title}>Ingredient Analysis</Text>
                <Text style={styles.subtitle}>{ingredients.length} ingredients detected</Text>
              </View>
              <TouchableOpacity style={styles.closeIconBtn} onPress={handleClose}>
                <Ionicons name="close" size={16} color={colors.surface} />
              </TouchableOpacity>
            </View>

            <ResultsSummary ingredients={ingredients} />

            <ScrollView contentContainerStyle={styles.resultsList}>
              {ingredients.map((ing, i) => {
                const flag = getIngredientFlag(ing);
                return (
                  <View
                    key={i}
                    style={[styles.ingredientRow, i < ingredients.length - 1 && styles.ingredientBorder]}
                  >
                    <View style={styles.ingLeft}>
                      <Text style={styles.ingName}>{ing}</Text>
                      {flag?.commonInteractions[0] && (
                        <Text style={styles.ingNote}>{flag.commonInteractions[0]}</Text>
                      )}
                    </View>
                    <View style={styles.flags}>
                      {flag?.isComedogenic && (
                        <View style={[styles.flag, styles.flagRed]}>
                          <Text style={styles.flagText}>Pore-clogging</Text>
                        </View>
                      )}
                      {flag?.isIrritant && (
                        <View style={[styles.flag, styles.flagOrange]}>
                          <Text style={styles.flagText}>Irritant</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.scanAgainBtn}
                onPress={() => { setIngredients([]); setScreen('camera'); }}
              >
                <Ionicons name="camera-outline" size={15} color={colors.sage} />
                <Text style={styles.scanAgainText}>Scan another product</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

      </SafeAreaView>
    </Modal>
  );
}

function ResultsSummary({ ingredients }: { ingredients: string[] }) {
  const { comedogenic, irritant } = countFlags(ingredients);
  const clean = ingredients.length - comedogenic - irritant;
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryNum}>{ingredients.length}</Text>
        <Text style={styles.summaryLabel}>Total</Text>
      </View>
      <View style={[styles.summaryCard, comedogenic > 0 && styles.summaryRed]}>
        <Text style={[styles.summaryNum, comedogenic > 0 && { color: colors.clay }]}>{comedogenic}</Text>
        <Text style={[styles.summaryLabel, comedogenic > 0 && { color: colors.clay }]}>Pore-clogging</Text>
      </View>
      <View style={[styles.summaryCard, irritant > 0 && styles.summaryOrange]}>
        <Text style={[styles.summaryNum, irritant > 0 && { color: colors.gold }]}>{irritant}</Text>
        <Text style={[styles.summaryLabel, irritant > 0 && { color: colors.gold }]}>Irritants</Text>
      </View>
      <View style={[styles.summaryCard, styles.summaryGreen]}>
        <Text style={[styles.summaryNum, { color: colors.sage }]}>{clean}</Text>
        <Text style={[styles.summaryLabel, { color: colors.sage }]}>Clean</Text>
      </View>
    </View>
  );
}

const CORNER = 22;
const CORNER_W = 3;
const SCAN_H = 200;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 14, backgroundColor: colors.paper,
  },

  title: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  cancelText: { fontSize: 14, color: colors.inkSoft },
  errorText: { fontSize: 13, color: colors.clay, textAlign: 'center' },

  primaryBtn: {
    backgroundColor: colors.sage, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, width: '100%', alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: colors.surface, fontWeight: '700', fontSize: 15 },

  // Camera
  cameraOverlay: { ...StyleSheet.absoluteFill },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayRow: { flexDirection: 'row', height: SCAN_H },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanWindow: { width: 300, height: SCAN_H },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.sage },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W },

  cameraHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  closeIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  cameraTitle: { fontSize: 18, fontWeight: '700', color: colors.surface },

  cameraFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingBottom: 50, gap: 24,
  },
  cameraHint: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  captureInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface,
  },

  // Results
  resultsHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line,
  },

  summaryRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  summaryCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 10,
    alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: colors.line,
  },
  summaryRed: { backgroundColor: colors.claySoft },
  summaryOrange: { backgroundColor: colors.goldSoft },
  summaryGreen: { backgroundColor: colors.sageSoft },
  summaryNum: { fontSize: 20, fontWeight: '800', color: colors.ink },
  summaryLabel: { fontSize: 9, fontWeight: '600', color: colors.inkSoft, textAlign: 'center' },

  resultsList: { padding: 16, paddingTop: 8, paddingBottom: 40 },
  ingredientRow: {
    paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  ingredientBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  ingLeft: { flex: 1 },
  ingName: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  ingNote: { fontSize: 11, color: colors.inkSoft, marginTop: 2, lineHeight: 15 },
  flags: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  flag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  flagRed: { backgroundColor: colors.claySoft },
  flagOrange: { backgroundColor: colors.goldSoft },
  flagText: { fontSize: 10, fontWeight: '700', color: colors.inkSoft },

  scanAgainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 24, backgroundColor: colors.sageSoft, borderRadius: 14,
    paddingVertical: 14,
  },
  scanAgainText: { fontSize: 14, fontWeight: '700', color: colors.sage },
});
