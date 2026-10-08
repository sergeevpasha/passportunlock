import { createHash } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import * as filesystem from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  changedRules,
  parseMatrix,
  type EntryRule,
  type Snapshot,
  type SnapshotPage,
  type VisaMatrix,
} from '../shared/passports.ts';
import {
  approvalKinds,
  indexNotes,
  officialSiteCandidates,
  type OfficialSite,
  type OfficialSites,
} from '../shared/requirements.ts';
import { parsePolicyPage, type DestinationPolicy } from '../shared/destination-policy.ts';
import { historyOf, nextHistory } from '../shared/history.ts';
import { checkRules, materialDifference, type DestinationFacts, type PolicyReview } from '../shared/policy-checks.ts';
import { policyPages } from '../shared/policy-pages.ts';
import { policyReviews as chosenReviews } from '../shared/policy-reviews.ts';
import { coverageIssues, noteIssues, publicationIssues } from '../shared/sync-policy.ts';
import {
  missingSharedNotes,
  nameIndex,
  parseVisaPage,
  sharedNoteSections,
  sharedNotesTitle,
  wikipediaSource,
} from '../shared/wikipedia.ts';
import { visaPages as chosenVisaPages } from '../shared/visa-pages.ts';
import { wikipediaPages } from '../shared/wikipedia-pages.ts';

interface SyncOptions {
  publish?: boolean;
  baseline?: boolean;
  acceptLargeChange?: boolean;
  contact?: string;
  directory?: string;
  baselineDirectory?: string;
  /** Each destination's official visa information page; `visaPages` from shared/visa-pages.ts by default. */
  visaPages?: Record<string, string>;
  /** Reviews of destinations whose own visa policy differs; `policyReviews` from shared/policy-reviews.ts by default. */
  policyReviews?: Record<string, PolicyReview>;
  /** The module that imports the bundled snapshot, which a baseline points at the new one. */
  dataModule?: string;
}

interface SyncDependencies {
  fetch?: typeof fetch;
  now?: () => Date;
  pause?: (seconds: number) => Promise<void>;
  storage?: Pick<typeof filesystem, 'mkdir' | 'open' | 'readdir' | 'readFile' | 'rename' | 'unlink' | 'writeFile'>;
  log?: (message: string) => void;
  /** Whether a host name exists, asked of public resolvers: false when it doesn't, undefined when they don't answer. */
  resolves?: (host: string) => Promise<boolean | undefined>;
}

/** Asks public resolvers directly, since the resolver inside Docker Desktop fails now and then for names that exist. */
async function publicLookup(host: string) {
  const resolver = new Resolver({ timeout: 5000, tries: 2 });
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  const answers = await Promise.allSettled([resolver.resolve4(host), resolver.resolve6(host)]);
  if (answers.some(answer => answer.status === 'fulfilled')) return true;
  const codes = answers.map(answer => (answer as PromiseRejectedResult).reason?.code);
  return codes.every(code => code === 'ENOTFOUND' || code === 'ENODATA') && codes.includes('ENOTFOUND')
    ? false
    : undefined;
}

