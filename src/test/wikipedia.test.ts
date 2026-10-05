import { describe, expect, it } from 'vitest';
import { countryRegion } from '#shared/countries';
import {
  citedLinks,
  missingSharedNotes,
  nameIndex,
  normalizeName,
  noteItems,
  notesRequireAuthorisation,
  parseVisaPage,
  requirementStatus,
  sharedNoteSections,
  stayDays,
  stripNoise,
  visibleText,
} from '#shared/wikipedia';
import { wikipediaPages } from '#shared/wikipedia-pages';

const codes = Object.keys(wikipediaPages);
const index = nameIndex(codes);

// Modelled on real articles: citations with their own pipes, attributes before status templates, sort keys, a
// colspan for the passport's own country, a rowspan shared by two destinations and a second table for territories.
const article = `
Intro text.
{| class="wikitable sortable sticky-header" style="background:#f8f9faff;"
|-
! style="width:18%;"| Country / Region
! style="width:22%;"| Visa requirement
! Allowed stay
! Notes (excluding departure fees)
! Reciprocity
|-
| {{flag|Afghanistan}}
| {{yes2|eVisa}}<ref>{{Timatic|nationality=NZ|destination=AF}}</ref><ref>{{cite web
| url=https://visaportal.example | title=Afghanistan eVisa}}</ref>
| 30 days
| style="background:#FFB;|
* e-Visa: visitors must arrive at Kabul.
| {{no}}
|-
| {{flag|Albania}}
| data-sort-value="0" {{yes|Visa not required}}<!-- checked -->
| {{sort|90|90 days}}
|
| {{no}}
|-
| {{flag|Algeria}}
| {{no|Visa required}}
|
|
| {{yes}}
|-
| {{flag|Andorra}}
| rowspan=2 {{yes|Visa not required}}
| 3 months
|
|-
| {{flag|Monaco}}
| 90 days
|
|-
| {{flag|Australia}}
| {{free|Visa not required}}
| Indefinitely
|
|-
| {{flag|Bahrain}}
| data-sort-value="1" {{Optional|eVisa / Visa on arrival}}
| 14 days
|
|-
| {{flag|United States}}
| data-sort-value="0" {{yes|{{sort|Visa not required|[[Visa Waiver Program]]}}}}
| 90 days
|
|-
| {{flag|New Zealand}}
| colspan=3 {{n/a|N/A}}
|-
| {{flag|Ivory Coast}}
| {{yes2|eVisa}}
| 3 months
|
|-
| {{flag|United Kingdom}}
| {{yes|Visa not required}}
| 6 months
|
* Electronic Travel Authorisation must be obtained via the UK ETA app before travel for all visa exempt countries.
|-
| {{flag|Canada}}
| {{yes|Visa not required}}
| 6 months
|
* An eTA will be required from 2030.
|-
| {{flag|Pakistan}} || {{no|Admission refused}} || ||
|-
| {{flag|Seychelles}}
| {{yes|Free visitor's permit on arrival}}
| 3 months
|
|-
| {{flag|Guam}}
| {{yes|Visa not required}}
| 45 days
|
|}

{| class="wikitable"
|-
! | Territory
! | Conditions of access
! Notes
|-
! colspan="3" | China
|-
| {{flag|Hong Kong}}
| {{yes|Visa not required for 90 days}}
|
|-
| {{flag|Macau}}
| {{yes-no|Visa on arrival}}
|
* 30 days<ref>{{Timatic|nationality=NZ|destination=MO}}</ref>
|-
| {{flag|Palestine}}
| {{yes|Visa not required}}
|
* Passport valid for 6 months; entry is through Israel.
|}`;

