const escapeXml = (text: string) =>
  text.replace(/[<>&'"]/g, char => `&${{ '<': 'lt', '>': 'gt', '&': 'amp', "'": 'apos', '"': 'quot' }[char]};`);

/** A sitemap listing each path under the origin, all last changed on the same date. */
export function sitemapXml(origin: string, paths: string[], lastModified: string) {
  const urls = paths.map(
    path => `  <url><loc>${escapeXml(new URL(path, origin).href)}</loc><lastmod>${lastModified}</lastmod></url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
