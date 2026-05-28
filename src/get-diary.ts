import { LetterboxdRssError } from './errors.js';
import { looksLikeRss, parseDiary } from './parse.js';
import type { DiaryEntry, DiaryOptions } from './types.js';

// We validate the username only for URL safety, NOT against Letterboxd's naming
// policy. Mirroring Letterboxd's exact character or length rules would cause
// false rejections whenever Letterboxd changes them, and they have changed
// username rules more than once. Whether an account actually exists is already
// answered by the fetch: a nonexistent or deactivated username surfaces as kind
// "http" or "not-rss". So we accept anything (uppercase included) that is a
// single, safe URL path segment needing no encoding, and reject only what is
// unmappable or unsafe: empty or whitespace, "." and "..", and any character
// that would require URL-encoding (spaces, control chars, "/", "\", "?", "#",
// "%", and so on). encodeURIComponent leaves exactly the URL-path-safe
// characters untouched, so an unchanged round-trip is precisely the "needs no
// encoding" test we want.
function assertValidUsername(username: string): void {
  const safe =
    username.length > 0 &&
    username !== '.' &&
    username !== '..' &&
    encodeURIComponent(username) === username;
  if (!safe) {
    throw new LetterboxdRssError(
      'invalid-username',
      username,
      `Invalid Letterboxd username: ${JSON.stringify(username)}.`,
    );
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === 'AbortError'
  );
}

/**
 * Fetch and parse a Letterboxd user's public diary RSS feed.
 *
 * This is a thin shell: it validates the username, performs the request, maps
 * failures onto {@link LetterboxdRssError}, and hands a verified RSS body to
 * {@link parseDiary}. All parsing intelligence lives in `parseDiary`.
 *
 * @throws {LetterboxdRssError} `invalid-username` before any request; `network`
 *   if the request fails outright; `http` on a non-2xx response (with `status`);
 *   `not-rss` when the body is not an RSS feed (how a nonexistent or deactivated
 *   username surfaces; Letterboxd has no private profiles). Every error carries
 *   the `username`. An aborted request rejects with the native `AbortError`, not
 *   a `LetterboxdRssError`.
 */
export async function getDiary(
  username: string,
  options?: DiaryOptions,
): Promise<DiaryEntry[]> {
  assertValidUsername(username);

  const url = `https://letterboxd.com/${username}/rss/`;
  const doFetch = options?.fetch ?? fetch;
  const init: { signal?: AbortSignal } = {};
  if (options?.signal !== undefined) {
    init.signal = options.signal;
  }

  let body: string;
  try {
    const response = await doFetch(url, init);
    if (!response.ok) {
      throw new LetterboxdRssError(
        'http',
        username,
        `Letterboxd responded with HTTP ${response.status} for "${username}".`,
        { status: response.status },
      );
    }
    body = await response.text();
  } catch (cause) {
    // The http error we just raised passes straight through.
    if (cause instanceof LetterboxdRssError) {
      throw cause;
    }
    // Cancellation should behave like any other fetch-based API, so let the
    // native AbortError propagate unwrapped. LetterboxdRssError stays reserved
    // for Letterboxd-specific failures; only genuine network problems (fetch
    // rejection, body read failure) become kind "network".
    if (isAbortError(cause)) {
      throw cause;
    }
    throw new LetterboxdRssError(
      'network',
      username,
      `Failed to fetch the Letterboxd feed for "${username}".`,
      { cause },
    );
  }

  if (!looksLikeRss(body)) {
    throw new LetterboxdRssError(
      'not-rss',
      username,
      `The feed for "${username}" was not valid RSS (the username may not exist or may have been deactivated).`,
    );
  }

  return parseDiary(body);
}
