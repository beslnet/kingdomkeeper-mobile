import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { PANTONE_295C } from '../theme/colors';

export interface PersonaOpcion {
  id: number;
  nombre: string;
  detalle?: string | null;
}

interface Props {
  label: string;
  ayuda?: string;
  placeholder?: string;
  opciones: PersonaOpcion[];
  value: number | null;
  onChange: (id: number | null) => void;
}

/** Busca entre `opciones` y muestra la elegida como una etiqueta que se puede quitar. */
export default function PersonaPicker({ label, ayuda, placeholder, opciones, value, onChange }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const elegida = value != null ? opciones.find(o => o.id === value) : undefined;
  const q = busqueda.trim().toLowerCase();
  const coincidencias = q
    ? opciones
        .filter(o => `${o.nombre} ${o.detalle ?? ''}`.toLowerCase().includes(q))
        .slice(0, 6)
    : [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {elegida ? (
        <View style={styles.chip}>
          <Icon source="account-check" size={16} color={PANTONE_295C} />
          <Text style={styles.chipText} numberOfLines={1}>
            {elegida.nombre}
          </Text>
          <TouchableOpacity
            onPress={() => onChange(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`Quitar a ${elegida.nombre}`}
          >
            <Icon source="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder={placeholder ?? 'Buscar por nombre...'}
            placeholderTextColor="#AAA"
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
          />
          {q.length > 0 && (
            <View style={styles.sugerencias}>
              {coincidencias.length === 0 ? (
                <Text style={styles.sinResultados}>Sin resultados</Text>
              ) : (
                coincidencias.map(o => (
                  <TouchableOpacity
                    key={o.id}
                    style={styles.sugerencia}
                    onPress={() => {
                      onChange(o.id);
                      setBusqueda('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon source="account-outline" size={16} color="#888" />
                    <View style={styles.sugerenciaTexto}>
                      <Text style={styles.sugerenciaNombre}>{o.nombre}</Text>
                      {!!o.detalle && <Text style={styles.sugerenciaDetalle}>{o.detalle}</Text>}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </>
      )}
      {!!ayuda && <Text style={styles.ayuda}>{ayuda}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D3D6DB',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8EEF7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: { flex: 1, fontSize: 15, color: PANTONE_295C, fontWeight: '600' },
  sugerencias: {
    borderWidth: 1,
    borderColor: '#E0E3E8',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 4,
  },
  sugerencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E3E8',
  },
  sugerenciaTexto: { flex: 1 },
  sugerenciaNombre: { fontSize: 15, color: '#222' },
  sugerenciaDetalle: { fontSize: 12, color: '#888' },
  sinResultados: { padding: 12, fontSize: 13, color: '#888' },
  ayuda: { fontSize: 12, color: '#777', marginTop: 4, marginLeft: 2 },
});
