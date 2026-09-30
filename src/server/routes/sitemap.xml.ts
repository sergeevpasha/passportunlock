import { sitemapFiles, sitemapIndexXml } from '#shared/sitemap';
import { passportSnapshots } from '../utils/passport-data';

// An index of the site's sitemaps, which are served from /sitemaps/.
export default defineEventHandler(async event => {
  const latest = (await passportSnapshots())[0]!;
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  return sitemapIndexXml(
    getRequestURL(event).origin,
    sitemapFiles(latest.matrix).map(file => `/sitemaps/${file.name}`),
    latest.sourceDate
  );
});
