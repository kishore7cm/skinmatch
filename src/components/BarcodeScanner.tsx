import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { getBeautyProductByBarcode } from '../api/openBeautyFacts';
import { mapOBFProduct } from '../utils/productMapper';
import { cacheProducts } from '../utils/productCache';
import { colors, typography } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
  onSubmitProduct?: (barcode: string) => void;
}

export default function BarcodeScanner({ visible, onClose, onProductFound, onSubmitProduct }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<'scanning' | 'loading' | 'notfound'>('scanning');
  const [scanned, setScanned] = useState(false);
  const [notFoundBarcode, setNotFoundBarcode] = useState('');

  const reset = useCallback(() => {
    setScanned(false);
    setStatus('scanning');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  async function handleBarcodeScan({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    setStatus('loading');

    try {
      const raw = await getBeautyProductByBarcode(data);
      if (!raw) {
        setNotFoundBarcode(data);
        setStatus('notfound');
        return;
      }
      const product = mapOBFProduct(raw);
      if (!product) {
        setNotFoundBarcode(data);
        setStatus('notfound');
        return;
      }
      cacheProducts([product]);
      reset();
      onClose();
      onProductFound(product);
    } catch {
      setStatus('notfound');
    }
  }

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.container}>
          <View style={styles.unsupported}>
            <Ionicons name="camera-outline" size={52} color={colors.inkSoft} />
            <Text style={styles.unsupportedTitle}>Camera not available</Text>
            <Text style={styles.unsupportedDesc}>
              Barcode scanning requires the iOS or Android app.
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {!permission ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.sage} />
          </View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.permTitle}>Camera permission needed</Text>
            <Text style={styles.permDesc}>
              Allow camera access to scan product barcodes.
            </Text>
            <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
              <Text style={styles.permBtnText}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={{ marginTop: 16 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              onBarcodeScanned={status === 'scanning' ? handleBarcodeScan : undefined}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
              }}
            />

            {/* Dark overlay with scan window cutout */}
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.overlayTop} />
              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                <View style={styles.scanWindow}>
                  {/* Corner markers */}
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
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeIconBtn}>
                <Ionicons name="close" size={16} color={colors.surface} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Scan Barcode</Text>
            </View>

            {/* Status overlay */}
            <View style={styles.statusArea}>
              {status === 'scanning' && (
                <Text style={styles.hint}>Point at any product barcode</Text>
              )}
              {status === 'loading' && (
                <View style={styles.statusCard}>
                  <ActivityIndicator color={colors.sage} />
                  <Text style={styles.statusText}>Looking up product…</Text>
                </View>
              )}
              {status === 'notfound' && (
                <View style={styles.statusCard}>
                  <Ionicons name="sad-outline" size={32} color={colors.inkSoft} />
                  <Text style={styles.statusText}>Product not found in Open Beauty Facts</Text>
                  <View style={styles.notFoundActions}>
                    <TouchableOpacity style={styles.retryBtn} onPress={reset}>
                      <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                    {onSubmitProduct && (
                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={() => { const bc = notFoundBarcode; reset(); onClose(); onSubmitProduct(bc); }}
                      >
                        <Text style={styles.submitBtnText}>Submit this product</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const SCAN_SIZE = 260;
const OVERLAY_COLOR = 'rgba(0,0,0,0.6)';
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.paper, padding: 32, gap: 16,
  },

  // Permission screen
  permTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  permDesc: { fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  permBtn: {
    backgroundColor: colors.sage, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  permBtnText: { color: colors.surface, fontWeight: '700', fontSize: 15 },
  cancelText: { color: colors.inkSoft, fontSize: 14 },

  // Web unsupported
  unsupported: {
    flex: 1, backgroundColor: colors.paper,
    alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32,
  },
  unsupportedTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  unsupportedDesc: { fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 },
  closeBtn: {
    backgroundColor: colors.ink, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  closeBtnText: { color: colors.surface, fontWeight: '700', fontSize: 15 },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  closeIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.surface },

  // Scan window overlay
  overlay: { ...StyleSheet.absoluteFill },
  overlayTop: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayMiddle: { flexDirection: 'row', height: SCAN_SIZE },
  overlaySide: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayBottom: { flex: 1, backgroundColor: OVERLAY_COLOR },
  scanWindow: { width: SCAN_SIZE, height: SCAN_SIZE },

  // Corner markers
  corner: {
    position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: colors.sage,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },

  // Status area (below scan window)
  statusArea: {
    position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 32,
  },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' },
  statusCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 10, width: '100%',
  },
  statusText: { fontSize: 14, color: colors.ink, textAlign: 'center' },
  notFoundActions: { flexDirection: 'row', gap: 10 },
  retryBtn: {
    backgroundColor: colors.sage, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryText: { color: colors.surface, fontWeight: '700', fontSize: 14 },
  submitBtn: {
    backgroundColor: colors.paper, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  submitBtnText: { color: colors.ink, fontWeight: '700', fontSize: 14 },
});
