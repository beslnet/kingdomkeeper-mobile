import {
  appStoreLookupUrl,
  BUNDLE_ID,
  decideFromLookup,
  isVersionOutdated,
} from '../utils/versionCheck';

describe('appStoreLookupUrl', () => {
  it('apunta al bundle de Kingdom Keeper y al país de la tienda', () => {
    const url = appStoreLookupUrl(1700000000000);
    expect(url).toContain('https://itunes.apple.com/lookup?');
    expect(url).toContain('bundleId=com.kingdomkeeper.mobile');
    expect(BUNDLE_ID).toBe('com.kingdomkeeper.mobile');
    expect(url).toContain('country=cl');
  });

  // Apple sirve el lookup con max-age ≈ 7 h: sin un parámetro que cambie, el teléfono ve
  // la versión anterior horas después de que el correo diga "publicada".
  it('lleva el parámetro anti-caché t=', () => {
    expect(appStoreLookupUrl(1700000000000)).toMatch(/[?&]t=1700000000000$/);
  });

  it('el parámetro cambia entre llamadas', () => {
    const spy = jest.spyOn(Date, 'now');
    spy.mockReturnValueOnce(1000).mockReturnValueOnce(2000);
    const a = appStoreLookupUrl();
    const b = appStoreLookupUrl();
    spy.mockRestore();
    expect(a).not.toBe(b);
    expect(a).toMatch(/t=1000$/);
    expect(b).toMatch(/t=2000$/);
  });
});

describe('isVersionOutdated', () => {
  it.each([
    ['1.1.3', '1.1.4', true],
    ['1.1.3', '1.2.0', true],
    ['1.1.3', '2.0.0', true],
    ['1.9.0', '1.10.0', true], // comparación numérica, no de texto
    ['1.1.3', '1.1.3', false],
    ['1.1.4', '1.1.3', false],
    ['2.0.0', '1.9.9', false],
    ['1.1', '1.1.0', false], // tramos que faltan valen 0
    ['1.1.3', '1.1.3-beta', false],
  ])('%s vs %s → %s', (current, minimum, expected) => {
    expect(isVersionOutdated(current, minimum)).toBe(expected);
  });

  it.each([['', '1.1.3'], ['1.1.3', ''], ['abc', '1.1.3'], ['1.1.3', 'x.y.z']])(
    'una versión ilegible (%p, %p) nunca cuenta como desactualizada',
    (current, minimum) => {
      expect(isVersionOutdated(current, minimum)).toBe(false);
    },
  );
});

describe('decideFromLookup', () => {
  const lookup = (version: unknown) => ({ resultCount: 1, results: [{ version }] });

  it('fuerza cuando la tienda publica una versión mayor', () => {
    expect(decideFromLookup(lookup('1.1.4'), '1.1.3')).toEqual({ force: true, storeVersion: '1.1.4' });
  });

  it('no fuerza si la tienda tiene la misma versión', () => {
    expect(decideFromLookup(lookup('1.1.3'), '1.1.3')).toEqual({ force: false, reason: 'al-dia' });
  });

  it('no fuerza si la tienda tiene una versión MENOR (build de TestFlight, versión retirada)', () => {
    expect(decideFromLookup(lookup('1.1.2'), '1.1.3').force).toBe(false);
  });

  it('no fuerza con la respuesta vacía (versión aún no propagada o país sin la app)', () => {
    expect(decideFromLookup({ resultCount: 0, results: [] }, '1.1.3')).toEqual({
      force: false,
      reason: 'sin-resultado',
    });
  });

  it.each([[undefined], [null], [{}], ['<html>error</html>']])(
    'no fuerza con una respuesta rota (%p)',
    (json) => {
      expect(decideFromLookup(json, '1.1.3').force).toBe(false);
    },
  );

  it.each([[undefined], [''], ['v-next'], [42]])(
    'no fuerza si la versión de la tienda no se puede leer (%p)',
    (version) => {
      expect(decideFromLookup(lookup(version), '1.1.3').force).toBe(false);
    },
  );
});
