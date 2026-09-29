import { sitemapXml } from '#shared/sitemap';
import { passportSnapshots } from '../utils/passport-data';

// The site's pages, then one comparison page per passport, which shows every destination's rule for it.
export default defineEventHandler(async event => {
  const latest = (await passportSnapshots())[0]!;
  const passports = Object.keys(latest.matrix)
    .sort()
    .map(code => `/compare?p1=${code.toLowerCase()}`);
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  return sitemapXml(
    getRequestURL(event).origin,
    ['/', '/passports', '/compare', '/about', ...passports],
    latest.sourceDate
  );
});
