module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    'react-native-worklets/plugin',
  ],
  env: {
    test: {
      // Jest corre en CJS y no soporta `import()` nativo sin --experimental-vm-modules.
      // `src/api/api.ts` lo usa para romper el ciclo con los stores, así que en tests
      // se baja a require(). Solo afecta a Jest: el bundle de la app no pasa por aquí.
      plugins: ['@babel/plugin-transform-dynamic-import'],
    },
  },
};
