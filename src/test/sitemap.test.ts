import { describe, expect, it } from 'vitest';
import { sitemapXml } from '#shared/sitemap';

describe('sitemap', () => {
  it('lists absolute, XML-escaped addresses with their last change', () => {
    const xml = sitemapXml('https://example.com', ['/', '/compare?p1=nz&p2=ru'], '2026-09-28');
    expect(xml).toContain('<loc>https://example.com/</loc><lastmod>2026-09-28</lastmod>');
    expect(xml).toContain('<loc>https://example.com/compare?p1=nz&amp;p2=ru</loc>');
    expect(xml.match(/<url>/g)).toHaveLength(2);
  });
});
