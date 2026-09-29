import { createHash } from 'node:crypto';
import { mkdir, open, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  changedRules,
  parseMatrix,
  type EntryRule,
  type Snapshot,
  type SnapshotPage,
  type VisaMatrix,
} from '../shared/passports.ts';
import { coverageIssues, publicationIssues } from '../shared/sync-policy.ts';
import { nameIndex, parseVisaPage, wikipediaSource } from '../shared/wikipedia.ts';
import { wikipediaPages } from '../shared/wikipedia-pages.ts';

// Builds a snapshot from each passport's Wikipedia article. Read-only by default; --publish replaces the snapshot
// the app serves and --baseline writes one to server/data for committing. Both refuse a candidate that fails a check;
// --accept-large-change waives only the 5% change limit, after the report has been reviewed.
const args = new Set(process.argv.slice(2));
const publish = args.has('--publish');
const baseline = args.has('--baseline');
const acceptLargeChange = args.has('--accept-large-change');

// Wikimedia asks automated clients to say who runs them: set WIKIMEDIA_CONTACT to an email address or URL.
const userAgent = `PassportUnlock-data-sync/1.0 (${process.env.WIKIMEDIA_CONTACT || 'contact not configured'})`;
// Revisions younger than this are passed over for the one before, so vandalism has time to be reverted.
const settleHours = 24;
// An article that yields fewer destinations is treated as broken and not used. Destinations an article does not
// list are left out of the snapshot, and the app shows them as not confirmed.
const minimumDestinations = 150;

interface Revision {
  revid: number;
  timestamp: string;
  slots: { main: { content: string } };
}
interface QueryResponse {
  query?: {
    pages?: { title: string; revisions?: Revision[] }[];
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
  };
  continue?: Record<string, string>;
  error?: { code: string; info: string };
}

const pause = (seconds: number) => new Promise(done => setTimeout(done, seconds * 1000));

async function query(params: Record<string, string>, attempt = 1): Promise<QueryResponse> {
  const search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', maxlag: '5', ...params });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${search}`, {
    signal: AbortSignal.timeout(60_000),
    headers: { 'User-Agent': userAgent },
  });
  const body = await response.text();
  if (body.length > 30_000_000) throw new Error('Wikipedia response is too large');
  const data = (response.ok ? JSON.parse(body) : {}) as QueryResponse;
  if (response.ok && !data.error) return data;
  // Rate limits and replication lag pass: wait as asked, a few times, then give up.
  if ((response.status === 429 || response.status >= 500 || data.error?.code === 'maxlag') && attempt < 4) {
    await pause(Math.max(Number(response.headers.get('retry-after')) || 0, 2 ** attempt));
    return query(params, attempt + 1);
  }
  throw new Error(`Wikipedia API: ${data.error?.info ?? `HTTP ${response.status}`}`);
}

/** Article text by requested title, fifty articles per request. */
async function fetchArticles(titles: string[]) {
  const articles = new Map<string, SnapshotPage & { text: string }>();
  const revisionFields = { prop: 'revisions', rvprop: 'ids|timestamp|content', rvslots: 'main' };
  for (let start = 0; start < titles.length; start += 50) {
    let next: Record<string, string> = {};
    do {
      const data = await query({
        ...revisionFields,
        redirects: '1',
        titles: titles.slice(start, start + 50).join('|'),
        ...next,
      });
      const requested = new Map<string, string>();
      for (const { from, to } of [...(data.query?.normalized ?? []), ...(data.query?.redirects ?? [])])
        requested.set(to, requested.get(from) ?? from);
      for (const page of data.query?.pages ?? []) {
        const revision = page.revisions?.[0];
        if (!revision) continue;
        articles.set(requested.get(page.title) ?? page.title, {
          title: page.title,
          revision: revision.revid,
          edited: revision.timestamp,
          text: revision.slots.main.content,
        });
      }
      next = data.continue ?? {};
    } while (Object.keys(next).length);
    await pause(1);
  }
  const cutoff = new Date(Date.now() - settleHours * 3_600_000).toISOString();
  for (const [title, article] of articles) {
    if (article.edited <= cutoff) continue;
    const data = await query({ ...revisionFields, titles: article.title, rvlimit: '1', rvstart: cutoff });
    const revision = data.query?.pages?.[0]?.revisions?.[0];
    if (revision)
      articles.set(title, {
        ...article,
        revision: revision.revid,
        edited: revision.timestamp,
        text: revision.slots.main.content,
      });
    await pause(1);
  }
  return articles;
}

async function readSnapshot(path: string) {
  return JSON.parse(await readFile(path, 'utf8')) as Snapshot;
}

/** The snapshot the app serves now: the newest bundled one, unless a later one was published. None before the first
 * baseline. */
async function servedSnapshot(directory: string): Promise<Snapshot | undefined> {
  const newest = (await readdir(resolve('server/data')))
    .filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort()
    .at(-1);
  const bundled = newest ? await readSnapshot(resolve('server/data', newest)) : undefined;
  try {
    const published = await readSnapshot(resolve(directory, 'current.json'));
    return bundled && bundled.sourceDate >= published.sourceDate ? bundled : published;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return bundled;
  }
}

const describe = (rule: EntryRule) => `${rule.status}${rule.days ? ` ${rule.days}d` : ''}`;

