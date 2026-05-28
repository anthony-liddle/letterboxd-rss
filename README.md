# letterboxd-rss

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#why-zero-dependencies)

A tiny, zero-dependency, typed package that turns a Letterboxd username into clean, typed diary entries from their public RSS feed.

Letterboxd has no official API, so the public RSS feed at `https://letterboxd.com/{username}/rss/` is the only public surface. A generic RSS parser hands you `item.title`, which mashes the film, year, and star glyphs together for humans to read. This package reads the structured, Letterboxd-specific fields instead and gives you a fully typed array of diary entries, with XML entities decoded, dates normalized, and reviews reduced to plain text.

> Early release (0.1.0). It is usable today, but the API may still evolve before 1.0, so pin a version if you depend on it.

## Install

```sh
npm install letterboxd-rss
```

```sh
pnpm add letterboxd-rss
```

```sh
yarn add letterboxd-rss
```

The package ships as ESM with type declarations and requires Node 20 or newer (it relies on the global `fetch`).

## Usage

### `getDiary`: fetch and parse in one step

```ts
import { getDiary } from 'letterboxd-rss';

const entries = await getDiary('sparklebeard');

for (const entry of entries) {
  const rating = entry.rating === null ? 'unrated' : `${entry.rating}/5`;
  console.log(`${entry.film} (${entry.year ?? 'year unknown'}) - ${rating}`);
}
```

### `parseDiary`: bring your own XML

`parseDiary` is pure and synchronous. Give it RSS XML you already have (from a file, a cache, an HTTP response, or a test fixture) and it returns typed entries with no network access. This is the seam that makes the library easy to test and easy to slot into your own fetching setup.

```ts
import { readFileSync } from 'node:fs';
import { parseDiary } from 'letterboxd-rss';

const xml = readFileSync('./sparklebeard.rss', 'utf8');
const entries = parseDiary(xml);
```

### Options

`getDiary` accepts an optional second argument:

```ts
await getDiary('sparklebeard', {
  fetch: myCustomFetch, // override the global fetch (custom agent, caching, tests)
  signal: controller.signal, // cancel or time out the request
});
```

## The `DiaryEntry` type

```ts
interface DiaryEntry {
  film: string;
  year: number | null;
  rating: number | null;
  liked: boolean;
  rewatch: boolean;
  watchedDate: string;
  publishedDate: string;
  posterUrl: string | null;
  review: string | null;
  tmdbId: string | null;
  link: string;
}
```

| Field | Type | Description |
| --- | --- | --- |
| `film` | `string` | The film title, with XML entities decoded. |
| `year` | `number \| null` | The release year, or `null` when it is missing or unparseable. |
| `rating` | `number \| null` | The member rating as a decimal (for example `3.5`), or `null` when the entry is unrated. |
| `liked` | `boolean` | Whether the member liked the film. |
| `rewatch` | `boolean` | Whether this diary entry is a rewatch. |
| `watchedDate` | `string` | When the film was watched, as an ISO date string (for example `2026-05-24`). |
| `publishedDate` | `string` | When the entry was published to the feed, as an ISO 8601 timestamp. |
| `posterUrl` | `string \| null` | The poster image URL, or `null` when none is present. |
| `review` | `string \| null` | The review as plain text, or `null` when the entry has no review. |
| `tmdbId` | `string \| null` | The TMDB movie id, or `null` when absent. |
| `link` | `string` | The permalink to the diary entry on Letterboxd. |

### `watchedDate` vs `publishedDate`

These are two different dates and they often differ. `watchedDate` is when the member actually saw the film; `publishedDate` is when the entry hit the RSS feed. They line up for a film logged the day it was watched, but they diverge whenever someone backfills older viewings, so sort and group by whichever one matches your intent.

### Nullable fields

