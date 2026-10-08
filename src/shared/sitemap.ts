import { countrySlug, destinationPath, entryPath, passportPath } from './country-paths';
import type { RuleHistory } from './history';
import { ruleFor, type VisaMatrix } from './passports';

/** The date the page templates last changed what pages say. A page's last change is the later of this and the last
 * change of the rules it shows, so search engines can trust the dates and recrawl only what changed. Move it forward
 * when a template change alters every page's text. */
export const pagesChanged = '2026-10-08';

const escapeXml = (text: string) =>
  text.replace(/[<>&'"]/g, char => `&${{ '<': 'lt', '>': 'gt', '&': 'amp', "'": 'apos', '"': 'quot' }[char]};`);

export interface SitemapEntry {
  path: string;
  /** When the page last changed, as YYYY-MM-DD. */
  lastModified: string;
}

/** A sitemap listing each page under the origin with its last change. */
export function sitemapXml(origin: string, entries: SitemapEntry[]) {
  const urls = entries.map(
    entry =>
      `  <url><loc>${escapeXml(new URL(entry.path, origin).href)}</loc><lastmod>${entry.lastModified}</lastmod></url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** A sitemap index listing the sitemap at each path under the origin with its latest change. */
export function sitemapIndexXml(origin: string, sitemaps: SitemapEntry[]) {
  const items = sitemaps.map(
    sitemap =>
      `  <sitemap><loc>${escapeXml(new URL(sitemap.path, origin).href)}</loc><lastmod>${sitemap.lastModified}</lastmod></sitemap>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>\n`;
}

const entryFiles = 4;
const later = (a: string, b: string | undefined) => (b && b > a ? b : a);

/** The site's sitemaps: its pages with each passport's and destination's, then every passport's page for each
 * destination, split by destination into files of about 10,000 addresses. A rule that isn't confirmed is left out,
 * as its page isn't indexed. */
export function sitemapFiles(matrix: VisaMatrix, history?: RuleHistory): { name: string; entries: SitemapEntry[] }[] {
  const codes = Object.keys(matrix).sort((a, b) => countrySlug(a).localeCompare(countrySlug(b)));
  const perFile = Math.ceil(codes.length / entryFiles);
  const changed = (passport: string, destination: string) => history?.changes[passport]?.[destination]?.on;
  // Each passport's and destination's page shows all of its rules, so it changes with any of them.
  const passports = new Map<string, string>();
  const destinations = new Map<string, string>();
  let anyRule = pagesChanged;
  for (const [passport, destinationChanges] of Object.entries(history?.changes ?? {})) {
    for (const [destination, change] of Object.entries(destinationChanges)) {
      passports.set(passport, later(passports.get(passport) ?? pagesChanged, change.on));
      destinations.set(destination, later(destinations.get(destination) ?? pagesChanged, change.on));
      anyRule = later(anyRule, change.on);
    }
  }
  return [
    {
      name: 'pages.xml',
      entries: [
        ...['/', '/passports', '/destinations', '/rankings'].map(path => ({ path, lastModified: anyRule })),
        ...['/passports/covers', '/compare'].map(path => ({ path, lastModified: pagesChanged })),
        ...codes.map(code => ({ path: passportPath(code), lastModified: passports.get(code) ?? pagesChanged })),
        ...codes.map(code => ({ path: destinationPath(code), lastModified: destinations.get(code) ?? pagesChanged })),
      ],
    },
    ...Array.from({ length: entryFiles }, (_, index) => ({
      name: `entry-rules-${index + 1}.xml`,
      entries: codes.slice(index * perFile, (index + 1) * perFile).flatMap(destination =>
        codes
          .filter(passport => passport !== destination && ruleFor(matrix, passport, destination).status !== 'unknown')
          .map(passport => ({
            path: entryPath(destination, passport),
            lastModified: later(pagesChanged, changed(passport, destination)),
          }))
      ),
    })),
  ];
}

/** The latest change among a sitemap's pages. */
export function lastChange(entries: SitemapEntry[]) {
  return entries.reduce((latest, entry) => later(latest, entry.lastModified), pagesChanged);
}
