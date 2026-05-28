import { decodeEntities } from './decode.js';
import { LetterboxdRssError } from './errors.js';
import type { DiaryEntry } from './types.js';

/**
 * Read the inner text of the first `<tag>...</tag>` in `source`, allowing for
 * attributes on the opening tag. Returns null when the tag is absent.
 *
 * Tag names are matched as literal strings, including namespace prefixes like
 * `letterboxd:memberRating`; we do not resolve namespaces because Letterboxd's
 * prefixes are stable. Matching is case-sensitive, as XML requires.
 */
function extractTag(source: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`);
  const match = source.match(re);
  if (match === null) return null;
  const inner = match[1];
  return inner === undefined ? null : inner;
}

/** Strip a `<![CDATA[ ... ]]>` wrapper, returning the raw inner text. */
function unwrapCdata(source: string): string {
  const match = source.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (match === null) return source;
  const inner = match[1];
  return inner === undefined ? source : inner;
}

/** All `<p>` inner-HTML blocks, in document order. */
function paragraphs(html: string): string[] {
  const blocks: string[] = [];
  for (const match of html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)) {
    const inner = match[1];
    if (inner !== undefined) blocks.push(inner);
  }
  return blocks;
}

/** First `<img src>` value found in `html`, entity-decoded; null if none. */
function firstImageSrc(html: string): string | null {
  const match = html.match(/<img\b[^>]*?\bsrc=(["'])([\s\S]*?)\1/);
  if (match === null) return null;
  const url = match[2];
  return url === undefined ? null : decodeEntities(url.trim());
}

/**
 * Reduce review HTML to decoded plain text with whitespace collapsed. Letterboxd
 * reviews support only a closed set of formatting tags (`<strong>`/`<b>`,
 * `<em>`/`<i>`, `<a href>`, `<blockquote>`), so dropping every tag while keeping
 * its inner text yields clean plain text; for links this keeps the link text and
 * discards the href, since the URL lives in the opening tag we remove. We default
 * to plain text for portability (it drops safely into any consumer context), not
 * because the markup is dangerous. A future opt-in "html" review mode could pass
 * these five known-safe tags through; that is intentionally not built yet.
 */
function htmlToText(html: string): string {
  const withoutTags = html.replace(/<[^>]+>/g, '');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

function parseItem(item: string): DiaryEntry {
  const filmRaw = extractTag(item, 'letterboxd:filmTitle') ?? '';
  const film = decodeEntities(filmRaw.trim());

  const yearRaw = extractTag(item, 'letterboxd:filmYear');
  let year: number | null = null;
  if (yearRaw !== null) {
    const parsed = Number.parseInt(yearRaw.trim(), 10);
    year = Number.isNaN(parsed) ? null : parsed;
  }

  // memberRating is optional: it is absent on unrated entries (e.g. an unrated
  // rewatch), in which case rating is null.
  const ratingRaw = extractTag(item, 'letterboxd:memberRating');
  let rating: number | null = null;
  if (ratingRaw !== null) {
    const parsed = Number.parseFloat(ratingRaw.trim());
    rating = Number.isNaN(parsed) ? null : parsed;
  }

  const liked =
    (extractTag(item, 'letterboxd:memberLike') ?? '').trim() === 'Yes';
  const rewatch =
    (extractTag(item, 'letterboxd:rewatch') ?? '').trim() === 'Yes';

  const watchedDate = (extractTag(item, 'letterboxd:watchedDate') ?? '').trim();

  const pubRaw = extractTag(item, 'pubDate');
  const publishedDate =
    pubRaw === null ? '' : new Date(pubRaw.trim()).toISOString();

  const tmdbRaw = extractTag(item, 'tmdb:movieId');
  const tmdbId = tmdbRaw === null ? null : tmdbRaw.trim();

  const link = (extractTag(item, 'link') ?? '').trim();

  const description = unwrapCdata(extractTag(item, 'description') ?? '');
  const posterUrl = firstImageSrc(description);

  // Review detection is driven solely by the guid prefix, which is the reliable
  // discriminator: "letterboxd-review-" means a real review, "letterboxd-watch-"
  // means none. The second <p> of a watch entry is localized boilerplate
  // ("Watched on ..."), so we must not treat it as a review. We deliberately do
  // not sniff that English string, since it changes per user locale.
  const guid = (extractTag(item, 'guid') ?? '').trim();
  const hasReview = guid.startsWith('letterboxd-review-');
  let review: string | null = null;
  if (hasReview) {
    // The CDATA holds exactly two <p> blocks: [0] is the poster image, [1] is
    // the review body.
    const body = paragraphs(description)[1];
    if (body !== undefined) {
      const text = htmlToText(body);
      review = text.length > 0 ? text : null;
    }
  }

  return {
    film,
    year,
    rating,
    liked,
    rewatch,
    watchedDate,
    publishedDate,
    posterUrl,
    review,
    tmdbId,
    link,
  };
}

/**
 * Cheap structural check that a body is an RSS feed rather than, say, an HTML
 * error page (which is how Letterboxd serves a nonexistent or deactivated
 * username; there are no private profiles to account for). Used both here and by
 * `getDiary`, which rethrows with username context.
 */
export function looksLikeRss(xml: string): boolean {
  return /<rss[\s>]/.test(xml) || /<channel[\s>]/.test(xml);
}

/**
 * Parse a Letterboxd RSS document into typed diary entries, in document order.
 * A valid feed with no items yields an empty array; only genuinely non-RSS input
 * throws.
 */
export function parseDiary(xml: string): DiaryEntry[] {
  if (!looksLikeRss(xml)) {
    throw new LetterboxdRssError(
      'not-rss',
      '',
      'Input does not look like a Letterboxd RSS feed.',
    );
  }

  const entries: DiaryEntry[] = [];
  for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g)) {
    const item = match[1];
    if (item !== undefined) entries.push(parseItem(item));
  }
  return entries;
}
