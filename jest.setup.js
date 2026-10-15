// Desmonta, al terminar cada test, todo árbol creado con react-test-renderer.
//
// Sin esto, las animaciones y listas de react-native-paper / VirtualizedList siguen disparando
// timers cuando Jest ya derribó el entorno: aparecen "Cannot log after tests are done", un worker
// que no sale ("failed to exit gracefully") y, según el momento, un crash intermitente del worker
// con "Cannot read properties of undefined". Pasaba en AusentesTab, PeticionesScreen,
// PeticionesAcompanar y otros, que montan pantallas y nunca las desmontan.
const renderer = require('react-test-renderer');

const crear = renderer.create;
const montados = [];

renderer.create = (...args) => {
  const arbol = crear(...args);
  montados.push(arbol);
  return arbol;
};

afterEach(() => {
  const pendientes = montados.splice(0);
  if (pendientes.length === 0) return;
  renderer.act(() => {
    pendientes.forEach((arbol) => {
      try {
        arbol.unmount();
      } catch {
        // ya desmontado por el propio test
      }
    });
  });
});
