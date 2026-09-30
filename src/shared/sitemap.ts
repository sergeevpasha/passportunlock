import { countrySlug, destinationPath, entryPath, passportPath } from './country-paths';
import { ruleFor, type VisaMatrix } from './passports';

const escapeXml = (text: string) =>
  text.replace(/[<>&'"]/g, char => `&${{ '<': 'lt', '>': 'gt', '&': 'amp', "'": 'apos', '"': 'quot' }[char]};`);

/** A sitemap listing each path under the origin, all last changed on the same date. */
export function sitemapXml(origin: string, paths: string[], lastModified: string) {
  const urls = paths.map(
    path => `  <url><loc>${escapeXml(new URL(path, origin).href)}</loc><lastmod>${lastModified}</lastmod></url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** A sitemap index listing the sitemaps at each path under the origin. */
export function sitemapIndexXml(origin: string, paths: string[], lastModified: string) {
  const sitemaps = paths.map(
    path => `  <sitemap><loc>${escapeXml(new URL(path, origin).href)}</loc><lastmod>${lastModified}</lastmod></sitemap>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps.join('\n')}\n</sitemapindex>\n`;
}

const entryFiles = 4;

/** The site's sitemaps: its pages with each passport's and destination's, then every passport's page for each
 * destination, split by destination into files of about 10,000 addresses. A rule that isn't confirmed is left out,
 * as its page isn't indexed. */
export function sitemapFiles(matrix: VisaMatrix): { name: string; paths: string[] }[] {
  const codes = Object.keys(matrix).sort((a, b) => countrySlug(a).localeCompare(countrySlug(b)));
  const perFile = Math.ceil(codes.length / entryFiles);
  return [
    {
      name: 'pages.xml',
      paths: [
        '/',
        '/passports',
        '/passports/covers',
        '/destinations',
        '/compare',
        '/rankings',
        '/about',
        ...codes.map(passportPath),
        ...codes.map(destinationPath),
      ],
    },
    ...Array.from({ length: entryFiles }, (_, index) => ({
      name: `entry-rules-${index + 1}.xml`,
      paths: codes
        .slice(index * perFile, (index + 1) * perFile)
        .flatMap(destination =>
          codes
            .filter(passport => passport !== destination && ruleFor(matrix, passport, destination).status !== 'unknown')
            .map(passport => entryPath(destination, passport))
        ),
    })),
  ];
}