`year`, `rating`, `review`, `tmdbId`, and `posterUrl` can each be `null`. A common real case is an unrated rewatch, which has no `rating`, and a watch logged without a review, which has no `review`. Always handle the `null` case rather than assuming a value is present.

## Error model

The guiding rule is simple: "I could not get your data" throws, and "your data is genuinely empty" does not. A valid feed for a real member who has not logged any films returns an empty array (`[]`), never an error.

Everything else throws a `LetterboxdRssError`, which carries the `username` and a `kind` discriminant:

| `kind` | Thrown when | Extra |
| --- | --- | --- |
| `invalid-username` | The username is not safe to place in a URL path (empty, whitespace, `/`, `\`, `?`, `#`, `%`, `.`, `..`, control characters, and similar). Thrown before any request, so no network call is made. | |
| `network` | The request fails outright (DNS failure, offline, or a body that cannot be read). | `cause` holds the underlying error. |
| `http` | The server responds with a non-2xx status. | `status` holds the HTTP status code. |
| `not-rss` | The response is not an RSS feed. This is how a nonexistent or deactivated username surfaces, because Letterboxd serves an HTML error page rather than a feed. Letterboxd has no private profiles, so this is never a privacy case. | |

```ts
import { getDiary, LetterboxdRssError } from 'letterboxd-rss';

try {
  const entries = await getDiary('sparklebeard');
  // use entries
} catch (error) {
  if (error instanceof LetterboxdRssError) {
    switch (error.kind) {
      case 'invalid-username':
        console.error('That username cannot be used.');
        break;
      case 'network':
        console.error('Could not reach Letterboxd.', error.cause);
        break;
      case 'http':
        console.error(`Letterboxd returned HTTP ${error.status}.`);
        break;
      case 'not-rss':
        console.error('No such user, or the account was deactivated.');
        break;
    }
  } else {
    throw error;
  }
}
```

Note that the username validator only checks for URL safety, not whether the handle matches Letterboxd's naming rules. Whether an account actually exists is answered by the request itself (as an `http` or `not-rss` error), which keeps the library from breaking when Letterboxd changes its username policy.

### Cancellation

If you pass a `signal` and abort it, the request rejects with the native `AbortError`, not a `LetterboxdRssError`. Cancellation behaves like every other fetch-based API, so you can branch on `error.name === 'AbortError'` the same way you already do elsewhere.

## The `review` field is plain text

`review` is returned as plain text, with formatting tags removed and entities decoded. For a link, the link text is kept and the URL is dropped.

The reason is portability, not safety: a data layer should not assume its consumer renders HTML. Returning plain text means a review drops cleanly into a terminal, a JSON payload, a native UI, or a web page without further handling. Letterboxd reviews support only a small, known set of formatting tags (`<strong>` / `<b>`, `<em>` / `<i>`, `<a href>`, and `<blockquote>`), so an opt-in HTML mode that preserves those tags may come in a later release.

## Why zero dependencies?

Zero runtime dependencies is a deliberate feature, but it is justified by a narrow circumstance, not by a belief that hand-rolling XML is generally a good idea. This package parses exactly one feed shape: a single, known, stable, well-formed document that Letterboxd produces. Owning a small parser for that one shape is reasonable.

That reasoning does not transfer. The moment you need to parse multiple feed sources, untrusted input, or a format that evolves outside your control, reach for a real XML parser such as [`fast-xml-parser`](https://www.npmjs.com/package/fast-xml-parser). Do not generalize the approach here into "parse XML with string operations," which is a well-known way to get hurt.

## Relative time

The package returns absolute ISO dates and takes no presentation dependency. If you want "3 days ago" or "last month" on the consumer side, the platform already has `Intl.RelativeTimeFormat`:

```ts
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const watchedMs = Date.parse(entry.watchedDate);
const days = Math.round((watchedMs - Date.now()) / 86_400_000);

console.log(rtf.format(days, 'day')); // for example, "3 days ago"
```

## License

MIT (c) Anthony Liddle
