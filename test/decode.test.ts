import { describe, expect, it } from 'vitest';
import { decodeEntities } from '../src/decode.js';

describe('decodeEntities', () => {
  it('decodes the five named XML entities', () => {
    expect(decodeEntities('a &amp; b')).toBe('a & b');
    expect(decodeEntities('&lt;tag&gt;')).toBe('<tag>');
    expect(decodeEntities('say &quot;hi&quot;')).toBe('say "hi"');
    expect(decodeEntities('it&apos;s')).toBe("it's");
  });

  it('decodes decimal numeric references (the apostrophe in the fixture)', () => {
    expect(decodeEntities('My Best Friend&#039;s Wedding')).toBe(
      "My Best Friend's Wedding",
    );
  });

  it('decodes hex numeric references', () => {
    expect(decodeEntities('it&#x27;s')).toBe("it's");
  });

  it('decodes astral-plane code points', () => {
    expect(decodeEntities('grin &#x1F600;')).toBe('grin \u{1F600}');
  });

  it('treats an escaped ampersand literally rather than re-expanding it', () => {
    expect(decodeEntities('&amp;#039;')).toBe('&#039;');
  });

  it('leaves unknown named entities untouched', () => {
    expect(decodeEntities('a&nbsp;b')).toBe('a&nbsp;b');
  });

  it('carries real Unicode through verbatim', () => {
    expect(decodeEntities('Chapter 3 – Parabellum')).toBe(
      'Chapter 3 – Parabellum',
    );
  });
});
