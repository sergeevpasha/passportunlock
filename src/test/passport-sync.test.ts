import * as storage from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runSync } from '../scripts/passport-sync';
import { countryName } from '#shared/countries';
import { notesFor } from '#shared/requirements';
import { sharedNotesTitle } from '#shared/wikipedia';
import { wikipediaPages } from '#shared/wikipedia-pages';
import bundled from '../server/data/2026-09-28.json';

const checkedAt = '2026-09-29T12:00:00.000Z';
const article = [
  '{| class="wikitable"',
  '! Country !! Visa requirement !! Allowed stay',
  ...Object.keys(wikipediaPages).map(
    code => `|-\n| {{flag|${countryName(code)}}} || {{yes|Visa not required}} || 30 days`
  ),
  '|}',
].join('\n');

function articleResponse(input: Parameters<typeof fetch>[0], edited = '2026-09-25T00:00:00Z') {
  const url = new URL(String(input));
  return Response.json({
    query: {
      pages: url.searchParams
        .get('titles')!
        .split('|')
        .map((title, index) => ({
          title,
          revisions: [{ revid: index + 1, timestamp: edited, slots: { main: { content: article } } }],
        })),
    },
  });
}

describe('passport sync workflow', () => {
  let root: string;
  let options: {
    directory: string;
    baselineDirectory: string;
    acceptLargeChange: boolean;
    visaPages: Record<string, string>;
  };
  const request = vi.fn<typeof fetch>();
  const pause = vi.fn<(seconds: number) => Promise<void>>();
  const dependencies = { fetch: request, pause, now: () => new Date(checkedAt) };

  beforeEach(async () => {
    root = await storage.mkdtemp(join(tmpdir(), 'passport-sync-'));
    options = {
      directory: join(root, 'published'),
      baselineDirectory: join(root, 'bundled'),
      acceptLargeChange: true,
      visaPages: {},
    };
    await storage.mkdir(options.baselineDirectory);
    request.mockReset().mockImplementation(async input => articleResponse(input));
    pause.mockReset().mockResolvedValue(undefined);
  });
  afterEach(async () => {
    await storage.rm(root, { recursive: true, force: true });
  });

  it('only writes a report unless publication or a baseline is requested', async () => {
    const result = await runSync(options, dependencies);
    expect(result.exitCode).toBe(0);
    expect(result.report).toMatchObject({ checkedAt, articles: 199, missingCells: 0, issues: [] });
    expect(await storage.readdir(options.directory)).toEqual(['last-check.json']);
    expect(await storage.readdir(options.baselineDirectory)).toEqual([]);
  });

  it('archives the served snapshot, publishes atomically, and writes the requested baseline', async () => {
    await storage.writeFile(join(options.baselineDirectory, `${bundled.id}.json`), JSON.stringify(bundled));
    const rename = vi.fn(storage.rename);
    const result = await runSync(
      { ...options, publish: true, baseline: true },
      { ...dependencies, storage: { ...storage, rename } }
    );
    expect(result.exitCode).toBe(0);
    expect(rename).toHaveBeenCalledWith(
      join(options.directory, 'current.json.tmp'),
      join(options.directory, 'current.json')
    );
    expect(JSON.parse(await storage.readFile(join(options.directory, 'current.json'), 'utf8'))).toEqual(
      result.snapshot
    );
    expect(JSON.parse(await storage.readFile(join(options.baselineDirectory, '2026-09-29.json'), 'utf8'))).toEqual(
      result.snapshot
    );
    const archived = await storage.readdir(join(options.directory, 'history'));
    expect(archived).toHaveLength(1);
    expect(JSON.parse(await storage.readFile(join(options.directory, 'history', archived[0]!), 'utf8'))).toEqual(
      bundled
    );
    expect(await storage.readdir(options.directory)).not.toContain('sync.lock');
    expect(await storage.readdir(options.directory)).not.toContain('current.json.tmp');
  });

  it('quarantines missing articles even when large changes are accepted and preserves current data', async () => {
    await storage.mkdir(options.directory);
    const previous = JSON.stringify(bundled);
    await storage.writeFile(join(options.directory, 'current.json'), previous);
    request.mockImplementation(async () => Response.json({ query: { pages: [] } }));
    const result = await runSync({ ...options, publish: true, baseline: true }, dependencies);
    expect(result.exitCode).toBe(2);
    expect(result.report.missingPages).toHaveLength(199);
    expect(result.report.issues).toContain('More than 2% of rules are missing from Wikipedia');
    expect(await storage.readFile(join(options.directory, 'current.json'), 'utf8')).toBe(previous);
    expect(await storage.readdir(options.baselineDirectory)).toEqual([]);
    expect(await storage.readdir(join(options.directory, 'quarantine'))).toEqual(['2026-09-29-wikipedia.json']);
    expect(await storage.readdir(options.directory)).not.toContain('sync.lock');
  });

  it('requires acceptance before publishing a large first snapshot', async () => {
    const result = await runSync({ ...options, acceptLargeChange: false, publish: true }, dependencies);
    expect(result.exitCode).toBe(2);
    expect(result.report.issues).toEqual(['More than 5% of rules changed; human review required']);
    expect(await storage.readdir(options.directory)).not.toContain('current.json');
  });

  it('honors retry delays and releases the lock after a failed request', async () => {
    request.mockImplementation(async () => new Response('', { status: 503, headers: { 'Retry-After': '7' } }));
    await expect(runSync(options, dependencies)).rejects.toThrow('Wikipedia API: HTTP 503');
    expect(request).toHaveBeenCalledTimes(4);
    expect(pause.mock.calls).toEqual([[7], [7], [8]]);
    expect(await storage.readdir(options.directory)).toEqual([]);
  });

  it('preserves the current file and releases the lock if the atomic rename fails', async () => {
    await storage.mkdir(options.directory);
    const previous = JSON.stringify(bundled);
    await storage.writeFile(join(options.directory, 'current.json'), previous);
    const rename = vi.fn<typeof storage.rename>().mockRejectedValue(new Error('rename failed'));
    await expect(
      runSync({ ...options, publish: true }, { ...dependencies, storage: { ...storage, rename } })
    ).rejects.toThrow('rename failed');
    expect(await storage.readFile(join(options.directory, 'current.json'), 'utf8')).toBe(previous);
    expect(await storage.readdir(options.directory)).not.toContain('sync.lock');
  });

  it('does not fetch or remove a lock owned by another run', async () => {
    await storage.mkdir(options.directory);
    await storage.writeFile(join(options.directory, 'sync.lock'), 'another run');
    await expect(runSync(options, dependencies)).rejects.toMatchObject({ code: 'EEXIST' });
    expect(request).not.toHaveBeenCalled();
    expect(await storage.readFile(join(options.directory, 'sync.lock'), 'utf8')).toBe('another run');
  });

  it('keeps the notes on each rule and links the official sites that still exist', async () => {
    const rows: Record<string, string> = {
      BH: '{{yes2|eVisa}}<ref>{{cite web|url=https://www.evisa.gov.bh/|title=eVisa}}</ref> || || * Must arrive by air.',
      GN: '{{yes2|eVisa}}<ref>{{cite web|url=https://www.paf.gov.gn/visa}}</ref> || ||',
      KE: '{{yes2|Electronic Travel Authorisation}}<ref>[https://www.etakenya.go.ke/gone eTA]</ref> || ||',
      LA: `{{yes-no|Visa on arrival}} || 30 days || {{#section-h::${sharedNotesTitle}|Laos. Visa on arrival}}`,
    };
    const withNotes = [
      '{| class="wikitable"',
      '! Country !! Visa requirement !! Allowed stay !! Notes',
      ...Object.keys(wikipediaPages).map(
        code => `|-\n| {{flag|${countryName(code)}}} || ${rows[code] ?? '{{yes|Visa not required}} || 30 days ||'}`
      ),
      '|}',
    ].join('\n');
    const shared = '== Laos. Visa on arrival ==\n* Available at Vientiane airport.';
    const sites: Record<string, number> = {
      'https://www.evisa.gov.bh/': 200,
      'https://www.paf.gov.gn/visa': 500,
      'https://www.paf.gov.gn/': 500,
      'https://www.etakenya.go.ke/gone': 404,
      'https://www.etakenya.go.ke/': 404,
    };
    request.mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      if (url.hostname !== 'en.wikipedia.org') {
        // Redirects are followed, as a browser would.
        expect(init?.redirect).toBeUndefined();
        if (url.hostname === 'evisa.gov.so' || url.hostname === 'evisa.gov.mz')
          throw new TypeError('fetch failed', {
            cause: Object.assign(new Error('lookup failed'), { code: 'ENOTFOUND' }),
          });
        // The government address forwards to a page that is gone.
        if (url.hostname === 'www.evisamada.gov.mg')
          return Object.defineProperties(new Response(null, { status: 404 }), {
            redirected: { value: true },
            url: { value: 'https://evisamada-mg.com/en/' },
          });
        return new Response(null, { status: sites[url.href] ?? 599 });
      }
      const titles = url.searchParams.get('titles')!.split('|');
      return Response.json({
        query: {
          pages: titles.map((title, index) => ({
            title,
            revisions: [
              {
                revid: index + 1,
                timestamp: '2026-09-25T00:00:00Z',
                slots: { main: { content: title === sharedNotesTitle ? shared : withNotes } },
              },
            ],
          })),
        },
      });
    });
    const visaPages = {
      GB: 'https://www.gov.uk/check-uk-visa',
      KE: 'https://www.etakenya.go.ke/gone',
      MG: 'http://www.evisamada.gov.mg/en/',
      MZ: 'https://evisa.gov.mz/',
      SO: 'https://evisa.gov.so/',
    };
    sites['https://www.gov.uk/check-uk-visa'] = 200;
    // Public resolvers know Mozambique's name, so its failed lookup was the local resolver's; Somalia's is gone.
    const resolves = vi.fn(async (host: string) => host === 'evisa.gov.mz');
    const { snapshot, report, exitCode } = await runSync({ ...options, visaPages }, { ...dependencies, resolves });
    expect(exitCode).toBe(0);
    expect(snapshot.sharedNotes?.title).toBe(sharedNotesTitle);
    // A chosen visa page that is gone is left out until someone replaces it; one that couldn't be checked stays.
    expect(snapshot.visaPages).toEqual({ GB: 'https://www.gov.uk/check-uk-visa', MZ: 'https://evisa.gov.mz/' });
    expect(report.droppedVisaPages).toEqual([
      'KE: https://www.etakenya.go.ke/gone (HTTP 404)',
      'MG: http://www.evisamada.gov.mg/en/ (HTTP 404 at https://evisamada-mg.com/en/)',
      'SO: https://evisa.gov.so/ (no such host name)',
    ]);
    expect(report.unverifiedVisaPages).toEqual(['MZ: https://evisa.gov.mz/ (ENOTFOUND)']);
    expect(notesFor(snapshot.notes, 'NZ', 'BH')).toEqual(['Must arrive by air.']);
    expect(notesFor(snapshot.notes, 'NZ', 'LA')).toEqual(['Available at Vientiane airport.']);
    expect(notesFor(snapshot.notes, 'NZ', 'JP')).toEqual([]);
    expect(snapshot.notes?.texts).toHaveLength(2);
    // Guinea's site gave a server error, which may pass, so it stays; Kenya's page and home page are gone.
    expect(snapshot.officialSites).toEqual({
      BH: { 'e-visa': { url: 'https://www.evisa.gov.bh/', citations: 198 } },
      GN: { 'e-visa': { url: 'https://www.paf.gov.gn/visa', citations: 198 } },
    });
    expect(report).toMatchObject({
      notes: { rules: 198 * 2, notes: 198 * 2 },
      officialSites: 2,
      unverifiedSites: ['GN e-visa: https://www.paf.gov.gn/visa (HTTP 500), https://www.paf.gov.gn/ (HTTP 500)'],
      droppedSites: ['KE eta: https://www.etakenya.go.ke/gone (HTTP 404), https://www.etakenya.go.ke/ (HTTP 404)'],
      issues: [],
    });
  });

  it('holds back a snapshot whose shared notes are missing', async () => {
    request.mockImplementation(async input => {
      const response = await articleResponse(input).json();
      response.query.pages = response.query.pages.filter((page: { title: string }) => page.title !== sharedNotesTitle);
      return Response.json(response);
    });
    const result = await runSync({ ...options, publish: true }, dependencies);
    expect(result.exitCode).toBe(2);
    expect(result.report.issues).toEqual(['Shared notes not found']);
    expect(await storage.readdir(options.directory)).not.toContain('current.json');
  });

  it('uses the injected clock to replace recent revisions with settled ones', async () => {
    const title = wikipediaPages.NZ!;
    request.mockImplementation(async input => {
      const url = new URL(String(input));
      const response = articleResponse(input);
      const data = await response.json();
      for (const page of data.query.pages) {
        if (page.title === title) {
          page.revisions[0].timestamp = url.searchParams.has('rvstart') ? '2026-09-25T00:00:00Z' : checkedAt;
          page.revisions[0].revid = url.searchParams.has('rvstart') ? 100 : 101;
        }
      }
      return Response.json(data);
    });
    const result = await runSync(options, dependencies);
    expect(result.snapshot.pages?.NZ).toMatchObject({ revision: 100, edited: '2026-09-25T00:00:00Z' });
    const settledRequest = request.mock.calls
      .map(([input]) => new URL(String(input)))
      .find(url => url.searchParams.has('rvstart'));
    expect(settledRequest?.searchParams.get('rvstart')).toBe('2026-09-28T12:00:00.000Z');
    expect(settledRequest?.searchParams.get('titles')).toBe(title);
  });
});
