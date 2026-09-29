import { passportCatalogue } from '#shared/catalogue';
import { passportSnapshots } from '../utils/passport-data';

export default defineEventHandler(async () => {
  const latest = (await passportSnapshots())[0]!;
  return {
    passports: passportCatalogue(latest.matrix),
    source: latest.source,
    sourceDate: latest.sourceDate,
    sourceUrl: latest.sourceUrl,
    license: latest.license,
  };
});
