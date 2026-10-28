import { Keyboard } from 'react-native';

/**
 * `onRequestClose` de un Modal con campos de texto. En Android, un solo «atrás» con el teclado abierto cerraba el
 * teclado y también el formulario, y se perdía lo escrito (el Modal recibe el «atrás» antes que el teclado). Con el
 * teclado arriba, «atrás» solo lo esconde, como en cualquier otra pantalla; el segundo cierra.
 */
export const cerrarSalvoTeclado = (cerrar: () => void) => () => {
  if (Keyboard.isVisible()) Keyboard.dismiss();
  else cerrar();
};
