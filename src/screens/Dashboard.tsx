import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useIglesiaStore } from '../store/iglesiaStore';
import { PANTONE_134C, PANTONE_295C } from '../theme/colors';
import { getDashboard } from '../api/dashboard';

// --- helpers ---

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isSoonDue(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 3;
}

// --- sub-components ---

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function StatusChip({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function QuickCard({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.quickCardIcon}>
        <Icon source={icon} size={28} color={PANTONE_295C} />
      </View>
      <Text style={styles.quickCardLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// --- main component ---

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user);
  const iglesiaNombre = useIglesiaStore((state) => state.iglesiaNombre);
  const navigation = useNavigation<any>();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getDashboard();
      setData(result);
    } catch {
      setError('No se pudo cargar el Dashboard. Toca para reintentar.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Derive greeting from dashboard response or fallback to user store
  const usuarioInfo = data?.usuario_info ?? null;
  const nombre = usuarioInfo?.nombre || user?.nombre || user?.username || '';
  const genero = usuarioInfo?.genero ?? user?.miembro_asociado?.genero;
  const greeting = genero === 'F' ? '¡Bienvenida' : '¡Bienvenido';

  const misGrupos: any[] = data?.mis_grupos ?? [];
  const ultimosMensajes: any[] = data?.ultimos_mensajes ?? [];
  const proximosEventos: any[] = data?.proximos_eventos ?? [];
  const articulosPrestados: any[] = data?.articulos_prestados_a_mi ?? [];
  const misCasos: any[] = data?.mis_casos_pastorales ?? [];
  const misRendiciones: any[] = data?.mis_rendiciones ?? [];

  // Sort groups: leader first
  const gruposOrdenados = [...misGrupos].sort((a, b) => {
    if (a.mi_rol === 'lider' && b.mi_rol !== 'lider') return -1;
    if (a.mi_rol !== 'lider' && b.mi_rol === 'lider') return 1;
    return 0;
  });

  const handleRetry = useCallback(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity style={styles.centered} onPress={handleRetry}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PANTONE_295C]} />}
    >
      {/* 1. Saludo personalizado */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          style={styles.hamburgerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon source="menu" size={24} color={PANTONE_134C} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting}, {nombre}!</Text>
          <Text style={styles.subGreeting}>Que tengas un excelente día</Text>
        </View>
        {iglesiaNombre ? (
          <View style={styles.churchChip}>
            <Icon source="church" size={14} color={PANTONE_295C} />
            <Text style={styles.churchChipText}>{iglesiaNombre}</Text>
          </View>
        ) : null}
      </View>

      {/* 2. Quick Actions */}
      <SectionTitle title="ACCESOS RÁPIDOS" />
      <View style={styles.quickActions}>
        <QuickCard
          icon="account-group-outline"
          label="Grupos"
          onPress={() => navigation.getParent()?.navigate('GruposCelulas')}
        />
        <QuickCard
          icon="message-outline"
          label="Bandeja"
          onPress={() => navigation.navigate('Bandeja')}
        />
        <QuickCard
          icon="account-circle-outline"
          label="Perfil"
          onPress={() => navigation.navigate('Perfil')}
        />
      </View>

      {/* 3. Mis Grupos */}
      {gruposOrdenados.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="MIS GRUPOS" />
          {gruposOrdenados.slice(0, 4).map((g: any, i: number) => (
            <View key={g.id ?? i} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{g.nombre}</Text>
                <Text style={styles.itemSub}>{g.cantidad_miembros ?? ''} miembros</Text>
              </View>
              <StatusChip
                label={g.mi_rol === 'lider' ? 'Líder' : 'Miembro'}
                color={g.mi_rol === 'lider' ? PANTONE_295C : '#555'}
                bg={g.mi_rol === 'lider' ? '#EAF0FB' : '#F0F0F0'}
              />
            </View>
          ))}
          {gruposOrdenados.length > 4 && (
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('GruposCelulas')}>
              <Text style={styles.linkText}>Ver todos →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 4. Mensajes recientes */}
      {ultimosMensajes.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="MENSAJES RECIENTES" />
          {ultimosMensajes.slice(0, 3).map((m: any, i: number) => (
            <TouchableOpacity
              key={m.id ?? i}
              style={styles.listItem}
              onPress={() => navigation.navigate('MessageDetail', { id: m.id })}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, !m.leida && { fontWeight: 'bold' }]}>{m.titulo}</Text>
                <Text style={styles.itemSub}>{m.remitente} · {formatDate(m.fecha_envio)}</Text>
              </View>
              {m.tipo_display && (
                <StatusChip label={m.tipo_display} color={PANTONE_295C} bg="#EAF0FB" />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => navigation.navigate('Bandeja')}>
            <Text style={styles.linkText}>Ver bandeja →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 5. Próximos Eventos */}
      {proximosEventos.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="PRÓXIMOS EVENTOS" />
          {proximosEventos.slice(0, 3).map((e: any, i: number) => (
            <View key={e.id ?? i} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{e.titulo ?? e.nombre}</Text>
                <Text style={styles.itemSub}>{formatDate(e.fecha_inicio ?? e.fecha)}</Text>
              </View>
              {e.tipo && (
                <StatusChip label={e.tipo} color="#555" bg="#F0F0F0" />
              )}
            </View>
          ))}
        </View>
      )}

      {/* 6. Artículos prestados */}
      {articulosPrestados.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="ARTÍCULOS PRESTADOS A MÍ" />
          {articulosPrestados.map((a: any, i: number) => (
            <View key={a.id ?? i} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{a.nombre_articulo ?? a.articulo}</Text>
                <Text style={styles.itemSub}>
                  Préstamo: {formatDate(a.fecha_prestamo)}{a.fecha_devolucion_esperada ? ` · Devolución: ${formatDate(a.fecha_devolucion_esperada)}` : ''}
                </Text>
              </View>
              {isOverdue(a.fecha_devolucion_esperada) ? (
                <StatusChip label="VENCIDO" color="#fff" bg="#E53935" />
              ) : isSoonDue(a.fecha_devolucion_esperada) ? (
                <StatusChip label="Por vencer" color="#fff" bg="#FB8C00" />
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* 7. Mis Casos Pastorales */}
      {misCasos.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="MIS CASOS PASTORALES" />
          {misCasos.slice(0, 3).map((c: any, i: number) => (
            <View key={c.id ?? i} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{c.titulo}</Text>
                {c.miembro_nombre && <Text style={styles.itemSub}>{c.miembro_nombre}</Text>}
              </View>
              {c.estado && (
                <StatusChip
                  label={c.estado_display ?? c.estado}
                  color={c.estado === 'nuevo' ? PANTONE_295C : c.estado === 'en_progreso' ? '#1B5E20' : '#555'}
                  bg={c.estado === 'nuevo' ? '#EAF0FB' : c.estado === 'en_progreso' ? '#E8F5E9' : '#F0F0F0'}
                />
              )}
            </View>
          ))}
        </View>
      )}

      {/* 8. Mis Rendiciones */}
      {misRendiciones.length > 0 && (
        <View style={styles.section}>
          <SectionTitle title="MIS RENDICIONES" />
          {misRendiciones.slice(0, 3).map((r: any, i: number) => (
            <View key={r.id ?? i} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={2}>{r.descripcion}</Text>
                <Text style={styles.itemSub}>
                  {formatCLP(r.monto)}{r.nombre_grupo ? ` · ${r.nombre_grupo}` : ''}
                </Text>
              </View>
              {r.estado && (
                <StatusChip
                  label={r.estado_display ?? r.estado}
                  color={r.estado === 'pendiente' ? '#795548' : r.estado === 'aprobado' ? PANTONE_295C : '#B71C1C'}
                  bg={r.estado === 'pendiente' ? '#FFF8E1' : r.estado === 'aprobado' ? '#EAF0FB' : '#FFEBEE'}
                />
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#E53935', marginTop: 12, textAlign: 'center', fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: PANTONE_295C,
    padding: 24,
    paddingTop: 28,
    gap: 12,
  },
  hamburgerBtn: {
    marginTop: 2,
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  subGreeting: { fontSize: 13, color: PANTONE_134C, marginTop: 4 },
  churchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
    maxWidth: 140,
  },
  churchChipText: { fontSize: 11, color: PANTONE_295C, fontWeight: '600', flexShrink: 1 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    elevation: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
    gap: 8,
  },
  itemTitle: { fontSize: 14, color: '#222', fontWeight: '500' },
  itemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  chip: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  linkText: { color: PANTONE_295C, fontWeight: '600', fontSize: 13, marginTop: 8, textAlign: 'right' },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 4,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#EAF0FB',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    elevation: 0,
  },
  quickCardIcon: {
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  quickCardLabel: { fontSize: 12, fontWeight: '600', color: PANTONE_295C },
});