import { describe, expect, it } from 'vitest';
import type { RuleHistory } from '#shared/history';
import { pagesChanged, sitemapFiles, sitemapIndexXml, sitemapXml } from '#shared/sitemap';
import { parseMatrix } from '#shared/passports';
import wikipedia from '../server/data/2026-10-05.json';

describe('sitemap', () => {
  it('lists absolute, XML-escaped addresses with their last change', () => {
    const xml = sitemapXml('https://example.com', [
      { path: '/', lastModified: '2026-09-28' },
      { path: '/compare?p1=nz&p2=ru', lastModified: '2026-09-28' },
    ]);
    expect(xml).toContain('<loc>https://example.com/</loc><lastmod>2026-09-28</lastmod>');
    expect(xml).toContain('<loc>https://example.com/compare?p1=nz&amp;p2=ru</loc>');
    expect(xml.match(/<url>/g)).toHaveLength(2);
  });
  it('indexes the sitemaps', () => {
    const xml = sitemapIndexXml('https://example.com', [{ path: '/sitemaps/pages.xml', lastModified: '2026-09-28' }]);
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
    const paths = pages!.entries.map(entry => entry.path);
    expect(paths).toContain('/destinations');
    expect(paths).toContain('/passports/new-zealand');
    expect(paths).toContain('/passports/covers');
    expect(paths.some(path => path.startsWith('/compare?'))).toBe(false);
    expect(paths).toContain('/destinations/new-zealand');
    expect(paths).toHaveLength(6 + 199 * 2);
    const rules = entries.flatMap(file => file.entries.map(entry => entry.path));
    const confirmed = Object.values(matrix).reduce((sum, row) => sum + Object.keys(row).length, 0);
    expect(rules).toHaveLength(confirmed);
    expect(new Set(rules).size).toBe(rules.length);
    expect(rules).toContain('/destinations/japan/germany');
    expect(rules).not.toContain('/destinations/germany/germany');
    for (const file of entries) expect(file.entries.length).toBeLessThan(50_000);
  });
  it('dates each page by the last change of the rules it shows', () => {
    const matrix = {
      DE: { TH: { status: 'visa free', days: 30 } },
      TH: { DE: { status: 'visa free', days: 30 } },
    } as const;
    const history: RuleHistory = {
      since: '2026-09-28',
      changes: { DE: { TH: { on: '2099-01-02', was: { status: 'visa free', days: 60 } } } },
    };
    const files = sitemapFiles(structuredClone(matrix), history);
    const all = files.flatMap(file => file.entries);
    const at = (path: string) => all.find(entry => entry.path === path)?.lastModified;
    expect(at('/destinations/thailand/germany')).toBe('2099-01-02');
    expect(at('/destinations/germany/thailand')).toBe(pagesChanged);
    expect(at('/passports/germany')).toBe('2099-01-02');
    expect(at('/destinations/thailand')).toBe('2099-01-02');
    expect(at('/passports/thailand')).toBe(pagesChanged);
    expect(at('/rankings')).toBe('2099-01-02');
  });
});
