import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Cada pantalla que recibe un monto en pesos lo lee con `parsearPesos`. Un `parseFloat` ahí
 * vuelve a guardar "150.000" como $150 (el punto de miles se lee como decimal) sin que ningún otro
 * test lo note, porque las pantallas no se montan en la suite.
 */
const PANTALLAS_CON_MONTO = [
  'screens/finanzas/TransaccionFormScreen.tsx',
  'screens/finanzas/CuentasListScreen.tsx',
  'screens/grupos/IngresoForm.tsx',
  'screens/grupos/RendicionForm.tsx',
  'screens/inventario/ArticuloFormScreen.tsx',
];

describe('pantallas con monto en pesos', () => {
  it.each(PANTALLAS_CON_MONTO)('%s usa parsearPesos y no parseFloat', (ruta) => {
    const fuente = readFileSync(join(__dirname, '..', ruta), 'utf8');
    expect(fuente).toMatch(/from '\.\.\/\.\.\/utils\/pesos'/);
    expect(fuente).not.toMatch(/parseFloat\(/);
  });
});
