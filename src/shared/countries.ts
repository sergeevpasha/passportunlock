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

// Unions and blocs, with their full members as of September 2026. Update a list when its bloc changes.
const memberGroups = [
  {
    id: 'eu',
    label: 'European Union',
    codes: 'AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK',
  },
  // Cyprus hasn't joined yet and Ireland stays out; Iceland, Liechtenstein, Norway and Switzerland are in it from
  // outside the EU.
  {
    id: 'schengen',
    label: 'Schengen Area',
    codes: 'AT BE BG CH CZ DE DK EE ES FI FR GR HR HU IS IT LI LT LU LV MT NL NO PL PT RO SE SI SK',
  },
  { id: 'gcc', label: 'Gulf Cooperation Council', codes: 'AE BH KW OM QA SA' },
  {
    id: 'arab-league',
    label: 'Arab League',
    codes: 'AE BH DJ DZ EG IQ JO KM KW LB LY MA MR OM PS QA SA SD SO SY TN YE',
  },
  // Timor-Leste joined in October 2025.
  { id: 'asean', label: 'ASEAN', codes: 'BN ID KH LA MM MY PH SG TH TL VN' },
  {
    id: 'commonwealth',
    label: 'Commonwealth',
    codes:
      'AG AU BB BD BN BS BW BZ CA CM CY DM FJ GA GB GD GH GM GY IN JM KE KI KN LC LK LS MT MU MV MW MY MZ NA NG NR NZ PG PK RW SB SC SG SL SZ TG TO TT TV TZ UG VC VU WS ZA ZM',
  },
  { id: 'g7', label: 'G7', codes: 'CA DE FR GB IT JP US' },
  // The G20's other members are the European Union and the African Union.
  { id: 'g20', label: 'G20', codes: 'AR AU BR CA CN DE FR GB ID IN IT JP KR MX RU SA TR US ZA' },
  {
    id: 'oecd',
    label: 'OECD',
    codes:
      'AT AU BE CA CH CL CO CR CZ DE DK EE ES FI FR GB GR HU IE IL IS IT JP KR LT LU LV MX NL NO NZ PL PT SE SI SK TR US',
  },
  // Saudi Arabia is left out: invited to join from January 2024, it has not confirmed that it did.
  { id: 'brics', label: 'BRICS', codes: 'AE BR CN EG ET ID IN IR RU ZA' },
  // Venezuela is suspended.
  { id: 'mercosur', label: 'Mercosur', codes: 'AR BO BR PY UY' },
  // Montserrat, a British territory and the fifteenth member, is not in the dataset.
  { id: 'caricom', label: 'CARICOM', codes: 'AG BB BS BZ DM GD GY HT JM KN LC SR TT VC' },
  // Burkina Faso, Mali and Niger left in January 2025.
  { id: 'ecowas', label: 'ECOWAS', codes: 'BJ CI CV GH GM GN GW LR NG SL SN TG' },
  { id: 'eac', label: 'East African Community', codes: 'BI CD KE RW SO SS TZ UG' },
  { id: 'eaeu', label: 'Eurasian Economic Union', codes: 'AM BY KG KZ RU' },
];

export interface CountryGroup {
  id: string;
  label: string;
  kind: 'Regions' | 'Groups';
  codes: ReadonlySet<string>;
}
/** What the country lists can be narrowed to: the regions, then the unions and blocs. */
export const countryGroups: CountryGroup[] = [
  ...Object.entries(regionGroups).map(([label, codes]) => ({
    id: label.toLowerCase(),
    label,
    kind: 'Regions' as const,
    codes: new Set(codes.split(' ')),
  })),
  ...memberGroups.map(({ codes, ...group }) => ({
    ...group,
    kind: 'Groups' as const,
    codes: new Set(codes.split(' ')),
  })),
];
export const allCountries = 'all';
export const countryGroupIds = [allCountries, ...countryGroups.map(group => group.id)];

export function inCountryGroup(code: string, group: string) {
  return group === allCountries || (countryGroups.find(item => item.id === group)?.codes.has(code) ?? false);
}

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
// Names that take "the" inside a sentence, as in "a visa for the United States".
const definite = new Set(['AE', 'BS', 'CF', 'CG', 'DO', 'GB', 'GM', 'KM', 'MH', 'MV', 'NL', 'PH', 'SB', 'US']);
/** A country's name as it reads inside a sentence. */
export function countryNameInText(code: string, name = countryName(code)) {
  return definite.has(code) ? `the ${name}` : name;
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
/** A country's name, codes and region, for a list that doesn't need its scores. */
export function countrySummary(code: string) {
  return { code, code3: countryCode3(code), name: countryName(code), region: countryRegion(code) };
}
