// Empty stub aliased in for the `server-only` package during vitest (see
// vitest.config.ts). The real package's module throws unless the bundler sets
// the `react-server` export condition — Next.js does at build time, vitest does
// not — so any unit test that imports a module doing `import "server-only"`
// (e.g. lib/actions/mutation.ts) would otherwise fail at module load. This no-op
// keeps the production import guard intact while letting those actions be
// unit-tested directly.
export {};
