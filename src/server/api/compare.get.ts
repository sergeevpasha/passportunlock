import { countsFor, ruleFor, sourceAgeDays, type Snapshot } from '#shared/passports';
import { countryFlag } from '#shared/countries';
import { passportCatalogue } from '#shared/catalogue';
import { parseComparisonQuery, type PassportSelection } from '#shared/comparison-query';
import { passportSnapshots } from '../utils/passport-data';

export default defineEventHandler(async event => {
  const query = getQuery(event);
  const snapshots = await passportSnapshots();
  const latest = snapshots[0]!;
  const countries = passportCatalogue(latest.matrix)
    .map(passport => ({ ...passport, flag: countryFlag(passport.code) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  let selections: PassportSelection[];
  try {
    selections = parseComparisonQuery(query);
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Choose a supported passport.' });
  }
  const requested = selections.map(({ code, snapshot: id }) => {
    if (!latest.matrix[code]) throw createError({ statusCode: 400, statusMessage: 'Choose a supported passport.' });
    // A snapshot that is no longer kept, as in an old shared link, falls back to the latest one.
    const snapshot = snapshots.find(item => item.id === id) ?? latest;
    return { code, snapshot };
  });
  // Snapshot details, without the rules and the article revisions they were read from.
  const metadata = ({ matrix: _matrix, pages: _pages, ...snapshot }: Snapshot) => ({
    ...snapshot,
    ageDays: sourceAgeDays(snapshot.sourceDate),
  });
  setHeader(event, 'Cache-Control', 'no-store');
  return {
    // The picker lists every passport with its visa-free count in the latest snapshot.
    countries,
    snapshots: snapshots.map(metadata),
    columns: requested.map(({ code, snapshot }) => ({
      ...countries.find(country => country.code === code)!,
      snapshot: metadata(snapshot),
      counts: countsFor(snapshot.matrix, code),
    })),
    rows: countries.map(country => ({
      ...country,
      rules: requested.map(({ code, snapshot }) => ruleFor(snapshot.matrix, code, country.code)),
    })),
  };
});
