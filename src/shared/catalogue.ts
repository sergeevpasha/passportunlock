import { allCountries, countryCode3, countryName, countryRegion, inCountryGroup } from './countries';
import { countsFor, destinationCountsFor, mobilityScore, type VisaMatrix } from './passports';

/** A passport and how many destinations it opens, or a destination and how many passports it admits. */
export interface PassportSummary {
  code: string;
  code3: string;
  name: string;
  region: string;
  /** Visa-free, which ranks by default. */
  visaFree: number;
  rank: number;
  /** Visa-free, visa on arrival or eTA: no visa arranged before travel. */
  mobility: number;
  mobilityRank: number;
  /** Every other country in the dataset. */
  total: number;
}
export type DestinationSummary = PassportSummary;

export const scores = ['visa-free', 'mobility'] as const;
export type Score = (typeof scores)[number];

export function scoreOf(country: PassportSummary, score: Score) {
  return score === 'mobility' ? country.mobility : country.visaFree;
}
export function rankOf(country: PassportSummary, score: Score) {
  return score === 'mobility' ? country.mobilityRank : country.rank;
}
/** Highest score first; a tie keeps alphabetical order. */
export function byRank(score: Score) {
  return (a: PassportSummary, b: PassportSummary) =>
    rankOf(a, score) - rankOf(b, score) || a.name.localeCompare(b.name, 'en');
}

/** Competition ranking: equal scores share a rank, and the next rank skips tied places. */
export function rankBy<T extends { name: string }>(items: T[], score: (item: T) => number): (T & { rank: number })[] {
  const sorted = [...items].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, 'en'));
  let rank = 0;
  return sorted.map((item, index) => {
    if (index === 0 || score(item) !== score(sorted[index - 1]!)) rank = index + 1;
    return { ...item, rank };
  });
}

function scored(matrix: VisaMatrix, count: (code: string) => { visaFree: number; mobility: number }) {
  const countries = Object.keys(matrix).map(code => ({
    code,
    code3: countryCode3(code),
    name: countryName(code),
    region: countryRegion(code),
    ...count(code),
    total: Object.keys(matrix).length - 1,
  }));
  const mobilityRanks = new Map(rankBy(countries, country => country.mobility).map(({ code, rank }) => [code, rank]));
  return rankBy(countries, country => country.visaFree).map(country => ({
    ...country,
    mobilityRank: mobilityRanks.get(country.code)!,
  }));
}

/** Passports by the number of destinations they open, in visa-free order. */
export function passportCatalogue(matrix: VisaMatrix): PassportSummary[] {
  return scored(matrix, code => {
    const counts = countsFor(matrix, code);
    return { visaFree: counts['visa free'], mobility: mobilityScore(counts) };
  });
}

/** Destinations by the number of passports they admit, in visa-free order. */
export function destinationCatalogue(matrix: VisaMatrix): DestinationSummary[] {
  return scored(matrix, code => {
    const counts = destinationCountsFor(matrix, code);
    return { visaFree: counts['visa free'], mobility: mobilityScore(counts) };
  });
}

export function matchesCountry(
  country: Pick<PassportSummary, 'code' | 'code3' | 'name'>,
  search: string,
  group = allCountries
) {
  const query = search.trim().toLocaleLowerCase('en');
  return (
    inCountryGroup(country.code, group) &&
    (!query || `${country.name} ${country.code} ${country.code3}`.toLocaleLowerCase('en').includes(query))
  );
}
