import { countryCode3, countryName, countryRegion } from './countries';
import { countsFor, type VisaMatrix } from './passports';

export interface PassportSummary {
  code: string;
  code3: string;
  name: string;
  region: string;
  visaFree: number;
  rank: number;
  total: number;
}

/** Competition ranking: equal scores share a rank, and the next rank skips tied places. */
export function rankPassports<T extends { visaFree: number; name: string }>(passports: T[]): (T & { rank: number })[] {
  const sorted = [...passports].sort((a, b) => b.visaFree - a.visaFree || a.name.localeCompare(b.name, 'en'));
  let rank = 0;
  return sorted.map((passport, index) => {
    if (index === 0 || passport.visaFree !== sorted[index - 1]!.visaFree) rank = index + 1;
    return { ...passport, rank };
  });
}

export function passportCatalogue(matrix: VisaMatrix): PassportSummary[] {
  return rankPassports(
    Object.keys(matrix).map(code => ({
      code,
      code3: countryCode3(code),
      name: countryName(code),
      region: countryRegion(code),
      visaFree: countsFor(matrix, code)['visa free'],
      total: Object.keys(matrix).length - 1,
    }))
  );
}

export function matchesCountry(
  country: Pick<PassportSummary, 'code' | 'code3' | 'name' | 'region'>,
  search: string,
  region = 'All regions'
) {
  const query = search.trim().toLocaleLowerCase('en');
  return (
    (region === 'All regions' || country.region === region) &&
    (!query || `${country.name} ${country.code} ${country.code3}`.toLocaleLowerCase('en').includes(query))
  );
}

export const maxPassports = 3;

export function comparisonQuery(codes: string[]): Record<string, string> {
  return Object.fromEntries(
    [...new Set(codes)].slice(0, maxPassports).map((code, index) => [`p${index + 1}`, code.toLowerCase()])
  );
}
