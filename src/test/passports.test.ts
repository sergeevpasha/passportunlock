import { describe, expect, it } from 'vitest';
import {
  changedRules,
  comparisonStats,
  countsFor,
  easiestRules,
  isVisaFree,
  matchesComparisonFilter,
  parseMatrix,
  ruleFor,
  rulesDiffer,
  sourceAgeDays,
  type EntryRule,
} from '#shared/passports';
import { countryRegion } from '#shared/countries';
import wikipedia from '../server/data/2026-09-28.json';
import { coverageIssues, publicationIssues } from '#shared/sync-policy';
import { wikipediaPages } from '#shared/wikipedia-pages';

const codes = Object.keys(wikipediaPages);

describe('passport data integrity', () => {
  it('ships a Wikipedia snapshot of all 199 passports that records its article revisions', () => {
    const matrix = parseMatrix(wikipedia.matrix, codes, { complete: false });
    expect(Object.keys(matrix)).toHaveLength(199);
    expect(Object.keys(matrix).filter(code => countryRegion(code) === 'Other')).toEqual([]);
    expect(wikipedia.license).toBe('CC BY-SA 4.0');
    expect(Object.keys(wikipedia.pages).sort()).toEqual([...codes].sort());
    for (const [code, page] of Object.entries(wikipedia.pages)) expect(page.title).toBe(wikipediaPages[code]);
    // Destinations an article leaves out are absent, never filled in from another source.
    expect(wikipedia).not.toHaveProperty('fallback');
    const listed = Object.values(matrix).flatMap(Object.keys).length;
    expect(listed).toBeLessThan(39402);
    expect(listed / 39402).toBeGreaterThan(0.98);
  });
  it('rejects malformed and unrecognized data, and allows gaps only when asked', () => {
    const partial = { NZ: { RU: { status: 'visa free' } }, RU: {} };
    expect(() => parseMatrix(partial)).toThrow('Incomplete destination coverage');
    expect(parseMatrix(partial, ['RU', 'NZ'], { complete: false })).toEqual(partial);
    expect(() => parseMatrix({ NZ: { NZ: { status: 'visa free' } }, RU: {} }, undefined, { complete: false })).toThrow(
      'Invalid destination coverage'
    );
    expect(() => parseMatrix({ NZ: { XX: { status: 'visa free' } }, RU: {} }, undefined, { complete: false })).toThrow(
      'Invalid destination coverage'
    );
    expect(() => parseMatrix({ NZ: { RU: { status: 'new status' } }, RU: { NZ: { status: 'visa free' } } })).toThrow(
      'Unrecognized'
    );
    expect(() => parseMatrix(wikipedia.matrix, ['NZ', 'RU'], { complete: false })).toThrow('coverage');
  });
  it('keeps unknown, domestic, eTA and eVisa separate from visa-free access', () => {
    const matrix = parseMatrix({ NZ: { RU: { status: 'visa free', days: 90 } }, RU: {} }, undefined, {
      complete: false,
    });
    expect(ruleFor(matrix, 'NZ', 'NZ').status).toBe('domestic');
    expect(ruleFor(matrix, 'RU', 'NZ').status).toBe('unknown');
    expect(ruleFor(matrix, 'XX', 'NZ').status).toBe('unknown');
    expect(isVisaFree({ status: 'eta' })).toBe(false);
    expect(isVisaFree({ status: 'e-visa' })).toBe(false);
    expect(isVisaFree({ status: 'domestic' })).toBe(false);
    expect(countsFor(matrix, 'NZ')['visa free']).toBe(1);
    expect(Object.values(countsFor(matrix, 'RU')).reduce((a, b) => a + b, 0)).toBe(0);
  });
  it('detects stay changes within a category and rules that appear or disappear', () => {
    expect(
      rulesDiffer([
        { status: 'visa free', days: 30 },
        { status: 'visa free', days: 90 },
      ])
    ).toBe(true);
    const before = { NZ: { RU: { status: 'visa free' as const, days: 30 }, JP: { status: 'visa free' as const } } };
    const after = { NZ: { RU: { status: 'visa free' as const, days: 90 }, US: { status: 'eta' as const } } };
    expect(changedRules(before, after)).toEqual([
      {
        passport: 'NZ',
        destination: 'RU',
        before: { status: 'visa free', days: 30 },
        after: { status: 'visa free', days: 90 },
      },
      { passport: 'NZ', destination: 'JP', before: { status: 'visa free' }, after: { status: 'unknown' } },
      { passport: 'NZ', destination: 'US', before: { status: 'unknown' }, after: { status: 'eta' } },
    ]);
    expect(changedRules(after, after)).toEqual([]);
  });
  it('counts whole days since the source date', () => {
    expect(sourceAgeDays('2026-09-01', new Date('2026-09-28T12:00:00Z'))).toBe(27);
    expect(() => sourceAgeDays('invalid')).toThrow();
  });
  it('unions multiple passports once, excludes home countries and never counts an eTA as visa-free', () => {
    const stats = comparisonStats(
      [
        { code: 'NZ', rules: [{ status: 'domestic' }, { status: 'visa free' }] },
        { code: 'RU', rules: [{ status: 'visa free' }, { status: 'domestic' }] },
        { code: 'JP', rules: [{ status: 'visa free' }, { status: 'visa free' }] },
        { code: 'CN', rules: [{ status: 'visa required' }, { status: 'visa free' }] },
        { code: 'US', rules: [{ status: 'eta' }, { status: 'unknown' }] },
      ],
      ['NZ', 'RU']
    );
    expect(stats).toEqual({ shared: 1, combined: 2, additional: 1, differences: 4 });
    expect(comparisonStats([], []).combined).toBe(0);
  });
  it('uses the same destination predicates for filters and summary counts', () => {
    const rows: { code: string; rules: EntryRule[] }[] = [
      { code: 'NZ', rules: [{ status: 'domestic' }, { status: 'visa free' }] },
      {
        code: 'JP',
        rules: [
          { status: 'visa free', days: 30 },
          { status: 'visa free', days: 90 },
        ],
      },
      { code: 'CN', rules: [{ status: 'visa required' }, { status: 'visa free' }] },
      { code: 'US', rules: [{ status: 'eta' }, { status: 'unknown' }] },
      { code: 'DE', rules: [{ status: 'visa free' }, { status: 'visa free' }] },
      { code: 'FR', rules: [] },
    ];
    const passports = ['NZ', 'RU'];
    const expected = {
      all: ['NZ', 'JP', 'CN', 'US', 'DE', 'FR'],
      different: ['NZ', 'JP', 'CN', 'US'],
      shared: ['JP', 'DE'],
      combined: ['JP', 'CN', 'DE'],
    };
    for (const filter of ['all', 'different', 'shared', 'combined'] as const) {
      expect(rows.filter(row => matchesComparisonFilter(row, passports, filter)).map(row => row.code)).toEqual(
        expected[filter]
      );
    }
    expect(comparisonStats(rows, passports)).toEqual({ shared: 2, combined: 3, additional: 1, differences: 4 });
  });
  it('marks the easiest way in only where the passports really differ', () => {
    expect(easiestRules([{ status: 'visa on arrival', days: 30 }, { status: 'visa free' }])).toEqual([1]);
    expect(
      easiestRules([
        { status: 'visa free', days: 90 },
        { status: 'visa free', days: 365 },
      ])
    ).toEqual([1]);
    expect(
      easiestRules([{ status: 'visa free', days: 90 }, { status: 'visa free', days: 90 }, { status: 'e-visa' }])
    ).toEqual([0, 1]);
    // A missing stay can't be compared with a stated one, and identical rules aren't a difference.
    expect(easiestRules([{ status: 'visa free' }, { status: 'visa free', days: 90 }])).toEqual([]);
    expect(easiestRules([{ status: 'eta' }, { status: 'eta' }])).toEqual([]);
    // Home countries and unconfirmed rules are never the easiest, and don't count as a difference.
    expect(easiestRules([{ status: 'domestic' }, { status: 'visa free' }])).toEqual([]);
    expect(easiestRules([{ status: 'unknown' }, { status: 'e-visa' }, { status: 'visa required' }])).toEqual([1]);
    expect(easiestRules([])).toEqual([]);
  });
  it('holds back Wikipedia snapshots with missing or thin articles or too many missing rules', () => {
    expect(coverageIssues({ missingPages: [], thinPages: [], missingCells: 84, total: 39402 })).toEqual([]);
    expect(coverageIssues({ missingPages: ['NZ'], thinPages: ['RU (12)'], missingCells: 900, total: 39402 })).toEqual([
      'Articles not found: NZ',
      'Articles with too few destinations: RU (12)',
      'More than 2% of rules are missing from Wikipedia',
    ]);
  });
  it('holds stale, future, backward, undated-change and large-delta candidates for review', () => {
    const now = new Date('2026-09-28T00:00:00Z');
    expect(publicationIssues('2026-09-01', '2026-09-01', 0, 39402, now)).toContain('Source date is stale');
    expect(publicationIssues('2026-10-01', '2026-09-27', 0, 39402, now)).toContain('Source date is in the future');
    expect(publicationIssues('2026-09-26', '2026-09-27', 0, 39402, now)).toContain('Source date moved backwards');
    expect(publicationIssues('2026-09-27', '2026-09-27', 1, 39402, now)).toContain(
      'Rules changed without a new source date'
    );
    expect(publicationIssues('2026-09-28', '2026-09-27', 3000, 39402, now)).toContain(
      'More than 5% of rules changed; human review required'
    );
    expect(publicationIssues('2026-09-28', '2026-09-27', 1, 39402, now)).toEqual([]);
    // The first snapshot has nothing to compare with, so every rule is new and needs review.
    expect(publicationIssues('2026-09-28', undefined, 39318, 39402, now)).toEqual([
      'More than 5% of rules changed; human review required',
    ]);
  });
});