describe('Wikipedia visa articles', () => {
  it('reads statuses, stays and destinations from the tables of an article', () => {
    const { rules, unknown, unreadable } = parseVisaPage(article, 'NZ', index);
    expect(rules).toEqual({
      AF: { status: 'e-visa', days: 30 },
      AL: { status: 'visa free', days: 90 },
      DZ: { status: 'visa required' },
      AD: { status: 'visa free', days: 90 },
      MC: { status: 'visa free', days: 90 },
      AU: { status: 'visa free' },
      BH: { status: 'visa on arrival', days: 14 },
      US: { status: 'eta', days: 90 },
      CI: { status: 'e-visa', days: 90 },
      GB: { status: 'eta', days: 180 },
      CA: { status: 'visa free', days: 180 },
      PK: { status: 'no admission' },
      SC: { status: 'visa free', days: 90 },
      HK: { status: 'visa free', days: 90 },
      MO: { status: 'visa on arrival', days: 30 },
      PS: { status: 'visa free' },
    });
    expect(unknown).toEqual(['Guam']);
    expect(unreadable).toEqual([]);
  });

  it('keeps the notes on each rule and the addresses its requirement cell cites', () => {
    const { notes, cited, unreadableNotes } = parseVisaPage(article, 'NZ', index);
    expect(notes).toEqual({
      AF: ['e-Visa: visitors must arrive at Kabul.'],
      GB: [
        'Electronic Travel Authorisation must be obtained via the UK ETA app before travel for all visa exempt countries.',
      ],
      CA: ['An eTA will be required from 2030.'],
      // Macau's note is only its stay, which the rule already has.
      PS: ['Passport valid for 6 months; entry is through Israel.'],
    });
    expect(cited).toEqual({ AF: ['https://visaportal.example'] });
    expect(unreadableNotes).toEqual([]);
  });

  it('includes the shared notes a row asks for', () => {
    const shared = sharedNoteSections(`Intro.
== Laos. Visa on arrival ==
* Available at Vientiane airport.<ref>{{cite web|url=https://example.org}}</ref>
=== Land borders ===
* Most crossings.
== Kenya. eTA ==
* eTA fee is USD 32.50.`);
    expect([...shared.keys()]).toEqual(['land borders', 'laos. visa on arrival', 'kenya. eta']);
    expect(
      noteItems(
        '* Check the dates.\n{{#section-h::Template:Transcluded sections for the visa articles|Laos. Visa on arrival}}',
        shared
      )
    ).toEqual(['Check the dates.', 'Available at Vientiane airport.', 'Land borders', 'Most crossings.']);
    const row = '{{#section-h:Template:Transcluded_sections_for_the_visa_articles| Kenya. eTA }}';
    expect(noteItems(row, shared)).toEqual(['eTA fee is USD 32.50.']);
    expect(
      missingSharedNotes(`${row}\n{{#section-h::Template:Transcluded sections for the visa articles|Gone}}`, shared)
    ).toEqual(['Gone']);
  });

  it('reads a notes cell as plain points', () => {
    const cell = `
* Visa on arrival for holders of a {{flag|United States}} visa.{{Citation needed|date=May 2026}}
* <s>Visa not required until 2024.</s> Visa required.
Fee: USD 50.<br>Must arrive at [[Kotoka International Airport|Kotoka airport]].{{efn|Or by sea at
* Tema.}}
[[File:Stamp.jpg|thumb|An [[entry stamp]]]]
* 90 days
* Must arrive at [[Kotoka International Airport|Kotoka airport]].
* Open at 3 bridges{{efn|name=Bridges|Friendship Bridges}} , and in Boten.

A second paragraph.`;
    expect(noteItems(cell)).toEqual([
      'Visa on arrival for holders of a United States visa.',
      'Visa required. Fee: USD 50.',
      'Must arrive at Kotoka airport.',
      'Open at 3 bridges, and in Boten.',
      'A second paragraph.',
    ]);
  });

  it('leaves the cited addresses behind only when asked', () => {
    const cell = '{{yes2|eVisa}}<ref>{{cite web|url=https://evisa.gov.example/apply|title=eVisa}}</ref><ref name=x/>';
    expect(stripNoise(cell)).toBe('{{yes2|eVisa}}');
    expect(citedLinks(stripNoise(cell, { keepLinks: true }))).toEqual(['https://evisa.gov.example/apply']);
    expect(requirementStatus(stripNoise(cell, { keepLinks: true }))).toBe('e-visa');
  });

  it('reads destinations an article lists as bullets instead of table rows', () => {
    const territories = `
== Partially recognized states ==
* {{flag|Kosovo}} — Visa not required for 90 days. Passport required; a residence permit allows longer stays.
* {{flag|Taiwan}} – eVisa required.
* {{flag|Macau}} — Visa not required.
* {{flag|Guam}} — Visa not required.`;
    const { rules } = parseVisaPage(article + territories, 'NZ', index);
    expect(rules.XK).toEqual({ status: 'visa free', days: 90 });
    expect(rules.TW).toEqual({ status: 'e-visa' });
    // A destination already read from a table keeps that rule.
    expect(rules.MO).toEqual({ status: 'visa on arrival', days: 30 });
    expect(Object.keys(parseVisaPage(territories, 'XK', index).rules)).toEqual(['TW', 'MO']);
  });

  it('classifies status cells by wording, with the template colour breaking ties', () => {
    const status = (cell: string) => requirementStatus(cell);
    expect(status('{{yes|Visa not required}}')).toBe('visa free');
    expect(status('{{yes2|[[eVisitor]]}}')).toBe('eta');
    expect(status('{{yes2|[[Visa policy of Kenya|Electronic Travel Authorisation]]}}')).toBe('eta');
    expect(status('{{yes|[[New Zealand Electronic Travel Authority|Visa not required]]}}')).toBe('eta');
    expect(status('{{yes|{{sort|Visa not required|ETA}}}}')).toBe('eta');
    expect(status('{{yes2|Online Visitor e600 visa}}')).toBe('e-visa');
    expect(status('{{yes2|e-VOA}}')).toBe('visa on arrival');
    expect(status('{{yes-no|{{sort|Visa on arrival|Entry permit on arrival}}}}')).toBe('visa on arrival');
    expect(status('{{no|Tourist card required}}')).toBe('visa required');
    expect(status('{{no|Passport not recognized}}')).toBe('no admission');
    expect(status('{{n/a|Admission restricted}}')).toBe('no admission');
    expect(status('{{n/a|Partial visa restrictions}}')).toBe('visa required');
    expect(status('{{n/a|N/A}}')).toBeUndefined();
    expect(status('')).toBeUndefined();
  });

  it('keeps hidden sort keys and link targets only when asked', () => {
    const cell = '{{yes|{{sort|Visa not required|[[New Zealand Electronic Travel Authority|NZeTA]]}}}}';
    expect(visibleText(cell)).toBe('NZeTA');
    expect(visibleText(cell, { hidden: true })).toBe('Visa not required New Zealand Electronic Travel Authority NZeTA');
  });

  it('upgrades visa-free travel to an eTA only for a current, mandatory authorisation in the notes', () => {
    expect(notesRequireAuthorisation('* ETA-IL is required before travel.')).toBe(true);
    expect(notesRequireAuthorisation('* Travellers must obtain an ESTA.')).toBe(true);
    expect(notesRequireAuthorisation('* ETA is not required for holders of a residence permit.')).toBe(false);
    expect(notesRequireAuthorisation('* An ETA will be required from 2030.')).toBe(false);
    expect(notesRequireAuthorisation('* Proof of accommodation is required.')).toBe(false);
  });

  it('converts stay lengths to days', () => {
    expect(stayDays('90 days')).toBe(90);
    expect(stayDays('3 months / 30 days')).toBe(90);
    expect(stayDays('6 weeks')).toBe(42);
    expect(stayDays('1 year')).toBe(365);
    expect(stayDays('up to 30-day stay')).toBe(30);
    expect(stayDays('Unlimited')).toBeUndefined();
    expect(stayDays('Freedom of movement')).toBeUndefined();
  });

  it('matches the destination names Wikipedia uses to country codes', () => {
    const code = (name: string) => index.get(normalizeName(name));
    expect(code('Ivory Coast')).toBe('CI');
    expect(code("Côte d'Ivoire")).toBe('CI');
    expect(code('Democratic Republic of the Congo')).toBe('CD');
    expect(code('Republic of the Congo')).toBe('CG');
    expect(code('São Tomé and Príncipe')).toBe('ST');
    expect(code('Saint Vincent and the Grenadines')).toBe('VC');
    expect(code('The Gambia')).toBe('GM');
    expect(code('Czech Republic')).toBe('CZ');
    expect(code('East Timor')).toBe('TL');
    expect(code('Vatican City')).toBe('VA');
    expect(code('Macau')).toBe('MO');
    expect(code('Guam')).toBeUndefined();
  });

  it('knows one distinct article for each of the 199 passports', () => {
    expect(codes).toHaveLength(199);
    expect(codes.filter(code => countryRegion(code) === 'Other')).toEqual([]);
    expect(new Set(Object.values(wikipediaPages)).size).toBe(codes.length);
  });
});
