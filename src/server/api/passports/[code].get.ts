import { passportCatalogue } from '#shared/catalogue';
import { countrySummary } from '#shared/countries';
import { easeOrder, issuerName, ruleExceptions } from '#shared/exceptions';
import { nationality } from '#shared/nationalities';
import { countsFor, ruleFor, type RequirementType } from '#shared/passports';
import { notesFor } from '#shared/requirements';
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
  // What another country's visa or residence permit unlocks: for each issuer, the destinations it makes easier.
  const unlocks = new Map<string, Map<string, RequirementType>>();
  for (const destination of destinations) {
    const notes = notesFor(latest.notes, code, destination.code);
    for (const exception of ruleExceptions(notes, destination.rule.status, code, destination.code)) {
      for (const issuer of exception.issuers) {
        const granted = unlocks.get(issuer) ?? new Map<string, RequirementType>();
        unlocks.set(issuer, granted);
        const before = granted.get(destination.code);
        if (!before || easeOrder.indexOf(exception.grants) < easeOrder.indexOf(before))
          granted.set(destination.code, exception.grants);
      }
    }
  }
  return {
    passport,
    nationality: nationality(code),
    passports: Object.keys(latest.matrix).length,
    counts: {
      ...countsFor(latest.matrix, code),
      unknown: destinations.filter(destination => destination.rule.status === 'unknown').length,
    },
    destinations,
    unlocks: [...unlocks]
      .map(([issuer, granted]) => ({
        issuer: issuerName(issuer),
        destinations: [...granted]
          .map(([destination, grants]) => ({ ...countrySummary(destination), grants }))
          .sort((a, b) => a.name.localeCompare(b.name, 'en')),
      }))
      .sort((a, b) => b.destinations.length - a.destinations.length || a.issuer.localeCompare(b.issuer, 'en')),
    sourceDate: latest.sourceDate,
  };
});
