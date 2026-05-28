import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDiary } from '../src/parse.js';

// A synthetic feed (not the real fixture) whose single review exercises all five
// formatting tags Letterboxd reviews support: <strong>, <b>, <em>, <i>, and
// <a href>, plus <blockquote>.
const fixture = readFileSync(
  new URL('./fixtures/review-formatting.rss', import.meta.url),
  'utf8',
);

describe('review HTML stripping', () => {
  it('drops every supported tag while keeping inner text and link text', () => {
    const [entry] = parseDiary(fixture);
    expect(entry?.review).toBe(
      'This is bold and also bold, with emphasis and italics. Read my full review for more. A memorable quote.',
    );
  });

  it('leaves no tag, attribute, or URL residue in the review', () => {
    const review = parseDiary(fixture)[0]?.review ?? '';
    expect(review).not.toContain('<');
    expect(review).not.toContain('>');
    expect(review).not.toContain('href');
    expect(review).not.toContain('http');
    expect(review).not.toContain('example.com');
  });
});
