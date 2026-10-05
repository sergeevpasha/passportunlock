import { describe, expect, it } from 'vitest';
import {
  byRank,
  destinationCatalogue,
  matchesCountry,
  passportCatalogue,
  rankBy,
  rankOf,
  scoreOf,
} from '#shared/catalogue';
import { comparisonCsv } from '~/utils/export-comparison';
import wikipedia from '../server/data/2026-10-05.json';
import { destinationCountsFor, parseMatrix, ruleFor } from '#shared/passports';

describe('passport catalogue', () => {
  it('assigns stable competition ranks without mutating the source', () => {
    const input = [
      { name: 'Z', visaFree: 90 },
      { name: 'B', visaFree: 100 },
      { name: 'A', visaFree: 100 },
    ];
    expect(rankBy(input, item => item.visaFree).map(item => [item.name, item.rank])).toEqual([
      ['A', 1],
      ['B', 1],
      ['Z', 3],
    ]);
    expect(input[0]!.name).toBe('Z');
    expect(rankBy([], () => 0)).toEqual([]);
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
  it('combines region and group filters with case-insensitive name and ISO-code search', () => {
    const country = { code: 'NZ', code3: 'NZL', name: 'New Zealand' };
    expect(matchesCountry(country, ' nzl ', 'oceania')).toBe(true);
    expect(matchesCountry(country, 'zealand')).toBe(true);
    expect(matchesCountry(country, 'zealand', 'commonwealth')).toBe(true);
    expect(matchesCountry(country, 'NZ', 'europe')).toBe(false);
    expect(matchesCountry(country, '', 'eu')).toBe(false);
    expect(matchesCountry(country, '', 'not a group')).toBe(false);
    expect(matchesCountry(country, 'not a country')).toBe(false);
  });
  it('scores passports by mobility too: visa-free, visas on arrival and eTAs, never eVisas', () => {
    const matrix = parseMatrix(wikipedia.matrix, undefined, { complete: false });
    const catalogue = passportCatalogue(matrix);
    for (const passport of catalogue) {
      const rules = Object.values(matrix[passport.code]!);
      expect(passport.mobility).toBe(
        rules.filter(rule => ['visa free', 'visa on arrival', 'eta'].includes(rule.status)).length
      );
      expect(passport.mobility).toBeGreaterThanOrEqual(passport.visaFree);
    }
    const byMobility = [...catalogue].sort(byRank('mobility'));
    expect(byMobility[0]!.mobilityRank).toBe(1);
    for (const [index, passport] of byMobility.entries()) {
      if (index) expect(scoreOf(passport, 'mobility')).toBeLessThanOrEqual(scoreOf(byMobility[index - 1]!, 'mobility'));
      expect(rankOf(passport, 'mobility')).toBe(
        1 + byMobility.filter(other => other.mobility > passport.mobility).length
      );
    }
  });
  it('scores each destination by the passports it admits, from the same rules read the other way', () => {
    const matrix = parseMatrix(wikipedia.matrix, undefined, { complete: false });
    const destinations = destinationCatalogue(matrix);
    expect(destinations).toHaveLength(199);
    for (const destination of destinations) {
      const passports = Object.keys(matrix).filter(code => code !== destination.code);
      const rules = passports.map(passport => ruleFor(matrix, passport, destination.code));
      expect(destination.total).toBe(198);
      expect(destination.visaFree).toBe(rules.filter(rule => rule.status === 'visa free').length);
      const counts = destinationCountsFor(matrix, destination.code);
      expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(198);
      expect(destination.mobility).toBe(counts['visa free'] + counts['visa on arrival'] + counts.eta);
    }
    // A missing rule is counted as not confirmed, never as a way in.
    expect(destinationCountsFor(matrix, 'PS').unknown).toBeGreaterThan(0);
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
