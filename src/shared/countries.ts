import { iso31661Alpha2ToAlpha3 } from 'iso-3166';

export const regionGroups: Record<string, string> = {
  Africa:
    'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RW SC SD SL SN SO SS ST SZ TD TG TN TZ UG ZA ZM ZW',
  Americas: 'AG AR BB BO BR BS BZ CA CL CO CR CU DM DO EC GD GT GY HN HT JM KN LC MX NI PA PE PY SR SV TT US UY VC VE',
  Asia: 'AE AF AM AZ BD BH BN BT CN CY GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE',
  Europe:
    'AD AL AT BA BE BG BY CH CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SK SM UA VA XK',
  Oceania: 'AU FJ FM KI MH NR NZ PG PW SB TO TV VU WS',
};
const names = new Intl.DisplayNames(['en'], { type: 'region' });
const overrides: Record<string, string> = {
  RU: 'Russia',
  KR: 'South Korea',
  KP: 'North Korea',
  TW: 'Taiwan',
  PS: 'Palestine',
  TR: 'Türkiye',
  VA: 'Vatican City',
  CD: 'DR Congo',
  CG: 'Republic of the Congo',
  HK: 'Hong Kong',
  MO: 'Macao',
};
export function countryName(code: string) {
  return overrides[code] ?? names.of(code) ?? code;
}
/** The three-letter code a passport prints for its issuing state. ISO 3166 has none for Kosovo; ICAO uses RKS. */
export function countryCode3(code: string) {
  return iso31661Alpha2ToAlpha3[code] ?? (code === 'XK' ? 'RKS' : code);
}
export function countryFlag(code: string) {
  return String.fromCodePoint(...[...code].map(char => 127397 + char.charCodeAt(0)));
}
export function countryRegion(code: string) {
  return Object.entries(regionGroups).find(([, codes]) => codes.split(' ').includes(code))?.[0] ?? 'Other';
}
