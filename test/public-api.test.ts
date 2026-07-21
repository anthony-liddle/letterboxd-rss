import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
// Imported from the package entry point, not the individual modules, so this
// file exercises the surface a consumer actually gets.
import { getDiary, parseDiary } from '../src/index.js';

const fixture = readFileSync(
  new URL('./fixtures/sparklebeard.rss', import.meta.url),
  'utf8',
);

const DIARY_ENTRY_KEYS = [
  'film',
  'year',
  'rating',
  'liked',
  'rewatch',
  'watchedDate',
  'publishedDate',
  'posterUrl',
  'review',
  'tmdbId',
  'link',
];

describe('parseDiary called directly, without getDiary', () => {
  it('parses the fixture with no network access at all', () => {
    // No fetch stub anywhere in this test: parseDiary is pure and synchronous,
    // which is the whole point of exposing it separately from getDiary.
    const entries = parseDiary(fixture);

    expect(entries).toHaveLength(50);
  });

  it('returns entries carrying exactly the documented eleven fields', () => {
    const entries = parseDiary(fixture);

    for (const entry of entries) {
      expect(Object.keys(entry).sort()).toEqual([...DIARY_ENTRY_KEYS].sort());
    }
  });

  it('produces a fully normalized entry (Good Will Hunting)', () => {
    const entry = parseDiary(fixture).find(
      (e) => e.film === 'Good Will Hunting',
    );

    expect(entry).toEqual({
      film: 'Good Will Hunting',
      year: 1997,
      rating: null,
      liked: false,
      rewatch: true,
      watchedDate: '2026-01-10',
      publishedDate: '2026-01-11T02:56:22.000Z',
      posterUrl:
        'https://a.ltrbxd.com/resized/film-poster/5/1/6/2/1/51621-good-will-hunting-0-600-0-900-crop.jpg?v=acb4766abd',
      review: 'I fell asleep',
      tmdbId: '489',
      link: 'https://letterboxd.com/sparklebeard/film/good-will-hunting/',
    });
  });

  it('agrees with getDiary entry for entry on the same bytes', async () => {
    // The contract of the split: getDiary is fetch plus error mapping around
    // parseDiary, and adds nothing to the parsed result. If these ever diverge,
    // one of the two paths has grown behavior the other lacks.
    const fakeFetch = vi.fn(
      async (): Promise<Response> => new Response(fixture, { status: 200 }),
    );

    const viaGetDiary = await getDiary('sparklebeard', { fetch: fakeFetch });
    const viaParseDiary = parseDiary(fixture);

    expect(viaGetDiary).toEqual(viaParseDiary);
  });
});