/** Importing the workflow has no side effects. Only an explicit run takes a lock, fetches articles and writes files. */
export async function runSync(options: SyncOptions = {}, dependencies: SyncDependencies = {}) {
  const {
    publish = false,
    baseline = false,
    acceptLargeChange = false,
    visaPages = chosenVisaPages,
    policyReviews = chosenReviews,
  } = options;
  const directory = resolve(options.directory ?? '.data/passports');
  const baselineDirectory = resolve(options.baselineDirectory ?? 'server/data');
  const dataModule = resolve(options.dataModule ?? 'server/utils/passport-data.ts');
  const {
    fetch: request = fetch,
    now = () => new Date(),
    pause = (seconds: number) => new Promise<void>(done => setTimeout(done, seconds * 1000)),
    storage = filesystem,
    log = () => {},
    resolves = publicLookup,
  } = dependencies;
  const { mkdir, open, readdir, readFile, rename, unlink, writeFile } = storage;

  // Builds a snapshot from each passport's Wikipedia article. Report-only by default; --publish replaces the snapshot
  // the app serves and --baseline writes one to server/data for committing. Both refuse a candidate that fails a check;
  // --accept-large-change waives only the 5% change limit, after the report has been reviewed.

  // Wikimedia asks automated clients to say who runs them: set WIKIMEDIA_CONTACT to an email address or URL.
  const userAgent = `PassportUnlock-data-sync/1.0 (${options.contact || 'contact not configured'})`;
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

  async function query(params: Record<string, string>, attempt = 1): Promise<QueryResponse> {
    const search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', maxlag: '5', ...params });
    const response = await request(`https://en.wikipedia.org/w/api.php?${search}`, {
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
    const cutoff = new Date(now().getTime() - settleHours * 3_600_000).toISOString();
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

  const bundledNames = async () =>
    (await readdir(baselineDirectory)).filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();

  /** The snapshot the app serves now: the newest bundled one, unless a later one was published. None before the first
   * baseline. */
  async function servedSnapshot(directory: string): Promise<Snapshot | undefined> {
    const newest = (await bundledNames()).at(-1);
    const bundled = newest ? await readSnapshot(resolve(baselineDirectory, newest)) : undefined;
    try {
      const published = await readSnapshot(resolve(directory, 'current.json'));
      return bundled && bundled.sourceDate >= published.sourceDate ? bundled : published;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return bundled;
    }
  }

  const describe = (rule: EntryRule) => `${rule.status}${rule.days ? ` ${rule.days}d` : ''}`;

  // Certificate chains that leave out an intermediate certificate, which browsers fetch for themselves.
  const incompleteChain = new Set(['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);
  // Certificates a browser warns about.
  const refusedCertificate = new Set([
    'CERT_HAS_EXPIRED',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'ERR_TLS_CERT_ALTNAME_INVALID',
  ]);

  /** Whether an address still leads to a page, following redirects as a browser would. Only the site can show it is
   * gone: a missing page (404, 410) at the end of its redirects, a certificate a browser would refuse, or a name that
   * public resolvers say doesn't exist. Anything else may depend on the moment or on where the check runs from, so it
   * leaves the site unverified. A redirect loop needs the cookies a browser keeps, and a certificate chain missing an
   * intermediate is one browsers complete, so both count as answers. */
  async function checkSite(url: string): Promise<{ result: 'answers' | 'gone' | 'unverified'; detail: string }> {
    try {
      const response = await request(url, {
        signal: AbortSignal.timeout(20_000),
        headers: { 'User-Agent': userAgent },
      });
      await response.body?.cancel();
      const detail = `HTTP ${response.status}${response.redirected ? ` at ${response.url}` : ''}`;
      if (response.status === 404 || response.status === 410) return { result: 'gone', detail };
      return { result: response.status < 500 ? 'answers' : 'unverified', detail };
    } catch (error) {
      const { cause, name, message } = error as Error & { cause?: { code?: string; message?: string } };
      const detail = cause?.code ?? (name === 'TimeoutError' ? 'no answer in 20 s' : (cause?.message ?? message));
      if (incompleteChain.has(detail) || /redirect count exceeded/i.test(detail)) return { result: 'answers', detail };
      if (refusedCertificate.has(detail)) return { result: 'gone', detail };
      if (detail === 'ENOTFOUND' || detail === 'EAI_AGAIN') {
        const exists = await resolves(new URL(url).hostname);
        if (exists === false) return { result: 'gone', detail: 'no such host name' };
      }
      return { result: 'unverified', detail };
    }
  }

  /** For each destination and approval, the first candidate address that answers, trying https before http. When none
   * answers but one couldn't be verified, that one stays and the report lists it. */
  async function officialSites(candidates: ReturnType<typeof officialSiteCandidates>) {
    const sites: OfficialSites = {};
    const unverified: string[] = [];
    const gone: string[] = [];
    const checks = Object.entries(candidates).flatMap(([destination, kinds]) =>
      approvalKinds.flatMap(kind => (kinds[kind] ? [{ destination, kind, hosts: kinds[kind] }] : []))
    );
    async function check({ destination, kind, hosts }: (typeof checks)[number]) {
      const tried: string[] = [];
      let fallback: OfficialSite | undefined;
      for (const { citations, urls } of hosts.slice(0, 3)) {
        const tries = [...new Set(urls.flatMap(url => [url.replace(/^http:/, 'https:'), url]))];
        for (const url of tries) {
          const { result, detail } = await checkSite(url);
          if (result === 'answers') {
            (sites[destination] ??= {})[kind] = { url, citations };
            return;
          }
          tried.push(`${url} (${detail})`);
          if (result === 'unverified') fallback ??= { url, citations };
        }
      }
      if (fallback) (sites[destination] ??= {})[kind] = fallback;
      (fallback ? unverified : gone).push(`${destination} ${kind}: ${tried.join(', ')}`);
    }
    // A few at a time: each try is one request to a government server.
    for (let start = 0; start < checks.length; start += 4) await Promise.all(checks.slice(start, start + 4).map(check));
    return { sites, unverified: unverified.sort(), gone: gone.sort() };
  }

  /** The chosen visa information pages that are still there. Like the cited sites, one that couldn't be verified
   * stays and the report lists it. */
  async function checkedVisaPages() {
    const pages: Record<string, string> = {};
    const unverified: string[] = [];
    const gone: string[] = [];
    const entries = Object.entries(visaPages).sort(([a], [b]) => a.localeCompare(b));
    for (let start = 0; start < entries.length; start += 4) {
      await Promise.all(
        entries.slice(start, start + 4).map(async ([destination, url]) => {
          const { result, detail } = await checkSite(url);
          if (result !== 'gone') pages[destination] = url;
          if (result !== 'answers') (result === 'gone' ? gone : unverified).push(`${destination}: ${url} (${detail})`);
        })
      );
    }
    return { pages, unverified: unverified.sort(), gone: gone.sort() };
  }

  await mkdir(directory, { recursive: true });
  const lockPath = resolve(directory, 'sync.lock');
  const lock = await open(lockPath, 'wx');
  try {
    const current = await servedSnapshot(directory);
    const codes = Object.keys(wikipediaPages).sort();
    const index = nameIndex(codes);
    const policyTitles = [...new Set(codes.flatMap(code => policyPages[code] ?? []))];
    const articles = await fetchArticles([
      ...codes.map(code => wikipediaPages[code]!),
      sharedNotesTitle,
      ...policyTitles,
    ]);
    const shared = articles.get(sharedNotesTitle);
    const sections = sharedNoteSections(shared?.text ?? '');

    const matrix: VisaMatrix = {};
    const pages: Record<string, SnapshotPage> = {};
    const missing: Record<string, string[]> = {};
    const missingPages: string[] = [];
    const thinPages: string[] = [];
    const unreadable: string[] = [];
    const unknown = new Set<string>();
    const notes: Record<string, Record<string, string[]>> = {};
    const cited: Record<string, Record<string, string[]>> = {};
    const unreadableNotes: string[] = [];
    const missingNotes = new Set<string>();
    for (const code of codes) {
      const article = articles.get(wikipediaPages[code]!);
      const parsed = article && parseVisaPage(article.text, code, index, sections);
      const found = parsed ? Object.keys(parsed.rules).length : 0;
      if (!article) missingPages.push(code);
      else if (found < minimumDestinations) thinPages.push(`${code} (${found})`);
      const rules = article && parsed && found >= minimumDestinations ? parsed.rules : undefined;
      if (article && rules) pages[code] = { title: article.title, revision: article.revision, edited: article.edited };
      unreadable.push(...(parsed?.unreadable ?? []).map(entry => `${code} → ${entry}`));
      parsed?.unknown.forEach(name => unknown.add(name));
      if (article && parsed && rules) {
        notes[code] = parsed.notes;
        cited[code] = parsed.cited;
        unreadableNotes.push(...parsed.unreadableNotes.map(entry => `${code} → ${entry}`));
        if (shared) missingSharedNotes(article.text, sections).forEach(name => missingNotes.add(name));
      }
      matrix[code] = {};
      for (const destination of codes) {
        if (destination === code) continue;
        const rule = rules?.[destination];
        if (rule) matrix[code][destination] = rule;
        else (missing[code] ??= []).push(destination);
      }
    }
    parseMatrix(matrix, codes, { complete: false });

    // Each destination's own visa policy checks its rules, and corrects them where a review trusts it.
    const policies: Record<string, DestinationPolicy> = {};
    const policyRevisions: Record<string, SnapshotPage> = {};
    const missingPolicyPages: string[] = [];
    for (const destination of codes) {
      const article = policyPages[destination] ? articles.get(policyPages[destination]) : undefined;
      if (!article) {
        missingPolicyPages.push(destination);
        continue;
      }
      policies[destination] = parsePolicyPage(article.text, destination, index, now());
      policyRevisions[destination] = { title: article.title, revision: article.revision, edited: article.edited };
    }
    const checked = checkRules(matrix, policies, policyReviews);
    // A corrected rule's notes describe the rule it replaced.
    for (const [destination, passports] of Object.entries(checked.checks.corrected))
      for (const passport of passports) delete notes[passport]?.[destination];
    const destinationFacts: Record<string, DestinationFacts> = {};
    for (const [destination, { passportValidity, arrivalCard }] of Object.entries(policies)) {
      if (passportValidity || arrivalCard)
        destinationFacts[destination] = {
          ...(passportValidity && { passportValidity }),
          ...(arrivalCard && { arrivalCard }),
        };
    }

    const ruleNotes = indexNotes(notes);
    // Sites come from the cells that cite them, so they follow the rules those cells give.
    const { sites, unverified, gone } = await officialSites(officialSiteCandidates(cited, matrix));
    const visaInformation = await checkedVisaPages();

    const fetchedAt = now().toISOString();
    const sourceDate = fetchedAt.slice(0, 10);
    // Snapshots made before histories were stored get one from the bundled snapshots before them.
    let previous = current;
    if (current && !current.history) {
      const earlier: Snapshot[] = [];
      for (const name of await bundledNames()) {
        const snapshot = await readSnapshot(resolve(baselineDirectory, name));
        if (snapshot.sourceDate < current.sourceDate) earlier.push(snapshot);
      }
      previous = { ...current, history: historyOf([...earlier, current]) };
    }
    const history = nextHistory(previous, checked.matrix, sourceDate);
    const snapshot: Snapshot = {
      id: sourceDate,
      source: wikipediaSource.name,
      sourceUrl: wikipediaSource.url,
      sourceDate,
      fetchedAt,
      revision: createHash('sha256')
        .update(
          [
            ...Object.entries(pages),
            ...(shared ? [['shared', shared] as const] : []),
            ...Object.entries(policyRevisions).map(([code, page]) => [`policy:${code}`, page] as const),
          ]
            .map(([code, page]) => `${code}:${page.revision}`)
            .join('\n')
        )
        .digest('hex'),
      sha256: createHash('sha256')
        .update(
          JSON.stringify({
            matrix: checked.matrix,
            notes: ruleNotes,
            officialSites: sites,
            visaPages: visaInformation.pages,
            policyChecks: checked.checks,
            destinationFacts,
          })
        )
        .digest('hex'),
      license: wikipediaSource.license,
      pages,
      ...(shared && { sharedNotes: { title: shared.title, revision: shared.revision, edited: shared.edited } }),
      matrix: checked.matrix,
      notes: ruleNotes,
      officialSites: sites,
      visaPages: visaInformation.pages,
      policyPages: policyRevisions,
      policyChecks: checked.checks,
      destinationFacts,
      history,
    };

    const total = codes.length * (codes.length - 1);
    const changes = changedRules(current?.matrix ?? {}, checked.matrix).map(
      change => `${change.passport} → ${change.destination}: ${describe(change.before)} → ${describe(change.after)}`
    );
    const missingCells = Object.values(missing).reduce((sum, list) => sum + list.length, 0);
    const noteCount = Object.values(ruleNotes.rules)
      .flatMap(destinations => Object.values(destinations))
      .reduce((sum, list) => sum + list.length, 0);
    const siteChanges = Object.keys({ ...current?.officialSites, ...sites })
      .sort()
      .flatMap(destination =>
        approvalKinds.flatMap(kind => {
          const [before, after] = [current?.officialSites?.[destination]?.[kind]?.url, sites[destination]?.[kind]?.url];
          return before === after ? [] : [`${destination} ${kind}: ${before ?? 'none'} → ${after ?? 'none'}`];
        })
      );
    const issues = [
      ...publicationIssues(sourceDate, current?.sourceDate, changes.length, total, now()).filter(
        issue => !(acceptLargeChange && issue.startsWith('More than 5%'))
      ),
      ...coverageIssues({ missingPages, thinPages, missingCells, total }),
      ...noteIssues({
        sharedNotesFound: Boolean(shared),
        unreadable: unreadableNotes.length,
        total: noteCount + unreadableNotes.length,
      }),
    ];
    // Differences that change what a traveller does, by destination, for review.
    const differences = Object.entries(checked.checks.differs)
      .map(([destination, rules]) => {
        const material = Object.entries(rules).filter(([passport, listed]) =>
          materialDifference(checked.matrix[passport]![destination]!, listed)
        );
        const kinds = new Map<string, number>();
        for (const [passport, listed] of material) {
          const key = `${describe(checked.matrix[passport]![destination]!)} → ${describe(listed)}`;
          kinds.set(key, (kinds.get(key) ?? 0) + 1);
        }
        const top = [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 3);
        return { destination, count: material.length, summary: top.map(([key, n]) => `${key} ×${n}`).join(', ') };
      })
      .filter(entry => entry.count)
      .sort((a, b) => b.count - a.count);
    const confirmed = Object.values(checked.checks.confirmed).reduce((sum, list) => sum + list.length, 0);
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
      notes: { rules: Object.values(ruleNotes.rules).flatMap(Object.keys).length, notes: noteCount },
      unreadableNotes,
      missingSharedNotes: [...missingNotes].sort(),
      officialSites: Object.values(sites).flatMap(Object.keys).length,
      unverifiedSites: unverified,
      droppedSites: gone,
      officialSiteChanges: siteChanges,
      visaPages: Object.keys(visaInformation.pages).length,
      unverifiedVisaPages: visaInformation.unverified,
      droppedVisaPages: visaInformation.gone,
      policyPages: Object.keys(policyRevisions).length,
      missingPolicyPages,
      // Destination articles that list fewer than 20 passports are probably read badly; they confirm little.
      thinPolicyPages: Object.entries(policies)
        .filter(([, policy]) => Object.keys(policy.rules).length < 20)
        .map(([destination]) => destination),
      confirmedRules: confirmed,
      correctedRules: Object.fromEntries(
        Object.entries(checked.checks.corrected).map(([destination, passports]) => [destination, passports.length])
      ),
      policyDifferences: differences.map(entry => `${entry.destination}: ${entry.count} (${entry.summary})`),
      destinationFacts: Object.keys(destinationFacts).length,
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
    log(JSON.stringify(report, null, 2) + '\n');

    if (issues.length) {
      await mkdir(resolve(directory, 'quarantine'), { recursive: true });
      await writeFile(resolve(directory, 'quarantine', `${sourceDate}-wikipedia.json`), JSON.stringify(snapshot));
    } else {
      if (baseline) {
        await writeFile(resolve(baselineDirectory, `${sourceDate}.json`), JSON.stringify(snapshot) + '\n');
        // The app imports one bundled snapshot by name.
        try {
          const source = await readFile(dataModule, 'utf8');
          await writeFile(
            dataModule,
            source.replace(/(['"]\.\.\/data\/)\d{4}-\d{2}-\d{2}(\.json['"])/, `$1${sourceDate}$2`)
          );
          log(`Wrote server/data/${sourceDate}.json and pointed server/utils/passport-data.ts at it.\n`);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          log(`Wrote server/data/${sourceDate}.json. Import it in server/utils/passport-data.ts.\n`);
        }
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
        log(`Published atomically.${current ? ' Previous snapshot archived.' : ''}\n`);
      } else if (publish) log('No new snapshot to publish.\n');
      if (!publish && !baseline) log('Check complete; nothing was published.\n');
    }
    return { report, snapshot, exitCode: issues.length ? 2 : 0 };
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}
