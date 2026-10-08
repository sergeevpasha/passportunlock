import { authorisations } from '#shared/authorisations';
import { destinationCatalogue, passportCatalogue } from '#shared/catalogue';
import { countryName, countryRegion } from '#shared/countries';
import { issuerName, ruleExceptions } from '#shared/exceptions';
import { nationality } from '#shared/nationalities';
import { ruleFor } from '#shared/passports';
import { policyCheckFor } from '#shared/policy-checks';
import { approvalKind, noteLabel, notesFor } from '#shared/requirements';
import { passportSnapshots } from '../utils/passport-data';

// One passport's rule for one destination, with the context its page shows.
export default defineEventHandler(async event => {
  const latest = (await passportSnapshots())[0]!;
  const query = getQuery(event);
  const [passportCode, destinationCode] = [query.passport, query.destination].map(value =>
    typeof value === 'string' ? value.toUpperCase() : ''
  );
  const passport = passportCatalogue(latest.matrix).find(item => item.code === passportCode);
  const destination = destinationCatalogue(latest.matrix).find(item => item.code === destinationCode);
  if (!passport || !destination || passport.code === destination.code) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a supported passport and another destination.' });
  }
  const region = countryRegion(destination.code);
  const rule = ruleFor(latest.matrix, passport.code, destination.code);
  const kind = approvalKind(rule.status);
  const notes = notesFor(latest.notes, passport.code, destination.code);
  return {
    passport,
    destination,
    // How searchers name the passport's holders: "German citizens".
    nationality: nationality(passport.code),
    rule,
    // Conditions, exemptions and where the visa is issued, each labelled by what it is about.
    notes: notes.map(text => ({ text, label: noteLabel(text) ?? null })),
    // Visas and residence permits from other countries that make entry easier than the rule.
    exceptions: ruleExceptions(notes, rule.status, passport.code, destination.code).map(exception => ({
      ...exception,
      issuers: exception.issuers.map(issuerName),
    })),
    // Whether the destination's own visa policy confirms the rule, supplied it, or says something else.
    check: policyCheckFor(latest.policyChecks, rule, passport.code, destination.code),
    // What every visitor needs: passport validity and a digital arrival card.
    facts: latest.destinationFacts?.[destination.code] ?? null,
    // The authorisation's own name, for an eTA rule.
    authorisation: (rule.status === 'eta' && authorisations[destination.code]) || null,
    // The rule before its last change, and when that was.
    changed: latest.history?.changes[passport.code]?.[destination.code] ?? null,
    // The destination government's site for the approval.
    officialSite: (kind && latest.officialSites?.[destination.code]?.[kind]) || null,
    // The destination's own page about visas, for a rule that needs an approval but has no site of its own.
    visaPage: (kind && latest.visaPages?.[destination.code]) || null,
    // The destination's own passport, visiting the passport's country.
    reverse: ruleFor(latest.matrix, destination.code, passport.code),
    region,
    // The passport's rules for the destination's neighbours in the same region.
    nearby: Object.keys(latest.matrix)
      .filter(code => code !== passport.code && code !== destination.code && countryRegion(code) === region)
      .map(code => ({ code, name: countryName(code), rule: ruleFor(latest.matrix, passport.code, code) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en')),
    sourceDate: latest.sourceDate,
  };
});
