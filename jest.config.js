module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Las sesiones de Claude crean worktrees dentro del repo (.claude/worktrees): sin esto, jest corre
  // también sus copias de los tests y los conteos salen inflados o con fallas ajenas a main.
  testPathIgnorePatterns: ['/node_modules/', '/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  // @react-navigation publica ESM (`export ...`) y el mock de safe-area-context viene en TS/ESM; el
  // preset de RN solo transforma react-native y @react-native*. Sin esto, cualquier test que importe
  // App.tsx muere con "Unexpected token 'export'" antes de ejecutar una sola línea.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-.*)/)',
  ],
};
