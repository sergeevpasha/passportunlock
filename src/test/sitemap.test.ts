import { describe, expect, it } from 'vitest';
import { sitemapFiles, sitemapIndexXml, sitemapXml } from '#shared/sitemap';
import { parseMatrix } from '#shared/passports';
import wikipedia from '../server/data/2026-10-05.json';

describe('sitemap', () => {
  it('lists absolute, XML-escaped addresses with their last change', () => {
    const xml = sitemapXml('https://example.com', ['/', '/compare?p1=nz&p2=ru'], '2026-09-28');
    expect(xml).toContain('<loc>https://example.com/</loc><lastmod>2026-09-28</lastmod>');
    expect(xml).toContain('<loc>https://example.com/compare?p1=nz&amp;p2=ru</loc>');
    expect(xml.match(/<url>/g)).toHaveLength(2);
  });
  it('indexes the sitemaps', () => {
    const xml = sitemapIndexXml('https://example.com', ['/sitemaps/pages.xml'], '2026-09-28');
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('<sitemap><loc>https://example.com/sitemaps/pages.xml</loc><lastmod>2026-09-28</lastmod>');
  });
  it('lists every page once, and every confirmed rule for a passport and destination', () => {
    const matrix = parseMatrix(wikipedia.matrix, undefined, { complete: false });
    const files = sitemapFiles(matrix);
    expect(files.map(file => file.name)).toEqual([
      'pages.xml',
      'entry-rules-1.xml',
      'entry-rules-2.xml',
      'entry-rules-3.xml',
      'entry-rules-4.xml',
    ]);
    const [pages, ...entries] = files;
    expect(pages!.paths).toContain('/destinations');
    expect(pages!.paths).toContain('/passports/new-zealand');
    expect(pages!.paths).toContain('/passports/covers');
    expect(pages!.paths.some(path => path.startsWith('/compare?'))).toBe(false);
    expect(pages!.paths).toContain('/destinations/new-zealand');
    expect(pages!.paths).toHaveLength(6 + 199 * 2);
    const rules = entries.flatMap(file => file.paths);
    const confirmed = Object.values(matrix).reduce((sum, row) => sum + Object.keys(row).length, 0);
    expect(rules).toHaveLength(confirmed);
    expect(new Set(rules).size).toBe(rules.length);
    expect(rules).toContain('/destinations/japan/germany');
    expect(rules).not.toContain('/destinations/germany/germany');
    for (const file of entries) expect(file.paths.length).toBeLessThan(50_000);
  });
});
