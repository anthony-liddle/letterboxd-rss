import { defineConfig } from 'vitest/config';

// Runs only the built-output test, which asserts the shipped bundle behaves
// like the source. Invoked by `pnpm test:dist`, which builds first.
export default defineConfig({
  test: {
    include: ['test/dist.test.ts'],
  },
});
