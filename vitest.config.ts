import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // test/dist.test.ts imports the built bundle, so it only works once
    // `pnpm build` has produced dist/. It runs separately via `pnpm test:dist`
    // (see vitest.dist.config.ts) to keep a fresh clone's `pnpm test` green.
    exclude: [...configDefaults.exclude, 'test/dist.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      // Naming src explicitly reports every source file, including any that no
      // test imports. Without this, v8 only counts files a test happened to
      // pull in, which flatters the number.
      include: ['src/**'],
    },
  },
});