const directory = resolve('.data/passports');
await mkdir(directory, { recursive: true });
const lockPath = resolve(directory, 'sync.lock');
const lock = await open(lockPath, 'wx');
try {
  const current = await servedSnapshot(directory);
  const codes = Object.keys(wikipediaPages).sort();
  const index = nameIndex(codes);
  const articles = await fetchArticles(codes.map(code => wikipediaPages[code]!));

  const matrix: VisaMatrix = {};
  const pages: Record<string, SnapshotPage> = {};
  const missing: Record<string, string[]> = {};
  const missingPages: string[] = [];
  const thinPages: string[] = [];
  const unreadable: string[] = [];
  const unknown = new Set<string>();
  for (const code of codes) {
    const article = articles.get(wikipediaPages[code]!);
    const parsed = article && parseVisaPage(article.text, code, index);
    const found = parsed ? Object.keys(parsed.rules).length : 0;
    if (!article) missingPages.push(code);
    else if (found < minimumDestinations) thinPages.push(`${code} (${found})`);
    const rules = article && parsed && found >= minimumDestinations ? parsed.rules : undefined;
    if (article && rules) pages[code] = { title: article.title, revision: article.revision, edited: article.edited };
    unreadable.push(...(parsed?.unreadable ?? []).map(entry => `${code} → ${entry}`));
    parsed?.unknown.forEach(name => unknown.add(name));
    matrix[code] = {};
    for (const destination of codes) {
      if (destination === code) continue;
      const rule = rules?.[destination];
      if (rule) matrix[code][destination] = rule;
      else (missing[code] ??= []).push(destination);
    }
  }
  parseMatrix(matrix, codes, { complete: false });

  const fetchedAt = new Date().toISOString();
  const sourceDate = fetchedAt.slice(0, 10);
  const snapshot: Snapshot = {
    id: sourceDate,
    source: wikipediaSource.name,
    sourceUrl: wikipediaSource.url,
    sourceDate,
    fetchedAt,
    revision: createHash('sha256')
      .update(
        Object.entries(pages)
          .map(([code, page]) => `${code}:${page.revision}`)
          .join('\n')
      )
      .digest('hex'),
    sha256: createHash('sha256').update(JSON.stringify(matrix)).digest('hex'),
    license: wikipediaSource.license,
    pages,
    matrix,
  };

  const total = codes.length * (codes.length - 1);
  const changes = changedRules(current?.matrix ?? {}, matrix).map(
    change => `${change.passport} → ${change.destination}: ${describe(change.before)} → ${describe(change.after)}`
  );
  const missingCells = Object.values(missing).reduce((sum, list) => sum + list.length, 0);
  const issues = [
    ...publicationIssues(sourceDate, current?.sourceDate, changes.length, total).filter(
      issue => !(acceptLargeChange && issue.startsWith('More than 5%'))
    ),
    ...coverageIssues({ missingPages, thinPages, missingCells, total }),
  ];
  const report = {
    checkedAt: fetchedAt,
    sourceDate,
    comparedWith: current ? `${current.source} (${current.sourceDate})` : 'nothing yet (first snapshot)',
    articles: Object.keys(pages).length,
    oldestArticles: Object.entries(pages)
      .sort(([, a], [, b]) => a.edited.localeCompare(b.edited))
      .slice(0, 5)
      .map(([code, page]) => `${code} ${page.edited.slice(0, 10)}`),
    missingPages,
    thinPages,
    missingCells,
    unreadable,
    unknownDestinations: unknown.size,
    changed: changes.length,
    total,
    sampleChanges: changes.slice(0, 40),
    publishRequested: publish,
    baselineRequested: baseline,
    issues,
  };
  await writeFile(
    resolve(directory, 'last-check.json'),
    JSON.stringify({ ...report, changes, missing }, null, 2) + '\n'
  );
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');

  if (issues.length) {
    await mkdir(resolve(directory, 'quarantine'), { recursive: true });
    await writeFile(resolve(directory, 'quarantine', `${sourceDate}-wikipedia.json`), JSON.stringify(snapshot));
    process.exitCode = 2;
  } else {
    if (baseline) {
      await writeFile(resolve('server/data', `${sourceDate}.json`), JSON.stringify(snapshot) + '\n');
      process.stdout.write(`Wrote server/data/${sourceDate}.json. Import it in server/utils/passport-data.ts.\n`);
    }
    if (publish && (current?.sha256 !== snapshot.sha256 || current.sourceDate !== sourceDate)) {
      if (current) {
        await mkdir(resolve(directory, 'history'), { recursive: true });
        await writeFile(
          resolve(directory, 'history', `${current.id}-${current.sha256.slice(0, 12)}.json`),
          JSON.stringify(current)
        );
      }
      await writeFile(resolve(directory, 'current.json.tmp'), JSON.stringify(snapshot));
      await rename(resolve(directory, 'current.json.tmp'), resolve(directory, 'current.json'));
      process.stdout.write(`Published atomically.${current ? ' Previous snapshot archived.' : ''}\n`);
    } else if (publish) process.stdout.write('No new snapshot to publish.\n');
    if (!publish && !baseline) process.stdout.write('Check complete; nothing was published.\n');
  }
} finally {
  await lock.close();
  await unlink(lockPath);
}
