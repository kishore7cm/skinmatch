import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, TextInput, Platform, Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { extractIngredientsFromImage } from '../api/claudeVision';
import { parseIngredients } from '../utils/parseIngredients';
import { resizeForUpload } from '../utils/imageResize';
import { submitProduct, extractProductInfo } from '../api/submissions';
import { CATEGORY_META, IoniconName } from './ProductCard';
import { colors, typography, cardStyle } from '../theme';
import PressableScale from './PressableScale';
import { useToast } from '../context/ToastContext';

type Step = 'front' | 'ingredients' | 'form' | 'submitting' | 'confirmation';

const CATEGORIES: Product['category'][] = ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen'];

interface Props {
  visible: boolean;
  onClose: () => void;
  initialBarcode?: string;
}

export default function ProductSubmissionFlow({ visible, onClose, initialBarcode }: Props) {
  const [step, setStep] = useState<Step>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { showToast } = useToast();

  const [busy, setBusy] = useState(false);
  const [captureError, setCaptureError] = useState('');

  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [frontPhotoBase64, setFrontPhotoBase64] = useState<string | null>(null);
  const [ingredientPhotoUri, setIngredientPhotoUri] = useState<string | null>(null);
  const [ingredientPhotoBase64, setIngredientPhotoBase64] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);

  const [ocrBrand, setOcrBrand] = useState('');
  const [ocrName, setOcrName] = useState('');
  const [brandTouched, setBrandTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const [barcode, setBarcode] = useState('');
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Product['category']>('moisturizer');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStep('front');
    setBusy(false);
    setCaptureError('');
    setFrontPhotoUri(null); setFrontPhotoBase64(null);
    setIngredientPhotoUri(null); setIngredientPhotoBase64(null);
    setIngredients([]);
    setOcrBrand(''); setOcrName('');
    setBrandTouched(false); setNameTouched(false);
    setBarcode(initialBarcode ?? '');
    setBrand(''); setName(''); setCategory('moisturizer'); setNotes('');
    setSubmitError('');
  }, [visible, initialBarcode]);

  function handleClose() {
    onClose();
  }

  async function handleCaptureFront() {
    if (!cameraRef.current) return;
    setBusy(true);
    setCaptureError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('Failed to capture photo');
      const base64 = await resizeForUpload(photo.uri);
      setFrontPhotoUri(photo.uri);
      setFrontPhotoBase64(base64);
      // Best-effort brand/name guess — never blocks the flow, and the form
      // shows it as an unconfirmed guess rather than a filled-in fact.
      extractProductInfo(base64).then(({ brand: b, name: n }) => {
        setOcrBrand(b);
        setOcrName(n);
      }).catch(() => {});
      setStep('ingredients');
    } catch (e: any) {
      setCaptureError(e?.message ?? 'Could not capture photo. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCaptureIngredients() {
    if (!cameraRef.current) return;
    setBusy(true);
    setCaptureError('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo?.uri) throw new Error('Failed to capture photo');
      const resizedBase64 = await resizeForUpload(photo.uri);
      setIngredientPhotoUri(photo.uri);
      setIngredientPhotoBase64(resizedBase64);

      if (photo.base64) {
        try {
          const raw = await extractIngredientsFromImage(photo.base64);
          if (raw && raw !== 'NO_INGREDIENTS') setIngredients(parseIngredients(raw));
        } catch {
          // Ingredient OCR is a nice-to-have here — the photo itself is what
          // gets reviewed, so a failed extraction shouldn't block submission.
        }
      }
      setStep('form');
    } catch (e: any) {
      setCaptureError(e?.message ?? 'Could not capture photo. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!frontPhotoBase64 || !ingredientPhotoBase64) return;
    setStep('submitting');
    setSubmitError('');
    try {
      await submitProduct({
        barcode: barcode.trim() || undefined,
        brand: brand.trim(),
        name: name.trim(),
        category,
        notes: notes.trim() || undefined,
        ingredients,
        frontPhoto: frontPhotoBase64,
        ingredientPhoto: ingredientPhotoBase64,
      });
      setStep('confirmation');
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Something went wrong submitting this product. Please try again.');
      setStep('form');
    }
  }

  const displayBrand = brandTouched ? brand : (brand || ocrBrand);
  const displayName = nameTouched ? name : (name || ocrName);
  const brandIsGuess = !brandTouched && !brand && !!ocrBrand;
  const nameIsGuess = !nameTouched && !name && !!ocrName;
  const canSubmit = displayBrand.trim().length > 0 && displayName.trim().length > 0;

  const isCameraStep = step === 'front' || step === 'ingredients';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>

        {isCameraStep && (
          Platform.OS === 'web' ? (
            <View style={styles.center}>
              <Ionicons name="camera-outline" size={52} color={colors.inkSoft} />
              <Text style={styles.title}>Requires iOS or Android</Text>
              <Text style={styles.subtitle}>Product submission needs a camera and isn't available in the web preview.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleClose}>
                <Text style={styles.primaryBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : !permission?.granted ? (
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
              <View style={styles.cameraOverlay} pointerEvents="none">
                <View style={styles.overlayTop} />
                <View style={styles.overlayRow}>
                  <View style={styles.overlaySide} />
                  <View style={styles.scanWindow} />
                  <View style={styles.overlaySide} />
                </View>
                <View style={styles.overlayBottom} />
              </View>

              <View style={styles.cameraHeader}>
                <TouchableOpacity style={styles.closeIconBtn} onPress={handleClose}>
                  <Ionicons name="close" size={16} color={colors.surface} />
                </TouchableOpacity>
                <Text style={styles.cameraTitle}>
                  {step === 'front' ? 'Step 1 of 2 — Front of Package' : 'Step 2 of 2 — Ingredient List'}
                </Text>
              </View>

              <View style={styles.cameraFooter}>
                {captureError ? <Text style={styles.captureErrorText}>{captureError}</Text> : (
                  <Text style={styles.cameraHint}>
                    {step === 'front'
                      ? 'Frame the front of the package so the brand and name are visible'
                      : 'Point at the full ingredient list on the back of the package'}
                  </Text>
                )}
                {busy ? (
                  <ActivityIndicator size="large" color={colors.surface} />
                ) : (
                  <TouchableOpacity
                    style={styles.captureBtn}
                    onPress={step === 'front' ? handleCaptureFront : handleCaptureIngredients}
                  >
                    <View style={styles.captureInner} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )
        )}

        {step === 'form' && (
          <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <View style={styles.formHeader}>
              <Text style={styles.title}>Submit This Product</Text>
              <TouchableOpacity style={styles.closeIconBtnLight} onPress={handleClose}>
                <Ionicons name="close" size={16} color={colors.inkSoft} />
              </TouchableOpacity>
            </View>

            <View style={styles.photoRow}>
              {frontPhotoUri && <Image source={{ uri: frontPhotoUri }} style={styles.photoThumb} />}
              {ingredientPhotoUri && <Image source={{ uri: ingredientPhotoUri }} style={styles.photoThumb} />}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Barcode</Text>
              <TextInput
                style={styles.input}
                value={barcode}
                onChangeText={setBarcode}
                placeholder="Optional — scan on the packaging"
                placeholderTextColor={colors.inkSoft}
                keyboardType="number-pad"
              />
              <Text style={styles.fieldNote}>Helps us avoid creating a duplicate entry for this product.</Text>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Brand</Text>
                {brandIsGuess && (
                  <View style={styles.guessBadge}>
                    <Ionicons name="help-circle-outline" size={11} color={colors.gold} />
                    <Text style={styles.guessBadgeText}>We guessed — please check</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.input, brandIsGuess && styles.inputGuess]}
                value={displayBrand}
                onChangeText={(t) => { setBrand(t); setBrandTouched(true); }}
                placeholder="e.g. Minimalist"
                placeholderTextColor={colors.inkSoft}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Product name</Text>
                {nameIsGuess && (
                  <View style={styles.guessBadge}>
                    <Ionicons name="help-circle-outline" size={11} color={colors.gold} />
                    <Text style={styles.guessBadgeText}>We guessed — please check</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[styles.input, nameIsGuess && styles.inputGuess]}
                value={displayName}
                onChangeText={(t) => { setName(t); setNameTouched(true); }}
                placeholder="e.g. 2% Salicylic Acid Serum"
                placeholderTextColor={colors.inkSoft}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.chipsRow}>
                {CATEGORIES.map((cat) => {
                  const meta = CATEGORY_META[cat];
                  const active = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, active && { backgroundColor: meta.bg, borderColor: meta.color }]}
                      onPress={() => setCategory(cat)}
                    >
                      <Ionicons name={meta.icon} size={13} color={active ? meta.color : colors.inkSoft} />
                      <Text style={[styles.chipText, active && { color: meta.color }]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {ingredients.length > 0 && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Detected ingredients ({ingredients.length})</Text>
                <Text style={styles.detectedText} numberOfLines={3}>{ingredients.join(', ')}</Text>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. only sold in India, discontinued packaging"
                placeholderTextColor={colors.inkSoft}
                multiline
              />
            </View>

            {submitError ? <Text style={styles.submitErrorText}>{submitError}</Text> : null}

            <PressableScale
              style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
              onPress={canSubmit ? handleSubmit : undefined}
            >
              <Text style={styles.primaryBtnText}>Submit for Review</Text>
            </PressableScale>
          </ScrollView>
        )}

        {step === 'submitting' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.sage} />
            <Text style={styles.title}>Submitting…</Text>
          </View>
        )}

        {step === 'confirmation' && (
          <View style={styles.center}>
            <Ionicons name="checkmark-circle" size={56} color={colors.sage} />
            <Text style={styles.title}>Thanks for the contribution</Text>
            <Text style={styles.subtitle}>
              We'll review this — usually within a few days — before it shows up in search for
              everyone. You can check its status any time under My Submissions in Settings.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { showToast('Submission sent for review'); handleClose(); }}
            >
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
    </Modal>
  );
}

const CORNER_SIZE = 240;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 14, backgroundColor: colors.paper,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  cancelText: { fontSize: 14, color: colors.inkSoft },

  primaryBtn: {
    backgroundColor: colors.sage, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, width: '100%', alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: colors.surface, fontWeight: '700', fontSize: 15 },

  // Camera
  cameraOverlay: { ...StyleSheet.absoluteFill },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayRow: { flexDirection: 'row', height: CORNER_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanWindow: { width: CORNER_SIZE, height: CORNER_SIZE, borderWidth: 2, borderColor: colors.sage, borderRadius: 12 },

  cameraHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  closeIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  cameraTitle: { fontSize: 16, fontWeight: '700', color: colors.surface, flexShrink: 1 },

  cameraFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingBottom: 50, gap: 20,
  },
  cameraHint: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  captureErrorText: { color: colors.gold, fontSize: 13, textAlign: 'center', paddingHorizontal: 40, fontWeight: '600' },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface },

  // Form
  formContent: { padding: 20, paddingBottom: 40, gap: 16 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeIconBtnLight: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoThumb: { width: 90, height: 90, borderRadius: 12, backgroundColor: colors.line },

  fieldGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...typography.eyebrow, fontSize: 11, color: colors.inkSoft },
  input: {
    ...cardStyle, paddingVertical: 12, fontSize: 15, color: colors.ink,
  },
  inputGuess: { borderColor: colors.gold, borderWidth: 1.5, backgroundColor: colors.goldSoft },
  notesInput: { minHeight: 70, textAlignVertical: 'top' },
  fieldNote: { fontSize: 11, color: colors.inkSoft },

  guessBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.goldSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  guessBadgeText: { fontSize: 10, fontWeight: '700', color: colors.gold },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.inkSoft },

  detectedText: { fontSize: 12, color: colors.inkSoft, lineHeight: 17 },
  submitErrorText: { fontSize: 13, color: colors.clay, textAlign: 'center' },
});
