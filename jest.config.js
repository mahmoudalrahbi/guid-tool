module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'utils.js',
    'background.js',
  ],
  coverageReporters: ['text', 'lcov'],
};
