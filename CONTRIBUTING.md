# Contributing

Thanks for your interest in the project. This is a small, single-purpose package, so the process is deliberately light.

## Reporting a security issue

Do not open a public issue for a security concern. Email the maintainer directly at the address listed on the [GitHub profile](https://github.com/anthony-liddle) and allow time for a fix before disclosing.

This package makes network requests to Letterboxd and parses the response, so the plausible issue classes are input handling in the parser and anything that could cause a request to go somewhere unintended. Both are worth a private report.

## Development setup

Requires Node 20 or newer and pnpm.

```sh
pnpm install
```

`pnpm install` also installs the git hooks through the `prepare` script, so hooks are active from your first commit.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm test` | Run the test suite |
| `pnpm test:watch` | Run the tests in watch mode |
| `pnpm test:coverage` | Run the tests with a coverage report |
| `pnpm test:dist` | Build, then test the built bundle in `dist/` |
| `pnpm lint` | Lint and format check with Biome |
| `pnpm format` | Rewrite files with Biome's formatter |
| `pnpm typecheck` | Type check without emitting |
| `pnpm build` | Build the ESM bundle and type declarations |

`pnpm test:dist` is separate from `pnpm test` because it imports the built output, which only exists after a build. It exists to catch build-tool regressions that source-level tests cannot see, in particular the `Object.setPrototypeOf` fixup in `src/errors.ts` that keeps `instanceof LetterboxdRssError` working.

## Tooling notes

Biome handles both linting and formatting. Please do not add Prettier or ESLint; one tool for both jobs is a deliberate choice here.

Biome formats `.ts`, `.js`, and `.json`. It does not format Markdown or YAML, so those files are maintained by hand.

The lint gate runs with `--error-on-warnings`. Biome exits 0 on warnings by default, which would make the check incapable of failing, so warnings are treated as blocking.

## Branches and commits

Branch names follow `type/kebab-case-description`, for example `fix/poster-url-parsing`.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint in a `commit-msg` hook:

```
<type>(<scope>): <subject>
```

Allowed types are `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, and `revert`.

A `pre-commit` hook runs `lint-staged` and then `pnpm typecheck`. If a hook fails, fix the cause rather than bypassing it with `--no-verify`.

## Pull requests

1. Branch from `main`.
2. Make the change, with tests where behavior changes.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before pushing. CI runs all of these on Node 20 and Node 22, and every one must pass.
4. Open a PR against `main` and fill in the template.
5. Resolve review conversations before merging.

`main` is protected. Pull requests need a passing CI run, an approving review, resolved conversations, and signed commits.

## Code style

Match the surrounding code. Two things are worth stating because they are easy to get wrong here:

- Comments explain why, not what, and often record what the code deliberately does *not* do. Several parsing decisions only make sense alongside the reason an obvious alternative was rejected.
- The package has zero runtime dependencies. Adding one is a significant change, not a detail, so raise it in an issue first.
