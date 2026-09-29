import { describe, expect, it } from 'vitest';
import { comparisonQuery, matchesCountry, passportCatalogue, rankPassports } from '#shared/catalogue';
import { comparisonCsv } from '~/utils/export-comparison';
import wikipedia from '../server/data/2026-09-28.json';
import { parseMatrix } from '#shared/passports';

describe('passport catalogue', () => {
  it('assigns stable competition ranks without mutating the source', () => {
    const input = [
      { name: 'Z', visaFree: 90 },
      { name: 'B', visaFree: 100 },
      { name: 'A', visaFree: 100 },
    ];
    expect(rankPassports(input).map(item => [item.name, item.rank])).toEqual([
      ['A', 1],
      ['B', 1],
      ['Z', 3],
    ]);
    expect(input[0]!.name).toBe('Z');
    expect(rankPassports([])).toEqual([]);
  });
  it('covers every supported passport and counts only international visa-free rules', () => {
    const matrix = parseMatrix(wikipedia.matrix, undefined, { complete: false });
    const catalogue = passportCatalogue(matrix);
    expect(catalogue).toHaveLength(199);
    for (const passport of catalogue) {
      expect(passport.total).toBe(198);
      expect(passport.visaFree).toBe(
        Object.values(matrix[passport.code]!).filter(rule => rule.status === 'visa free').length
      );
    }
  });
  it('combines region filters with case-insensitive name and ISO-code search', () => {
    const country = { code: 'NZ', code3: 'NZL', name: 'New Zealand', region: 'Oceania' };
    expect(matchesCountry(country, ' nzl ', 'Oceania')).toBe(true);
    expect(matchesCountry(country, 'zealand')).toBe(true);
    expect(matchesCountry(country, 'NZ', 'Europe')).toBe(false);
    expect(matchesCountry(country, 'not a country')).toBe(false);
  });
  it('serializes unique passport selections in order and caps them at three', () => {
    expect(comparisonQuery(['NZ', 'NZ', 'US', 'DE', 'SG'])).toEqual({ p1: 'nz', p2: 'us', p3: 'de' });
  });
});

describe('comparison export', () => {
  it('preserves snapshot provenance and licence, statuses and stay durations, and escapes CSV quotes', () => {
    const csv = comparisonCsv(
      [
        {
          name: 'New Zealand',
          snapshot: {
            sourceDate: '2026-09-28',
            source: 'Wikipedia: visa requirements by nationality',
            license: 'CC BY-SA 4.0',
          },
        },
        { name: 'Russia', snapshot: { sourceDate: '2026-10-05', source: 'Custom source' } },
      ],
      [
        { name: 'A "quoted" destination', rules: [{ status: 'visa free', days: 90 }, { status: 'visa required' }] },
        { name: 'Authorization', rules: [{ status: 'eta' }, { status: 'eta' }] },
      ]
    );
    expect(csv).toContain('New Zealand (2026-09-28; Wikipedia: visa requirements by nationality; CC BY-SA 4.0)');
    expect(csv).toContain('Russia (2026-10-05; Custom source)');
    expect(csv).toContain('"A ""quoted"" destination","Visa-free; 90 days","Visa required"');
    expect(csv).toContain('"Authorization","eTA required","eTA required"');
  });
});
