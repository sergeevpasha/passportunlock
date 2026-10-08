import { sitemapFiles, sitemapXml } from '#shared/sitemap';
import { passportSnapshots } from '../../utils/passport-data';

export default defineEventHandler(async event => {
  const latest = (await passportSnapshots())[0]!;
  const file = sitemapFiles(latest.matrix, latest.history).find(item => item.name === getRouterParam(event, 'name'));
  if (!file) throw createError({ statusCode: 404, statusMessage: 'Sitemap not found' });
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  return sitemapXml(getRequestURL(event).origin, file.entries);
});
