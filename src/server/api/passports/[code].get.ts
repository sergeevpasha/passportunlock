import { passportCatalogue } from '#shared/catalogue';
import { countrySummary } from '#shared/countries';
import { countsFor, ruleFor } from '#shared/passports';
import { passportSnapshots } from '../../utils/passport-data';

// Every destination's rule for one passport.
export default defineEventHandler(async event => {
  const latest = (await passportSnapshots())[0]!;
  const code = getRouterParam(event, 'code')?.toUpperCase() ?? '';
  const passport = passportCatalogue(latest.matrix).find(item => item.code === code);
  if (!passport) throw createError({ statusCode: 404, statusMessage: 'Passport not found' });
  const destinations = Object.keys(latest.matrix)
    .filter(destination => destination !== code)
    .map(destination => ({ ...countrySummary(destination), rule: ruleFor(latest.matrix, code, destination) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return {
    passport,
    passports: Object.keys(latest.matrix).length,
    counts: {
      ...countsFor(latest.matrix, code),
      unknown: destinations.filter(destination => destination.rule.status === 'unknown').length,
    },
    destinations,
    sourceDate: latest.sourceDate,
  };
});
