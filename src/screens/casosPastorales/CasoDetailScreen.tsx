import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PANTONE_134C, PANTONE_295C } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { usePermissionsStore } from '../../store/permissionsStore';
import {
  obtenerCaso,
  eliminarCaso,
  iniciarCaso,
  cerrarCaso,
  reabrirCaso,
  agregarComentario,
  CasoPastoral,
  ComentarioCaso,
} from '../../api/pastoral';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  visita: { bg: '#E8F5E9', text: '#2E7D32' },
  oracion: { bg: '#EDE7F6', text: '#6A1B9A' },
  consejeria: { bg: '#E3F2FD', text: '#1565C0' },
  crisis: { bg: '#FFEBEE', text: '#B71C1C' },
  seguimiento: { bg: '#EAF0FB', text: PANTONE_295C },
  otro: { bg: '#F5F5F5', text: '#616161' },
};

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  nuevo: { bg: '#E3F2FD', text: '#1565C0' },
  en_progreso: { bg: '#FFF3E0', text: '#E65100' },
  cerrado: { bg: '#E8F5E9', text: '#2E7D32' },
};

type AccionActiva = 'cerrar' | 'reabrir' | 'comentar' | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(nombre: string, apellidos?: string): string {
  const n = nombre?.charAt(0) ?? '';
  const a = apellidos?.charAt(0) ?? '';
  return (n + a).toUpperCase() || '?';
}

