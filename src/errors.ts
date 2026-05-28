/**
 * Discriminates the category of failure surfaced by this package.
 *
 * - `network`: the request never produced a response (DNS, offline, aborted).
 * - `http`: a response came back with a non-OK status (see {@link LetterboxdRssError.status}).
 * - `not-rss`: the response body was not the expected Letterboxd RSS shape.
 * - `invalid-username`: the username failed validation before any request.
 */
export type LetterboxdRssErrorKind =
  | 'network'
  | 'http'
  | 'not-rss'
  | 'invalid-username';

/** Extra fields accepted by the {@link LetterboxdRssError} constructor. */
export interface LetterboxdRssErrorOptions {
  /** HTTP status code; meaningful when `kind` is `"http"`. */
  status?: number;
  /** Underlying error that triggered this one, forwarded to `Error.cause`. */
  cause?: unknown;
}

/**
 * The single error type thrown by this package. Inspect {@link kind} to branch
 * on the failure category; `instanceof LetterboxdRssError` works reliably across
 * transpilation targets thanks to an explicit prototype fixup.
 */
export class LetterboxdRssError extends Error {
  override readonly name = 'LetterboxdRssError';
  /** The failure category. */
  readonly kind: LetterboxdRssErrorKind;
  /** The username the operation was acting on. */
  readonly username: string;
  /** HTTP status code; present only when {@link kind} is `"http"`. */
  readonly status?: number;

  constructor(
    kind: LetterboxdRssErrorKind,
    username: string,
    message: string,
    options?: LetterboxdRssErrorOptions,
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.kind = kind;
    this.username = username;
    if (options?.status !== undefined) {
      this.status = options.status;
    }
    // Restore the prototype chain: when targeting older runtimes, extending
    // built-ins like Error otherwise breaks `instanceof`.
    Object.setPrototypeOf(this, LetterboxdRssError.prototype);
  }
}
