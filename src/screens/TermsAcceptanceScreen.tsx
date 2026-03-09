import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Linking,
} from 'react-native';
import { aceptarTerminos } from '../api/legal';
import { useAuthStore } from '../store/authStore';
import type { LegalDocument } from '../api/legal';

export default function TermsAcceptanceScreen() {
  const pendingDocuments = useAuthStore((s) => s.pendingDocuments);
  const setTermsAccepted = useAuthStore((s) => s.setTermsAccepted);
  const logout = useAuthStore((s) => s.logout);

  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const allAccepted = pendingDocuments.length > 0 && accepted.size === pendingDocuments.length;

  const toggleAccept = (docId: number) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleAccept = async () => {
    if (!allAccepted) return;
    setLoading(true);
    try {
      await aceptarTerminos(Array.from(accepted), 'login');
      setTermsAccepted();
    } catch {
      Alert.alert('Error', 'No se pudo registrar la aceptación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      'Debes aceptar los términos para usar la aplicación. ¿Deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Términos y Condiciones</Text>
          <Text style={styles.subtitle}>
            Para continuar, debes aceptar los siguientes documentos legales.
          </Text>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {pendingDocuments.map((doc: LegalDocument) => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docHeader}>
                <Text style={styles.docTitle}>{doc.titulo}</Text>
                <Text style={styles.docVersion}>Versión {doc.version}</Text>
              </View>
              <Text style={styles.docMeta}>
                Vigente desde: {new Date(doc.fecha_vigencia).toLocaleDateString('es-CL')}
              </Text>
              {doc.contenido_url ? (
                <TouchableOpacity
                  onPress={() => doc.contenido_url && Linking.openURL(doc.contenido_url)}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>Leer documento completo →</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => toggleAccept(doc.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, accepted.has(doc.id) && styles.checkboxChecked]}>
                  {accepted.has(doc.id) && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>
                  He leído y acepto {doc.tipo_display || doc.titulo}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.acceptButton, !allAccepted && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={!allAccepted || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.acceptButtonText}>Aceptar y continuar</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#183866',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#c7d6f0',
    lineHeight: 20,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 12,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  docVersion: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  docMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  linkButton: {
    marginBottom: 12,
  },
  linkText: {
    fontSize: 13,
    color: '#183866',
    fontWeight: '500',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#183866',
    borderColor: '#183866',
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  checkLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    gap: 10,
  },
  acceptButton: {
    backgroundColor: '#183866',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: '#aab4c8',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoutText: {
    color: '#c0392b',
    fontSize: 14,
  },
});
