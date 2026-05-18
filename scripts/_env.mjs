// Tiny env helper so scripts never hardcode secrets.
// Run scripts with: node --env-file=.env.local scripts/<script>.mjs ...
export function env(key) {
  const v = process.env[key];
  if (!v) {
    console.error(
      `Missing env var ${key}.\n` +
      `Run with:  node --env-file=.env.local scripts/<script>.mjs ...`,
    );
    process.exit(2);
  }
  return v;
}
