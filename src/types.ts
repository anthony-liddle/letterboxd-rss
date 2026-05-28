/**
 * A single normalized Letterboxd diary entry, derived from one `<item>` in a
 * user's public RSS feed (https://letterboxd.com/{user}/rss/).
 *
 * Every field is normalized to a stable shape so consumers never touch raw RSS.
 */
export interface DiaryEntry {
  /** Film title from `<letterboxd:filmTitle>`, with XML entities decoded. */
  film: string;
  /** Release year from `<letterboxd:filmYear>`; null when absent or unparseable. */
  year: number | null;
  /** Member rating from `<letterboxd:memberRating>` (e.g. 3.5); null if unrated. */
  rating: number | null;
  /** True when `<letterboxd:memberLike>` is "Yes". */
  liked: boolean;
  /** True when `<letterboxd:rewatch>` is "Yes". */
  rewatch: boolean;
  /** Watched date from `<letterboxd:watchedDate>` as an ISO date string. */
  watchedDate: string;
  /** Publish date from `<pubDate>` as an ISO 8601 string. */
  publishedDate: string;
  /** Poster image URL pulled from the `<img src>` in the description HTML; null if none. */
  posterUrl: string | null;
  /** Review text with HTML stripped to plain text; null when the entry has no review. */
  review: string | null;
  /** TMDB movie id from `<tmdb:movieId>`; null when absent. */
  tmdbId: string | null;
  /** Permalink to the diary entry, from `<link>`. */
  link: string;
}

/**
 * Options for {@link getDiary}.
 */
export interface DiaryOptions {
  /**
   * Override the `fetch` implementation used to retrieve the feed. Useful for
   * injecting a custom agent, a caching layer, or a stub during testing.
   * Defaults to the global `fetch`.
   */
  fetch?: typeof fetch;
  /** Signal used to cancel the request or apply a timeout. */
  signal?: AbortSignal;
}