// ─── Comment Item ─────────────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: ComentarioCaso }) {
  if (comment.es_sistema) {
    return (
      <View style={styles.systemComment}>
        <Text style={styles.systemCommentLabel}>Sistema</Text>
        <Text style={styles.systemCommentText}>{comment.contenido}</Text>
        <Text style={styles.commentDate}>{formatDateTime(comment.created_at)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.userComment}>
      <View style={styles.commentHeader}>
        <Text style={styles.commentAuthor}>
          {comment.usuario?.nombre_completo ?? 'Usuario'}
        </Text>
        <Text style={styles.commentDate}>{formatDateTime(comment.created_at)}</Text>
      </View>
      <Text style={styles.commentContent}>{comment.contenido}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CasoDetailScreen({ route }: { route: any }) {
  const navigation = useNavigation<any>();
  const { id } = route.params as { id: number; titulo?: string };

  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = usePermissionsStore((s) => s.isSuperAdmin);
  const hasAnyRole = usePermissionsStore((s) => s.hasAnyRole);

  const [caso, setCaso] = useState<CasoPastoral | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accionActiva, setAccionActiva] = useState<AccionActiva>(null);
  const [inputTexto, setInputTexto] = useState('');

  const isAdmin = isSuperAdmin || hasAnyRole(['pastor', 'leader', 'church_admin']);
  const puedeGestionar = isAdmin;

  const puedeEditar =
    caso != null &&
    (caso.created_by.id === user?.id || isAdmin) &&
    caso.estado !== 'cerrado';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerCaso(id);
      setCaso(data);
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al cargar el caso.';
      if (typeof d === 'string') msg = d;
      else if (d?.error) msg = d.error;
      else if (d?.detail) msg = d.detail;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // ─── Header options ────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    if (!puedeEditar || !caso) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }

    const handleDeleteConfirm = async () => {
      setActionLoading(true);
      try {
        await eliminarCaso(id);
        navigation.goBack();
      } catch (err: any) {
        const d = err?.response?.data;
        let msg = 'Error al eliminar.';
        if (typeof d === 'string') msg = d;
        else if (d?.error) msg = d.error;
        else if (d?.detail) msg = d.detail;
        Alert.alert('Error', msg);
      } finally {
        setActionLoading(false);
      }
    };

    const handleMenu = () => {
      Alert.alert('Opciones', '', [
        {
          text: 'Editar',
          onPress: () => navigation.navigate('CasoForm', { caso }),
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Eliminar caso',
              `¿Eliminar "${caso.titulo}"? Esta acción no se puede deshacer.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: handleDeleteConfirm },
              ]
            ),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    };

    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleMenu}
          style={headerStyles.menuBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon source="dots-vertical" size={24} color={PANTONE_134C} />
        </TouchableOpacity>
      ),
    });
  }, [puedeEditar, caso, id, navigation]);

  // ─── Action handlers ───────────────────────────────────────────────────────

  const handleIniciar = () => {
    if (!caso) return;
    Alert.alert(
      'Iniciar caso',
      `¿Confirmar inicio del caso "${caso.titulo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await iniciarCaso(id);
              setCaso(updated);
            } catch (err: any) {
              const d = err?.response?.data;
              let msg = 'Error al iniciar el caso.';
              if (typeof d === 'string') msg = d;
              else if (d?.error) msg = d.error;
              else if (d?.detail) msg = d.detail;
              Alert.alert('Error', msg);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmAccion = async () => {
    if (!accionActiva) return;
    if (!inputTexto.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el texto requerido.');
      return;
    }

    setActionLoading(true);
    try {
      let updated: CasoPastoral;
      if (accionActiva === 'cerrar') {
        updated = await cerrarCaso(id, inputTexto.trim());
      } else if (accionActiva === 'reabrir') {
        updated = await reabrirCaso(id, inputTexto.trim());
      } else {
        await agregarComentario(id, inputTexto.trim());
        updated = await obtenerCaso(id);
      }
      setCaso(updated);
      setAccionActiva(null);
      setInputTexto('');
    } catch (err: any) {
      const d = err?.response?.data;
      let msg = 'Error al ejecutar la acción.';
      if (typeof d === 'string') msg = d;
      else if (d?.error) msg = d.error;
      else if (d?.detail) msg = d.detail;
      Alert.alert('Error', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error || !caso) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'No encontrado'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load} activeOpacity={0.75}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tipoStyle = TIPO_COLORS[caso.tipo] ?? TIPO_COLORS.otro;
  const estadoStyle = ESTADO_COLORS[caso.estado] ?? { bg: '#F5F5F5', text: '#757575' };

  const puedeIniciar =
    caso.estado === 'nuevo' && caso.responsable != null && caso.responsable.id === user?.id;
  const puedeCerrar =
    caso.estado === 'en_progreso' &&
    (caso.responsable?.id === user?.id || puedeGestionar);
  const puedeReabrir = caso.estado === 'cerrado' && (puedeGestionar || isSuperAdmin);

  const accionConfig: Record<
    NonNullable<AccionActiva>,
    { label: string; placeholder: string; multiline: boolean; btnLabel: string; btnColor: string }
  > = {
    cerrar: {
      label: 'Resumen de Cierre',
      placeholder: 'Describe el resultado y cierre del caso...',
      multiline: true,
      btnLabel: 'Confirmar Cierre',
      btnColor: '#2E7D32',
    },
    reabrir: {
      label: 'Motivo de Reapertura',
      placeholder: 'Indica el motivo para reabrir el caso...',
      multiline: true,
      btnLabel: 'Confirmar Reapertura',
      btnColor: '#E65100',
    },
    comentar: {
      label: 'Agregar Comentario',
      placeholder: 'Escribe tu comentario...',
      multiline: true,
      btnLabel: 'Publicar Comentario',
      btnColor: PANTONE_295C,
    },
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Header card ─────────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.chipsRow}>
            <View style={[styles.chip, { backgroundColor: tipoStyle.bg }]}>
              <Text style={[styles.chipText, { color: tipoStyle.text }]}>
                {caso.tipo_display ?? caso.tipo}
              </Text>
            </View>
            <View style={[styles.chip, { backgroundColor: estadoStyle.bg }]}>
              <Text style={[styles.chipText, { color: estadoStyle.text }]}>
                {caso.estado_display ?? caso.estado}
              </Text>
            </View>
            {caso.es_confidencial && (
              <View style={styles.confidencialBadge}>
                <Icon source="lock-outline" size={13} color="#666" />
                <Text style={styles.confidencialText}>Confidencial</Text>
              </View>
            )}
          </View>
          <Text style={styles.titulo}>{caso.titulo}</Text>
          <Text style={styles.descripcion}>{caso.descripcion}</Text>
        </View>

        {/* ─── Info card ───────────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Creado por</Text>
            <Text style={styles.infoValue}>
              {caso.created_by.nombre_completo ||
                `${caso.created_by.nombre} ${caso.created_by.apellidos}`}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha de apertura</Text>
            <Text style={styles.infoValue}>{formatDate(caso.fecha_apertura)}</Text>
          </View>
          {caso.miembro && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Miembro relacionado</Text>
              <Text style={styles.infoValue}>{caso.miembro.nombre_completo}</Text>
            </View>
          )}
          {caso.fecha_cierre && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de cierre</Text>
              <Text style={styles.infoValue}>{formatDate(caso.fecha_cierre)}</Text>
            </View>
          )}
        </View>

        {/* ─── Responsable card ────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Responsable</Text>
          {caso.responsable ? (
            <View style={styles.responsableRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {getInitials(caso.responsable.nombre, caso.responsable.apellidos)}
                </Text>
              </View>
              <View style={styles.responsableInfo}>
                <Text style={styles.responsableNombre}>
                  {caso.responsable.nombre_completo ||
                    `${caso.responsable.nombre} ${caso.responsable.apellidos}`}
                </Text>
                <Text style={styles.responsableEmail}>{caso.responsable.email}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.sinAsignarRow}>
              <Icon source="account-off-outline" size={20} color="#BBB" />
              <Text style={styles.sinAsignarText}>Sin asignar</Text>
            </View>
          )}
        </View>

        {/* ─── Resumen cierre (only if cerrado) ────────────────────────────── */}
        {caso.estado === 'cerrado' && !!caso.resumen_cierre && (
          <View style={[styles.sectionCard, styles.cierreCard]}>
            <View style={styles.cierreHeader}>
              <Icon source="check-circle-outline" size={18} color="#2E7D32" />
              <Text style={styles.cierreTitulo}>Resumen de Cierre</Text>
            </View>
            <Text style={styles.cierreTexto}>{caso.resumen_cierre}</Text>
          </View>
        )}

        {/* ─── Comentarios card ────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Comentarios ({caso.comentarios?.length ?? 0})
          </Text>
          {caso.comentarios?.length > 0 ? (
            caso.comentarios.map((c) => <CommentItem key={c.id} comment={c} />)
          ) : (
            <View style={styles.emptyComments}>
              <Icon source="comment-outline" size={28} color="#DDD" />
              <Text style={styles.emptyCommentsText}>Sin comentarios</Text>
            </View>
          )}
        </View>

        {/* ─── Acciones card ───────────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Acciones</Text>

          {puedeIniciar && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnBlue]}
              onPress={handleIniciar}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Icon source="play-circle-outline" size={18} color="#FFF" />
              <Text style={styles.actionBtnTextWhite}>Iniciar Caso</Text>
            </TouchableOpacity>
          )}

          {puedeCerrar && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                accionActiva === 'cerrar' ? styles.actionBtnGreenOutline : styles.actionBtnGreen,
              ]}
              onPress={() => {
                setAccionActiva(accionActiva === 'cerrar' ? null : 'cerrar');
                setInputTexto('');
              }}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Icon
                source="check-circle-outline"
                size={18}
                color={accionActiva === 'cerrar' ? '#2E7D32' : '#FFF'}
              />
              <Text
                style={
                  accionActiva === 'cerrar'
                    ? styles.actionBtnTextGreen
                    : styles.actionBtnTextWhite
                }
              >
                Cerrar Caso
              </Text>
            </TouchableOpacity>
          )}

          {puedeReabrir && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOrangeOutline]}
              onPress={() => {
                setAccionActiva(accionActiva === 'reabrir' ? null : 'reabrir');
                setInputTexto('');
              }}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Icon source="restore" size={18} color="#E65100" />
              <Text style={styles.actionBtnTextOrange}>Reabrir Caso</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionBtn,
              accionActiva === 'comentar' ? styles.actionBtnBlue : styles.actionBtnBlueOutline,
            ]}
            onPress={() => {
              setAccionActiva(accionActiva === 'comentar' ? null : 'comentar');
              setInputTexto('');
            }}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            <Icon
              source="comment-plus-outline"
              size={18}
              color={accionActiva === 'comentar' ? '#FFF' : PANTONE_295C}
            />
            <Text
              style={
                accionActiva === 'comentar'
                  ? styles.actionBtnTextWhite
                  : styles.actionBtnTextBlue
              }
            >
              Agregar Comentario
            </Text>
          </TouchableOpacity>

          {/* ─── Inline action panel ──────────────────────────────────────── */}
          {accionActiva && (
            <View style={styles.accionPanel}>
              <Text style={styles.accionPanelLabel}>
                {accionConfig[accionActiva].label}
              </Text>
              <TextInput
                style={[
                  styles.accionInput,
                  accionConfig[accionActiva].multiline && styles.accionInputMultiline,
                ]}
                placeholder={accionConfig[accionActiva].placeholder}
                placeholderTextColor="#AAA"
                value={inputTexto}
                onChangeText={setInputTexto}
                multiline={accionConfig[accionActiva].multiline}
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus
              />
              <View style={styles.accionButtons}>
                <TouchableOpacity
                  style={styles.accionCancelBtn}
                  onPress={() => {
                    setAccionActiva(null);
                    setInputTexto('');
                  }}
                  disabled={actionLoading}
                  activeOpacity={0.75}
                >
                  <Text style={styles.accionCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.accionConfirmBtn,
                    { backgroundColor: accionConfig[accionActiva].btnColor },
                  ]}
                  onPress={handleConfirmAccion}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.accionConfirmText}>
                      {accionConfig[accionActiva].btnLabel}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const headerStyles = StyleSheet.create({
  menuBtn: {
    paddingHorizontal: 16,
  },
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 14,
    paddingBottom: 40,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#E53935',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  confidencialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confidencialText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
    lineHeight: 26,
  },
  descripcion: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  responsableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PANTONE_295C,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  responsableInfo: {
    flex: 1,
  },
  responsableNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  responsableEmail: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  sinAsignarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sinAsignarText: {
    fontSize: 14,
    color: '#BBB',
    fontStyle: 'italic',
  },
  cierreCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    backgroundColor: '#F1F8F1',
  },
  cierreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  cierreTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cierreTexto: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  systemComment: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  systemCommentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  systemCommentText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  userComment: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 10,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  commentDate: {
    fontSize: 11,
    color: '#AAA',
  },
  commentContent: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyCommentsText: {
    fontSize: 13,
    color: '#CCC',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 13,
    marginBottom: 10,
    gap: 8,
  },
  actionBtnBlue: {
    backgroundColor: PANTONE_295C,
  },
  actionBtnBlueOutline: {
    borderWidth: 1.5,
    borderColor: PANTONE_295C,
    backgroundColor: '#FFF',
  },
  actionBtnGreen: {
    backgroundColor: '#2E7D32',
  },
  actionBtnGreenOutline: {
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    backgroundColor: '#FFF',
  },
  actionBtnOrangeOutline: {
    borderWidth: 1.5,
    borderColor: '#E65100',
    backgroundColor: '#FFF',
  },
  actionBtnTextWhite: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  actionBtnTextBlue: {
    color: PANTONE_295C,
    fontWeight: '700',
    fontSize: 15,
  },
  actionBtnTextGreen: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 15,
  },
  actionBtnTextOrange: {
    color: '#E65100',
    fontWeight: '700',
    fontSize: 15,
  },
  accionPanel: {
    backgroundColor: '#F8F9FC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E7F3',
    marginTop: 4,
  },
  accionPanelLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    marginBottom: 8,
  },
  accionInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    marginBottom: 10,
  },
  accionInputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  accionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  accionCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  accionCancelText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  accionConfirmBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 11,
  },
  accionConfirmText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '700',
  },
});
