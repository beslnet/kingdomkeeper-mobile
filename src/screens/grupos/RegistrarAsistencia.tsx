import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { obtenerEvento, registrarAsistencia } from '../../api/eventos';
import { obtenerGrupo } from '../../api/grupos';
import api from '../../api/api';
import { PANTONE_295C } from '../../theme/colors';

export default function RegistrarAsistenciaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { eventoId, grupoId, titulo } = route.params ?? {};

  const [tab, setTab] = useState<'grupo' | 'otros'>('grupo');
  const [miembrosGrupo, setMiembrosGrupo] = useState<any[]>([]);
  const [otrosMiembros, setOtrosMiembros] = useState<any[]>([]);
  const [asistenciaMarcada, setAsistenciaMarcada] = useState<Set<number>>(new Set());
  const [prevParticipantes, setPrevParticipantes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [grupoData, eventoData, miembrosResp] = await Promise.all([
        obtenerGrupo(grupoId),
        obtenerEvento(eventoId),
        api.get('/api/miembros/', { params: { page_size: 500 } }),
      ]);

      // IDs of members who belong to this group
      const grupMiembros: any[] = grupoData.miembros ?? [];
      const grupoMiembroIds = new Set<number>(grupMiembros.map((m: any) => Number(m.miembro_id ?? m.id)));

      // All church members
      const todos: any[] = miembrosResp.data?.results ?? miembrosResp.data ?? [];

      // Split into group members and others
      const delGrupo = todos.filter((m: any) => grupoMiembroIds.has(Number(m.id)));
      const otros = todos.filter((m: any) => !grupoMiembroIds.has(Number(m.id)));

      // Enrich group members with their rol_en_grupo
      const rolMap = new Map(grupMiembros.map((m: any) => [Number(m.miembro_id ?? m.id), m.rol_en_grupo]));
      const delGrupoConRol = delGrupo.map((m: any) => ({ ...m, rol_en_grupo: rolMap.get(Number(m.id)) ?? 'member' }));

      setMiembrosGrupo(delGrupoConRol);
      setOtrosMiembros(otros);

      // Pre-mark attendees from event
      const participantes: any[] = eventoData.participantes ?? [];
      setPrevParticipantes(participantes);
      const yaAsistieron = new Set<number>(
        participantes
          .filter((p: any) => p.estado_asistencia === 'asistio')
          .map((p: any) => Number(p.miembro_id))
      );
      setAsistenciaMarcada(yaAsistieron);
    } catch {
      setError('No se pudo cargar los datos. Toca para reintentar.');
    }
  }, [grupoId, eventoId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const toggleMiembro = (miembroId: number) => {
    setAsistenciaMarcada((prev) => {
      const next = new Set(prev);
      next.has(miembroId) ? next.delete(miembroId) : next.add(miembroId);
      return next;
    });
  };

  const handleSave = async () => {
    const participantes: { miembro_id: number; estado_asistencia: string }[] = [];

    asistenciaMarcada.forEach((id) => {
      participantes.push({ miembro_id: id, estado_asistencia: 'asistio' });
    });

    prevParticipantes.forEach((p: any) => {
      const id = Number(p.miembro_id);
      if (!asistenciaMarcada.has(id)) {
        participantes.push({ miembro_id: id, estado_asistencia: 'no_asistio' });
      }
    });

    if (participantes.length === 0) {
      Alert.alert('Sin cambios', 'Marca al menos un asistente para registrar.');
      return;
    }

    setSaving(true);
    try {
      await registrarAsistencia(eventoId, participantes);
      Alert.alert('Éxito', 'Asistencia registrada correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.non_field_errors?.[0] ?? 'No se pudo registrar la asistencia.';
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const activeList = tab === 'grupo' ? miembrosGrupo : otrosMiembros;
  const filtered = activeList.filter((m: any) => {
    if (!search) return true;
    const nombre = (m.nombre_completo ?? `${m.nombre ?? ''} ${m.apellidos ?? ''}`).toLowerCase();
    return nombre.includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PANTONE_295C} />
      </View>
    );
  }

  if (error) {
    return (
      <TouchableOpacity style={styles.centered} onPress={() => { setLoading(true); load().finally(() => setLoading(false)); }}>
        <Icon source="alert-circle-outline" size={40} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{titulo}</Text>
        <Text style={styles.headerSub}>{asistenciaMarcada.size} marcado(s)</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'grupo' && styles.tabActive]} onPress={() => { setTab('grupo'); setSearch(''); }}>
          <Text style={[styles.tabText, tab === 'grupo' && styles.tabTextActive]}>
            Del grupo ({miembrosGrupo.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'otros' && styles.tabActive]} onPress={() => { setTab('otros'); setSearch(''); }}>
          <Text style={[styles.tabText, tab === 'otros' && styles.tabTextActive]}>
            Otros ({otrosMiembros.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Icon source="magnify" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar..."
          placeholderTextColor="#AAA"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon source="close-circle" size={18} color="#AAA" />
          </TouchableOpacity>
        )}
      </View>

      <SectionList
        sections={filtered.length > 0 ? [{ title: '', data: filtered }] : []}
        keyExtractor={(item, i) => String(item.id ?? i)}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Icon source="account-search-outline" size={40} color="#CCC" />
            <Text style={styles.emptyText}>{search ? 'Sin resultados' : 'Sin miembros'}</Text>
          </View>
        }
        renderSectionHeader={() => null}
        renderItem={({ item }) => {
          const id = Number(item.id);
          const checked = asistenciaMarcada.has(id);
          const nombre = item.nombre_completo ?? (`${item.nombre ?? ''} ${item.apellidos ?? ''}`.trim() || '—');
          const rol = item.rol_en_grupo;
          return (
            <TouchableOpacity
              style={[styles.memberRow, checked && styles.memberRowChecked]}
              onPress={() => toggleMiembro(id)}
              activeOpacity={0.7}
            >
              <Icon
                source={checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                size={26}
                color={checked ? PANTONE_295C : '#CCC'}
              />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{nombre}</Text>
                {rol ? (
                  <Text style={styles.memberRol}>
                    {rol === 'leader' ? 'Líder' : rol === 'co_leader' ? 'Co-Líder' : 'Miembro'}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon source="clipboard-check-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Registrar asistencia</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { marginTop: 12, color: '#E53935', textAlign: 'center', fontSize: 14 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyInner: { alignItems: 'center', paddingTop: 40 },
  emptyText: { marginTop: 10, color: '#999', fontSize: 14 },
  header: { backgroundColor: PANTONE_295C, paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: PANTONE_295C },
  tabText: { fontSize: 13, fontWeight: '500', color: '#888' },
  tabTextActive: { color: PANTONE_295C, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 2 },
  listContent: { padding: 12, paddingBottom: 100 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  memberRowChecked: { borderColor: PANTONE_295C, backgroundColor: '#F0F5FF' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#222' },
  memberRol: { fontSize: 12, color: '#888', marginTop: 2 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F5F7FA',
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveBtn: {
    backgroundColor: PANTONE_295C,
    borderRadius: 25,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

