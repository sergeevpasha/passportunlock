import { describe, expect, it } from 'vitest';
import { countryGroups, countryNameInText, countryRegion, inCountryGroup, regionGroups } from '#shared/countries';
import {
  countryFromSegment,
  countrySlug,
  countrySlugs,
  destinationPath,
  entryPath,
  passportPath,
} from '#shared/country-paths';
import wikipedia from '../server/data/2026-09-28.json';

const codes = Object.keys(wikipedia.matrix);

describe('country addresses', () => {
  it('gives every passport in the dataset one unique, lowercase slug', () => {
    expect(Object.keys(countrySlugs).sort()).toEqual([...codes].sort());
    const slugs = Object.values(countrySlugs);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(countrySlug('ci')).toBe('cote-divoire');
    expect(countrySlug('ST')).toBe('sao-tome-and-principe');
  });
  it('reads a slug or an ISO code, and marks everything but the lowercase slug for a redirect', () => {
    expect(countryFromSegment('japan')).toEqual({ code: 'JP', canonical: true });
    expect(countryFromSegment('Japan')).toEqual({ code: 'JP', canonical: false });
    expect(countryFromSegment('jp')).toEqual({ code: 'JP', canonical: false });
    expect(countryFromSegment('XK')).toEqual({ code: 'XK', canonical: false });
    for (const segment of ['atlantis', 'xx', '', 'constructor', '__proto__', undefined, ['jp']])
      expect(countryFromSegment(segment)).toBeUndefined();
  });
  it('builds passport, destination and entry paths from slugs', () => {
    expect(passportPath('NZ')).toBe('/passports/new-zealand');
    expect(destinationPath('JP')).toBe('/destinations/japan');
    expect(entryPath('US', 'de')).toBe('/destinations/united-states/germany');
  });
  it('adds "the" only to names that need it in a sentence', () => {
    expect(countryNameInText('US')).toBe('the United States');
    expect(countryNameInText('NL', 'Netherlands')).toBe('the Netherlands');
    expect(countryNameInText('JP')).toBe('Japan');
  });
});

describe('country groups', () => {
  it('lists the regions first, then groups whose members are all in the dataset', () => {
    expect(countryGroups.slice(0, 5).map(group => group.label)).toEqual(Object.keys(regionGroups));
    const sizes = Object.fromEntries(countryGroups.map(group => [group.id, group.codes.size]));
    expect(sizes).toMatchObject({
      eu: 27,
      schengen: 29,
      gcc: 6,
      'arab-league': 22,
      asean: 11,
      commonwealth: 56,
      g7: 7,
      g20: 19,
      oecd: 38,
      brics: 10,
      mercosur: 5,
      caricom: 14,
      ecowas: 12,
      eac: 8,
      eaeu: 5,
    });
    expect(new Set(countryGroups.map(group => group.id)).size).toBe(countryGroups.length);
    for (const group of countryGroups) for (const code of group.codes) expect(codes).toContain(code);
  });
  it('filters by region or group membership', () => {
    expect(inCountryGroup('NO', 'schengen')).toBe(true);
    expect(inCountryGroup('NO', 'eu')).toBe(false);
    expect(inCountryGroup('CY', 'schengen')).toBe(false);
    expect(inCountryGroup('TL', 'asean')).toBe(true);
    expect(inCountryGroup('SA', 'brics')).toBe(false);
    expect(inCountryGroup('SA', 'all')).toBe(true);
    for (const code of codes) expect(inCountryGroup(code, countryRegion(code).toLowerCase())).toBe(true);
  });
});
