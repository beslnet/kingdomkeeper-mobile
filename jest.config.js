module.exports = {
  preset: 'react-native',
  // Las sesiones de Claude crean worktrees dentro del repo (.claude/worktrees): sin esto, jest corre
  // también sus copias de los tests y los conteos salen inflados o con fallas ajenas a main.
  testPathIgnorePatterns: ['/node_modules/', '/.claude/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
};
