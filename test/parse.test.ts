import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LetterboxdRssError } from '../src/errors.js';
import { parseDiary } from '../src/parse.js';
import type { DiaryEntry } from '../src/types.js';

const fixture = readFileSync(
  new URL('./fixtures/sparklebeard.rss', import.meta.url),
  'utf8',
);

const entries = parseDiary(fixture);

function byFilm(film: string): DiaryEntry {
  const entry = entries.find((e) => e.film === film);
  if (entry === undefined) {
    throw new Error(`fixture entry not found: ${film}`);
  }
  return entry;
}

describe('parseDiary against the real sparklebeard feed', () => {
  it('returns one entry per <item> in the feed', () => {
    expect(entries).toHaveLength(50);
  });

  it('parses a watch-only, non-rewatch entry (Roadrunner)', () => {
    const e = byFilm('Roadrunner: A Film About Anthony Bourdain');
    expect(e.year).toBe(2021);
    expect(e.rating).toBe(4.0);
    expect(e.rewatch).toBe(false);
    expect(e.review).toBeNull();
    expect(e.posterUrl).toContain('a.ltrbxd.com');
    expect(e.posterUrl).toContain('/resized/film-poster/');
  });

  it('parses an unrated rewatch that has a review (Good Will Hunting)', () => {
    const e = byFilm('Good Will Hunting');
    expect(e.rating).toBeNull();
    expect(e.rewatch).toBe(true);
    expect(e.review).toBe('I fell asleep');
  });

  it('marks a rewatch correctly (John Dies at the End)', () => {
    expect(byFilm('John Dies at the End').rewatch).toBe(true);
  });

  it('decodes the &#039; entity in film titles', () => {
    expect(byFilm("My Best Friend's Wedding").film).toBe(
      "My Best Friend's Wedding",
    );
    expect(byFilm("She's the Man").film).toBe("She's the Man");
  });

  it('preserves real Unicode (en-dash) in a film title', () => {
    expect(byFilm('John Wick: Chapter 3 – Parabellum')).toBeDefined();
  });

  it('extracts the sm/upload poster shape (Scream 2)', () => {
    const e = byFilm('Scream 2');
    expect(e.posterUrl).toContain('/resized/sm/upload/');
  });

  it('reads memberLike as a boolean both ways', () => {
    expect(byFilm("My Best Friend's Wedding").liked).toBe(true);
    expect(byFilm('Roadrunner: A Film About Anthony Bourdain').liked).toBe(
      false,
    );
  });

  it('emits watchedDate and publishedDate as distinct, correct ISO strings', () => {
    const e = byFilm('Good Will Hunting');
    expect(e.watchedDate).toBe('2026-01-10');
    expect(e.publishedDate).toBe('2026-01-11T02:56:22.000Z');
    expect(e.watchedDate).not.toBe(e.publishedDate);
  });

  it('carries tmdbId and link through', () => {
    const e = byFilm('Good Will Hunting');
    expect(e.tmdbId).toBe('489');
    expect(e.link).toBe(
      'https://letterboxd.com/sparklebeard/film/good-will-hunting/',
    );
  });

  it('never leaks "Watched on" boilerplate into any review field', () => {
    for (const e of entries) {
      if (e.review !== null) {
        expect(e.review).not.toContain('Watched on');
      }
    }
  });

  it('detects exactly the six reviewed entries', () => {
    const reviewed = entries.filter((e) => e.review !== null);
    expect(reviewed).toHaveLength(6);
    expect(reviewed.map((e) => e.film).sort()).toEqual(
      [
        'Abraham Lincoln: Vampire Hunter',
        'Alien: Covenant',
        'Good Will Hunting',
        'John Wick',
        'Lara Croft: Tomb Raider',
        'Moon',
      ].sort(),
    );
  });
});

describe('parseDiary edge cases', () => {
  it('returns [] for a valid feed with no items', () => {
    const empty =
      '<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>';
    expect(parseDiary(empty)).toEqual([]);
  });

  it('throws a not-rss LetterboxdRssError on non-feed input', () => {
    try {
      parseDiary('<html><body>nope</body></html>');
      expect.unreachable('parseDiary should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(LetterboxdRssError);
      expect((error as LetterboxdRssError).kind).toBe('not-rss');
    }
  });
});
