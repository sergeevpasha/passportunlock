import { siteOrigin } from '../utils/site';

export default defineEventHandler(event => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteOrigin(event)}/sitemap.xml\n`;
});
