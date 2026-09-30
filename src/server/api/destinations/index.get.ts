import { destinationCatalogue } from '#shared/catalogue';
import { passportSnapshots } from '../../utils/passport-data';

export default defineEventHandler(async () => {
  const latest = (await passportSnapshots())[0]!;
  return { destinations: destinationCatalogue(latest.matrix), sourceDate: latest.sourceDate };
});
