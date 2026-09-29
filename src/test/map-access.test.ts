import { describe, expect, it } from 'vitest';
import { mapAccess } from '../shared/map-access';
import { worldCountries } from '../app/utils/world-map';

describe('map access', () => {
  it('shows the entry type, and the easiest one with any passport when combined', () => {
    expect(mapAccess([{ status: 'e-visa' }], 0)).toBe('e-visa');
    expect(mapAccess([{ status: 'visa required' }, { status: 'visa free' }], 0)).toBe('visa required');
    expect(mapAccess([{ status: 'visa required' }, { status: 'visa free' }], 'combined')).toBe('visa free');
    expect(
      mapAccess([{ status: 'e-visa' }, { status: 'visa on arrival' }, { status: 'no admission' }], 'combined')
    ).toBe('visa on arrival');
    expect(mapAccess([{ status: 'domestic' }, { status: 'visa free' }], 'combined')).toBe('home');
  });
  it('never shows a missing or unconfirmed rule as access', () => {
    expect(mapAccess(undefined, 0)).toBe('unknown');
    expect(mapAccess([{ status: 'visa free' }], 1)).toBe('unknown');
    expect(mapAccess([{ status: 'unknown' }], 0)).toBe('unknown');
    // An unconfirmed rule might be easier than an eVisa, but nothing is easier than visa-free.
    expect(mapAccess([{ status: 'unknown' }, { status: 'e-visa' }], 'combined')).toBe('unknown');
    expect(mapAccess([{ status: 'unknown' }, { status: 'visa free' }], 'combined')).toBe('visa free');
  });
  it('joins geography to passport codes without assigning unrelated disputed areas', () => {
    for (const [id, code] of [
      ['JPN', 'JP'],
      ['FRA', 'FR'],
      ['NOR', 'NO'],
      ['KOS', 'XK'],
      ['SDS', 'SS'],
      ['RUS', 'RU'],
      ['TWN', 'TW'],
    ]) {
      expect(worldCountries.find(country => country.id === id)?.code).toBe(code);
    }
    expect(worldCountries.find(country => country.id === 'SOL')?.code).toBeUndefined();
    expect(worldCountries.every(country => country.path && country.centroid.every(Number.isFinite))).toBe(true);
  });
});
