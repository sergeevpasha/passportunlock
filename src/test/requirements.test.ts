import { describe, expect, it } from 'vitest';
import type { VisaMatrix } from '#shared/passports';
import {
  approvalKind,
  indexNotes,
  isGovernmentHost,
  notesFor,
  officialSiteCandidates,
  parseNotes,
  parseOfficialSites,
  parseVisaPages,
} from '#shared/requirements';
import { visaPages } from '#shared/visa-pages';
import { wikipediaPages } from '#shared/wikipedia-pages';
import wikipedia from '../server/data/2026-10-05.json';

describe('visa requirements', () => {
  it('links an official site only for entry types that need an approval', () => {
    expect(approvalKind('eta')).toBe('eta');
    expect(approvalKind('e-visa')).toBe('e-visa');
    expect(approvalKind('visa on arrival')).toBe('visa on arrival');
    expect(approvalKind('visa required')).toBe('visa required');
    expect(approvalKind('visa free')).toBeUndefined();
    expect(approvalKind('no admission')).toBeUndefined();
    expect(approvalKind('unknown')).toBeUndefined();
  });

  it('counts only the destination government’s own domains as official', () => {
    expect(isGovernmentHost('www.evisa.gov.bh', 'BH')).toBe(true);
    expect(isGovernmentHost('voyage.gouv.tg', 'TG')).toBe(true);
    expect(isGovernmentHost('k-eta.go.kr', 'KR')).toBe(true);
    expect(isGovernmentHost('immigration.govt.nz', 'NZ')).toBe(true);
    expect(isGovernmentHost('visas.cancilleria.gob.bo', 'BO')).toBe(true);
    expect(isGovernmentHost('evisa.mfa.am', 'AM')).toBe(true);
    expect(isGovernmentHost('evisa.e-gov.kg', 'KG')).toBe(true);
    expect(isGovernmentHost('esta.cbp.dhs.gov', 'US')).toBe(true);
    expect(isGovernmentHost('www.gov.uk', 'GB')).toBe(true);
    expect(isGovernmentHost('www.canada.ca', 'CA')).toBe(true);
    expect(isGovernmentHost('sem.admin.ch', 'CH')).toBe(true);
    // Look-alikes, another country's site and a government name inside someone else's domain.
    expect(isGovernmentHost('evisamada-mg.com', 'MG')).toBe(false);
    expect(isGovernmentHost('evisa.gov.ly', 'MG')).toBe(false);
    expect(isGovernmentHost('esta.cbp.dhs.gov', 'GB')).toBe(false);
    expect(isGovernmentHost('evisa.gov.bh.example.com', 'BH')).toBe(false);
    expect(isGovernmentHost('canada.ca.example.com', 'CA')).toBe(false);
    expect(isGovernmentHost('mygov.bh', 'BH')).toBe(false);
  });

  it('picks the government site that enough passports’ rules cite, for the approval each rule needs', () => {
    const passports = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF'];
    const matrix: VisaMatrix = Object.fromEntries(
      passports.map((code, index) => [
        code,
        {
          // Five passports need a visa, one an eTA; visa-free rules cite treaties, which don't count.
          BH: { status: index < 5 ? 'e-visa' : 'eta' },
          KH: { status: 'visa on arrival' },
          KR: { status: 'visa free' },
        },
      ])
    );
    const cited = Object.fromEntries(
      passports.map((code, index) => [
        code,
        {
          BH: [
            // The same page however it is spelled.
            ['https://www.evisa.gov.bh/', 'http://evisa.gov.bh', 'https://evisa.gov.bh/#/'][index % 3]!,
            `https://www.evisa.gov.bh/countries-${index}.html`,
            'https://evisa-bahrain.example.com/',
          ],
          KH: ['https://www.evisa.gov.kh'],
          KR: ['https://www.mofa.go.kr/treaty.pdf'],
        },
      ])
    );
    expect(officialSiteCandidates(cited, matrix)).toEqual({
      BH: { 'e-visa': [{ citations: 5, urls: ['https://www.evisa.gov.bh/'] }] },
      KH: { 'visa on arrival': [{ citations: 6, urls: ['https://www.evisa.gov.kh/'] }] },
    });
    // Each entry type counts its own rules: the one passport that needs an eTA doesn't add to the eVisa's count.
    expect(officialSiteCandidates(cited, matrix, 1).BH?.eta).toEqual([
      { citations: 1, urls: ['https://evisa.gov.bh/', 'https://www.evisa.gov.bh/countries-5.html'] },
    ]);
    // Pages that enough passports cite come first, then the home page; with too few behind each, only the home page.
    const deep = Object.fromEntries(
      passports.map((code, index) => [code, { BH: [`https://www.evisa.gov.bh/apply-${index % 2}`] }])
    );
    expect(officialSiteCandidates(deep, matrix, 2).BH).toEqual({
      'e-visa': [
        {
          citations: 5,
          urls: ['https://www.evisa.gov.bh/apply-0', 'https://www.evisa.gov.bh/apply-1', 'https://www.evisa.gov.bh/'],
        },
      ],
    });
    expect(officialSiteCandidates(deep, matrix, 4).BH).toEqual({
      'e-visa': [{ citations: 5, urls: ['https://www.evisa.gov.bh/'] }],
    });
  });

  it('stores each note once and reads them back in order', () => {
    const notes = indexNotes({
      IN: { LA: ['Visa on arrival at Vientiane.', 'e-Visa also available.'], MX: [] },
      NG: { LA: ['e-Visa also available.'] },
    });
    expect(notes).toEqual({
      texts: ['Visa on arrival at Vientiane.', 'e-Visa also available.'],
      rules: { IN: { LA: [0, 1] }, NG: { LA: [1] } },
    });
    expect(notesFor(notes, 'IN', 'LA')).toEqual(['Visa on arrival at Vientiane.', 'e-Visa also available.']);
    expect(notesFor(notes, 'IN', 'MX')).toEqual([]);
    expect(notesFor(undefined, 'IN', 'LA')).toEqual([]);
  });

  it('rejects stored notes and sites that are malformed or point anywhere else', () => {
    const codes = ['IN', 'LA', 'BH'];
    const notes = { texts: ['Visa on arrival at Vientiane.'], rules: { IN: { LA: [0] } } };
    expect(parseNotes(notes, codes)).toEqual(notes);
    expect(() => parseNotes({ texts: ['{{yes|Visa}}'], rules: {} }, codes)).toThrow('Invalid note text');
    expect(() => parseNotes({ ...notes, rules: { IN: { LA: [1] } } }, codes)).toThrow('Invalid notes: IN → LA');
    expect(() => parseNotes({ ...notes, rules: { IN: { IN: [0] } } }, codes)).toThrow('Invalid notes: IN');
    expect(() => parseNotes({ ...notes, rules: { XX: { LA: [0] } } }, codes)).toThrow('Invalid notes: XX');
    const site = { url: 'https://www.evisa.gov.bh/', citations: 132 };
    const sites = { BH: { 'e-visa': site, 'visa on arrival': site } };
    expect(parseOfficialSites(sites, codes)).toEqual(sites);
    expect(() =>
      parseOfficialSites({ BH: { 'e-visa': { url: 'https://evisa-bahrain.com/', citations: 9 } } }, codes)
    ).toThrow('Invalid official site: BH e-visa');
    expect(() => parseOfficialSites({ BH: { 'e-visa': { url: 'javascript:alert(1)', citations: 9 } } }, codes)).toThrow(
      'Invalid official site'
    );
    expect(() => parseOfficialSites({ BH: { 'e-visa': { ...site, citations: 0 } } }, codes)).toThrow(
      'Invalid official site'
    );
    expect(() => parseOfficialSites({ BH: { visa: site } }, codes)).toThrow('Invalid official site: BH visa');
    expect(() => parseOfficialSites({ XX: sites.BH }, codes)).toThrow('Invalid official sites: XX');
  });

  it('keeps one secure official visa page per known destination, and ships only pages from that list', () => {
    const codes = Object.keys(wikipediaPages);
    expect(parseVisaPages(visaPages, codes)).toEqual(visaPages);
    for (const url of Object.values(visaPages)) expect(new URL(url).protocol).toBe('https:');
    expect(new Set(Object.values(visaPages)).size).toBe(Object.keys(visaPages).length);
    for (const [destination, url] of Object.entries(wikipedia.visaPages ?? {}))
      expect(visaPages[destination]).toBe(url);
    expect(() => parseVisaPages({ XX: 'https://example.gov/' }, codes)).toThrow('Invalid visa page: XX');
    expect(() => parseVisaPages({ GB: 'javascript:alert(1)' }, codes)).toThrow('Invalid visa page: GB');
  });
});
