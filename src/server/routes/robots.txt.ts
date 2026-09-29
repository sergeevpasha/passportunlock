export default defineEventHandler(event => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${getRequestURL(event).origin}/sitemap.xml\n`;
});
