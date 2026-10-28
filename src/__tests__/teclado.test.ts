import { Keyboard } from 'react-native';
import { cerrarSalvoTeclado } from '../utils/teclado';

/**
 * En Android, un «atrás» con el teclado abierto cerraba el formulario (Modal) y se perdía lo escrito. Verificado en el
 * emulador: el Modal recibe el «atrás» antes que el teclado.
 */
describe('«atrás» en un formulario con teclado', () => {
  afterEach(() => jest.restoreAllMocks());

  it('con el teclado abierto solo lo esconde: el formulario sigue abierto', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
    const esconder = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    const cerrar = jest.fn();
    cerrarSalvoTeclado(cerrar)();
    expect(esconder).toHaveBeenCalled();
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('sin teclado cierra el formulario', () => {
    jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
    const cerrar = jest.fn();
    cerrarSalvoTeclado(cerrar)();
    expect(cerrar).toHaveBeenCalled();
  });
});
