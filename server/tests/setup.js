// Silence noisy cookie header warnings from superagent/cookiejar in tests.
const originalWarn = console.warn;
console.warn = (...args) => {
  const first = args[0];
  if (typeof first === 'string' && first.includes('Invalid cookie header encountered')) {
    return;
  }
  originalWarn(...args);
};
