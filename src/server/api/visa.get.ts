import { destinationCatalogue, passportCatalogue } from '#shared/catalogue';
import { countryName, countryRegion } from '#shared/countries';
import { ruleFor } from '#shared/passports';
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
  return {
    passport,
    destination,
    rule: ruleFor(latest.matrix, passport.code, destination.code),
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
