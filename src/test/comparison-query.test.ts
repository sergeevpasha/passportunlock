import { describe, expect, it } from 'vitest';
import { comparisonQuery, parseComparisonQuery } from '#shared/comparison-query';

describe('comparison URLs', () => {
  it('uses the same defaults for a page or API request without adding a second passport to explicit selections', () => {
    expect(parseComparisonQuery({})).toEqual([
      { code: 'SG', snapshot: 'latest' },
      { code: 'US', snapshot: 'latest' },
    ]);
    expect(parseComparisonQuery({ p1: 'nz' })).toEqual([{ code: 'NZ', snapshot: 'latest' }]);
    expect(parseComparisonQuery({ p1: 'nz', p3: 'de', s3: '2026-09-28' })).toEqual([
      { code: 'NZ', snapshot: 'latest' },
      { code: 'DE', snapshot: '2026-09-28' },
    ]);
  });

  it('deduplicates case-insensitively and retains the first snapshot and selection order', () => {
    expect(parseComparisonQuery({ p1: 'nz', s1: '2026-09-28', p2: 'NZ', p3: 'us', p4: 'de' })).toEqual([
      { code: 'NZ', snapshot: '2026-09-28' },
      { code: 'US', snapshot: 'latest' },
    ]);
    expect(comparisonQuery(['NZ', 'nz', 'US', 'DE', 'SG'].map(code => ({ code })))).toEqual({
      p1: 'nz',
      p2: 'us',
      p3: 'de',
    });
  });

  it.each([{ p1: 'NZL' }, { p1: '' }, { p1: ['nz', 'us'] }, { p1: 1 }, { p1: 'nz', s1: ['latest'] }])(
    'rejects malformed selections: %j',
    query => expect(() => parseComparisonQuery(query)).toThrow('Choose a supported passport.')
  );

  it('preserves snapshots in share links and omits them from canonical links', () => {
    const selections = [
      { code: 'NZ', snapshot: '2026-09-28' },
      { code: 'US', snapshot: 'latest' },
    ];
    const shared = comparisonQuery(selections);
    expect(shared).toEqual({ p1: 'nz', s1: '2026-09-28', p2: 'us', s2: 'latest' });
    expect(parseComparisonQuery(shared)).toEqual(selections);
    expect(comparisonQuery(selections.map(({ code }) => ({ code })))).toEqual({ p1: 'nz', p2: 'us' });
  });
});
