import * as storage from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runSync } from '../scripts/passport-sync';
import { countryName } from '#shared/countries';
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
  let options: { directory: string; baselineDirectory: string; acceptLargeChange: boolean };
  const request = vi.fn<typeof fetch>();
  const pause = vi.fn<(seconds: number) => Promise<void>>();
  const dependencies = { fetch: request, pause, now: () => new Date(checkedAt) };

  beforeEach(async () => {
    root = await storage.mkdtemp(join(tmpdir(), 'passport-sync-'));
    options = { directory: join(root, 'published'), baselineDirectory: join(root, 'bundled'), acceptLargeChange: true };
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
