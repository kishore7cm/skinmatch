import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast, { ToastAction } from '../components/Toast';

interface ToastState {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, action?: ToastAction) => {
    setToast({ id: Date.now(), message, action });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <View style={styles.root}>
        {children}
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            action={toast.action}
            onDismiss={() => setToast(null)}
          />
        )}
      </View>
    </ToastContext.Provider>
  );
}

// Throws outside a provider rather than silently no-op-ing, so a missing
// <ToastProvider> at the root is caught immediately during development.
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
