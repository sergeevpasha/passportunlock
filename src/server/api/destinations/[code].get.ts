import { destinationCatalogue } from '#shared/catalogue';
import { countrySummary } from '#shared/countries';
import { destinationCountsFor, ruleFor } from '#shared/passports';
import { passportSnapshots } from '../../utils/passport-data';

// Every other passport's rule for one destination.
export default defineEventHandler(async event => {
  const latest = (await passportSnapshots())[0]!;
  const code = getRouterParam(event, 'code')?.toUpperCase() ?? '';
  const destination = destinationCatalogue(latest.matrix).find(item => item.code === code);
  if (!destination) throw createError({ statusCode: 404, statusMessage: 'Destination not found' });
  return {
    destination,
    destinations: Object.keys(latest.matrix).length,
    counts: destinationCountsFor(latest.matrix, code),
    // The government's own sites for its visa and its eTA, where known.
    officialSites: latest.officialSites?.[code] ?? {},
    visaPage: latest.visaPages?.[code] ?? null,
    passports: Object.keys(latest.matrix)
      .filter(passport => passport !== code)
      .map(passport => ({ ...countrySummary(passport), rule: ruleFor(latest.matrix, passport, code) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en')),
    sourceDate: latest.sourceDate,
  };
});
