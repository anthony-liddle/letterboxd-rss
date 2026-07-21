import { describe, expect, it } from 'vitest';
// Deliberately the built bundle, not src/. This file is excluded from the
// default `pnpm test` run and executed by `pnpm test:dist`, which builds first.
import { getDiary, LetterboxdRssError } from '../dist/index.js';

describe('built output in dist/', () => {
  it('keeps instanceof working on a directly constructed error', () => {
    const error = new LetterboxdRssError('network', 'sparklebeard', 'boom');

    // The class extends Error, which historically breaks instanceof once a
    // build step retargets the code. src/errors.ts guards that with an explicit
    // Object.setPrototypeOf; this asserts the guard survived tsup and tsc.
    expect(error).toBeInstanceOf(LetterboxdRssError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('LetterboxdRssError');
    expect(error.kind).toBe('network');
    expect(error.username).toBe('sparklebeard');
  });

  it('throws errors from inside the bundle that match the exported class', async () => {
    // Stronger than constructing one by hand: this proves the class the bundle
    // throws internally is the same identity it exports. A build that duplicated
    // the class would pass the test above and fail this one.
    const error = await getDiary('bad name').catch((e: unknown) => e);

    // The guard is the assertion. Narrowing this way also keeps the property
    // checks below honest without a cast that could paper over a bad type.
    if (!(error instanceof LetterboxdRssError)) {
      throw new Error(`expected a LetterboxdRssError, got ${String(error)}`);
    }
    expect(error.kind).toBe('invalid-username');
  });

  it('still discriminates by kind after the build', async () => {
    const fakeFetch = async (): Promise<Response> =>
      new Response('Not Found', { status: 404 });

    const error = await getDiary('sparklebeard', { fetch: fakeFetch }).catch(
      (e: unknown) => e,
    );

    if (!(error instanceof LetterboxdRssError)) {
      throw new Error(`expected a LetterboxdRssError, got ${String(error)}`);
    }
    expect(error.kind).toBe('http');
    expect(error.status).toBe(404);
  });
});
