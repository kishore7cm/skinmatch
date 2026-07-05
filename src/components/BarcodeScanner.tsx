import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Product } from '../types';
import { getBeautyProductByBarcode } from '../api/openBeautyFacts';
import { mapOBFProduct } from '../utils/productMapper';
import { cacheProducts } from '../utils/productCache';

interface Props {
  visible: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
}

export default function BarcodeScanner({ visible, onClose, onProductFound }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<'scanning' | 'loading' | 'notfound'>('scanning');
  const [scanned, setScanned] = useState(false);

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
        setStatus('notfound');
        return;
      }
      const product = mapOBFProduct(raw);
      if (!product) {
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
            <Text style={styles.unsupportedIcon}>📷</Text>
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
            <ActivityIndicator color="#C8A2C8" />
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
                <Text style={styles.closeIcon}>✕</Text>
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
                  <ActivityIndicator color="#C8A2C8" />
                  <Text style={styles.statusText}>Looking up product…</Text>
                </View>
              )}
              {status === 'notfound' && (
                <View style={styles.statusCard}>
                  <Text style={styles.notFoundIcon}>😕</Text>
                  <Text style={styles.statusText}>Product not found in Open Beauty Facts</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={reset}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
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
    backgroundColor: '#FAFAF8', padding: 32, gap: 16,
  },

  // Permission screen
  permTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
  permDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  permBtn: {
    backgroundColor: '#C8A2C8', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  permBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  cancelText: { color: '#AAA', fontSize: 14 },

  // Web unsupported
  unsupported: {
    flex: 1, backgroundColor: '#FAFAF8',
    alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32,
  },
  unsupportedIcon: { fontSize: 52 },
  unsupportedTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  unsupportedDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  closeBtn: {
    backgroundColor: '#1A1A2E', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
  },
  closeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

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
  closeIcon: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  // Scan window overlay
  overlay: { ...StyleSheet.absoluteFill },
  overlayTop: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayMiddle: { flexDirection: 'row', height: SCAN_SIZE },
  overlaySide: { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayBottom: { flex: 1, backgroundColor: OVERLAY_COLOR },
  scanWindow: { width: SCAN_SIZE, height: SCAN_SIZE },

  // Corner markers
  corner: {
    position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#C8A2C8',
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
    backgroundColor: '#FFF', borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 10, width: '100%',
  },
  statusText: { fontSize: 14, color: '#333', textAlign: 'center' },
  notFoundIcon: { fontSize: 32 },
  retryBtn: {
    backgroundColor: '#C8A2C8', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
