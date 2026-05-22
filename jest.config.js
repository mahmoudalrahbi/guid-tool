module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.js', 'fake-indexeddb/auto'],
  testMatch: ['**/tests/**/*.test.js'],
};
