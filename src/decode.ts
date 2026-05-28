const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/**
 * Decode the XML entities that appear in a Letterboxd feed: the five named
 * entities (`&amp; &lt; &gt; &quot; &apos;`) plus numeric character references
 * in decimal (`&#039;`) and hex (`&#x27;`) form.
 *
 * The replace pass consumes each match once, left to right, so a literal escaped
 * ampersand like `&amp;#039;` decodes to `&#039;` rather than being re-expanded.
 * Unknown named entities are left untouched, and out-of-range numeric references
 * are passed through verbatim rather than throwing.
 */
export function decodeEntities(input: string): string {
  return input.replace(
    /&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, body: string) => {
      if (body.charCodeAt(0) === 35 /* '#' */) {
        const code =
          body.charCodeAt(1) === 120 /* 'x' */
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
        if (Number.isNaN(code) || code < 0 || code > 0x10ffff) {
          return match;
        }
        return String.fromCodePoint(code);
      }
      const named = NAMED_ENTITIES[body];
      return named ?? match;
    },
  );
}
