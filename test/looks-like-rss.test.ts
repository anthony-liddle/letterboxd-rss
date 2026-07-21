import { describe, expect, it } from 'vitest';
import { looksLikeRss } from '../src/parse.js';

// looksLikeRss is the gate that decides between "this is a feed" and the
// not-rss error. It is a deliberately cheap structural heuristic, not a parser,
// so these cases pin both what it catches and where it is known to be fooled.
describe('looksLikeRss', () => {
  it('rejects an empty string', () => {
    expect(looksLikeRss('')).toBe(false);
  });

  it('rejects a whitespace-only body', () => {
    expect(looksLikeRss('   \n\t  ')).toBe(false);
  });

  it('rejects HTML that only mentions rss as prose', () => {
    expect(
      looksLikeRss('<html><body>Subscribe to my rss feed</body></html>'),
    ).toBe(false);
  });

  it('rejects an HTML page that merely links to a feed', () => {
    // The common shape of Letterboxd's own error page: it advertises a feed via
    // <link type="application/rss+xml"> without being one.
    expect(
      looksLikeRss(
        '<html><head><link rel="alternate" type="application/rss+xml" href="/feed/"></head></html>',
      ),
    ).toBe(false);
  });

  it('requires a delimiter after the tag name', () => {
    // "<rsschannel>" is neither an rss nor a channel element, and the [\s>]
    // guard in the pattern is what keeps it out.
    expect(looksLikeRss('<rsschannel></rsschannel>')).toBe(false);
  });

  it('accepts a real rss root', () => {
    expect(
      looksLikeRss(
        '<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>',
      ),
    ).toBe(true);
  });

  it('accepts a bare channel element with no rss root', () => {
    // Documented as intentional: the check is an either/or, so a channel alone
    // is enough to pass the gate.
    expect(looksLikeRss('<channel><title>x</title></channel>')).toBe(true);
  });

  it('is fooled by a literal rss tag inside an attribute (known limitation)', () => {
    // Pinning current behavior rather than endorsing it. The heuristic is a
    // substring test, so an unescaped "<rss>" anywhere, including inside an
    // attribute value, reads as a feed. Harmless in practice because the body
    // then fails to yield items and parseDiary returns [], but worth recording
    // so a future tightening is a deliberate change and not an accident.
    expect(looksLikeRss('<html><div data-template="<rss>"></div></html>')).toBe(
      true,
    );
  });
});
