// What a rule asks of a traveller beyond its entry type and stay: the notes the source gives for it, and the
// destination government's own site for the visa or eTA.
import type { EntryType, RequirementType, VisaMatrix } from './passports.ts';

/** The entry types that need something arranged before the trip or at the border. Each has its own official site: a
 * passport that needs an embassy visa usually can't use the destination's eVisa site. */
export const approvalKinds = [
  'e-visa',
  'visa on arrival',
  'visa required',
  'eta',
] as const satisfies readonly RequirementType[];
export type ApprovalKind = (typeof approvalKinds)[number];

/** The approval an entry type needs. Visa-free entry needs none. */
export function approvalKind(status: EntryType): ApprovalKind | undefined {
  return approvalKinds.find(kind => kind === status);
}

export interface OfficialSite {
  url: string;
  /** How many passports' rules for the destination cite the site. */
  citations: number;
}
export type OfficialSites = Record<string, Partial<Record<ApprovalKind, OfficialSite>>>;

/** Notes stored once each, since many repeat across passports, and by passport and then destination as indexes into
 * `texts`. Only rules with notes are listed. */
export interface RuleNotes {
  texts: string[];
  rules: Record<string, Record<string, number[]>>;
}

/** Whether a host belongs to the destination's government: under its own gov.xx-style domain (evisa.gov.bh,
 * voyage.gouv.tg, k-eta.go.kr, immigration.govt.nz), its foreign ministry's (evisa.mfa.am) or, for the United States,
 * .gov. Agencies that resell visas at a mark-up register look-alike names under any other domain, so nothing else
 * counts. */
export function isGovernmentHost(host: string, destination: string) {
  const name = host.toLowerCase().replace(/^www\./, '');
  if (destination === 'US') return /(?:^|\.)gov$/.test(name);
  if (destination === 'CA' && /(?:^|\.)canada\.ca$/.test(name)) return true;
  if (destination === 'CH' && /(?:^|\.)admin\.ch$/.test(name)) return true;
  const topLevel = destination === 'GB' ? 'uk' : destination.toLowerCase();
  return new RegExp(`(?:^|\\.)(?:gov|gouv|gob|go|govt|gub|gv|gc|e-?gov|mfa|mofa)\\.${topLevel}$`).test(name);
}

interface Tally {
  passports: Set<string>;
  /** How often each spelling of the address is cited. */
  spellings: Map<string, number>;
}

const emptyTally = (): Tally => ({ passports: new Set(), spellings: new Map() });

function count(tally: Tally, passport: string, spelling: string) {
  tally.passports.add(passport);
  tally.spellings.set(spelling, (tally.spellings.get(spelling) ?? 0) + 1);
}

/** The spelling cited most, preferring https and then the shortest on a tie. */
const mostCited = (tally: Tally) =>
  [...tally.spellings].sort(
    ([a, x], [b, y]) =>
      y - x ||
      Number(b.startsWith('https:')) - Number(a.startsWith('https:')) ||
      a.length - b.length ||
      a.localeCompare(b)
  )[0]![0];

/** The cited government sites for each destination and approval, best first. Only a rule's own citations count, and
 * only for rules that need an approval: visa-free rules cite treaties and lists. A host needs `minimum` passports
 * whose rules of that entry type cite it, so that one edit can't add a site. Its addresses follow: each page that as
 * many passports cite, most cited first, and then its home page. */
export function officialSiteCandidates(
  cited: Record<string, Record<string, string[]>>,
  matrix: VisaMatrix,
  minimum = 5
) {
  const hosts = new Map<string, Tally & { pages: Map<string, Tally> }>();
  for (const [passport, destinations] of Object.entries(cited)) {
    for (const [destination, urls] of Object.entries(destinations)) {
      const kind = approvalKind(matrix[passport]?.[destination]?.status ?? 'unknown');
      if (!kind) continue;
      for (const url of urls) {
        let parsed: URL;
        try {
          parsed = new URL(url);
        } catch {
          continue;
        }
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        if (!/^https?:$/.test(parsed.protocol) || !isGovernmentHost(host, destination)) continue;
        const key = `${destination}|${kind}|${host}`;
        const entry = hosts.get(key) ?? { ...emptyTally(), pages: new Map<string, Tally>() };
        hosts.set(key, entry);
        count(entry, passport, parsed.host);
        // One page however it is spelled: http or https, with or without www, a trailing slash or an empty fragment.
        const path = `${parsed.pathname.replace(/\/+$/, '')}${parsed.search}${parsed.hash.replace(/^#\/?$/, '')}`;
        const page = entry.pages.get(path) ?? emptyTally();
        entry.pages.set(path, page);
        count(page, passport, url);
      }
    }
  }
  const candidates: Record<string, Partial<Record<ApprovalKind, { citations: number; urls: string[] }[]>>> = {};
  const ranked = [...hosts].sort(([a, x], [b, y]) => y.passports.size - x.passports.size || a.localeCompare(b));
  for (const [key, entry] of ranked) {
    if (entry.passports.size < minimum) continue;
    const [destination, kind] = key.split('|') as [string, ApprovalKind];
    const pages = [...entry.pages]
      .filter(([, page]) => page.passports.size >= minimum)
      .sort(([, a], [, b]) => b.passports.size - a.passports.size)
      .slice(0, 2);
    // Written the way a browser writes them, so one page is always the same address.
    const urls = pages.map(([, page]) => new URL(mostCited(page).replace(/#\/?$/, '')).href);
    if (!pages.some(([path]) => !path)) urls.push(`https://${mostCited(entry)}/`);
    ((candidates[destination] ??= {})[kind] ??= []).push({ citations: entry.passports.size, urls });
  }
  return candidates;
}

/** Stores each distinct note once. */
export function indexNotes(notes: Record<string, Record<string, string[]>>): RuleNotes {
  const texts: string[] = [];
  const positions = new Map<string, number>();
  const rules: RuleNotes['rules'] = {};
  for (const [passport, destinations] of Object.entries(notes)) {
    for (const [destination, list] of Object.entries(destinations)) {
      if (!list.length) continue;
      (rules[passport] ??= {})[destination] = list.map(text => {
        if (!positions.has(text)) positions.set(text, texts.push(text) - 1);
        return positions.get(text)!;
      });
    }
  }
  return { texts, rules };
}

export function notesFor(notes: RuleNotes | undefined, passport: string, destination: string) {
  return notes?.rules[passport]?.[destination]?.map(index => notes.texts[index]!) ?? [];
}

const markup = /\{\{|\}\}|\[\[|\]\]|<\/?[a-z!]/i;

/** Validates stored notes: plain text, and indexes that point at a note, for rules between known countries. */
export function parseNotes(input: unknown, codes: string[]): RuleNotes {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid notes');
  const { texts, rules } = input as Record<string, unknown>;
  if (
    !Array.isArray(texts) ||
    texts.some(text => typeof text !== 'string' || !text.trim() || text.length > 5000 || markup.test(text))
  )
    throw new Error('Invalid note text');
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) throw new Error('Invalid notes');
  for (const [passport, destinations] of Object.entries(rules)) {
    if (!codes.includes(passport) || !destinations || typeof destinations !== 'object' || Array.isArray(destinations))
      throw new Error(`Invalid notes: ${passport}`);
    for (const [destination, list] of Object.entries(destinations)) {
      if (destination === passport || !codes.includes(destination)) throw new Error(`Invalid notes: ${passport}`);
      if (
        !Array.isArray(list) ||
        !list.length ||
        list.length > 50 ||
        list.some(index => !Number.isInteger(index) || index < 0 || index >= texts.length)
      )
        throw new Error(`Invalid notes: ${passport} → ${destination}`);
    }
  }
  return { texts: texts as string[], rules: rules as RuleNotes['rules'] };
}

/** Validates stored official sites: a web address on the destination government's own domain for each approval. */
export function parseOfficialSites(input: unknown, codes: string[]): OfficialSites {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid official sites');
  for (const [destination, sites] of Object.entries(input)) {
    if (!codes.includes(destination) || !sites || typeof sites !== 'object' || Array.isArray(sites))
      throw new Error(`Invalid official sites: ${destination}`);
    for (const [kind, site] of Object.entries(sites as Record<string, unknown>)) {
      const { url, citations } = (site ?? {}) as Record<string, unknown>;
      let valid = approvalKinds.includes(kind as ApprovalKind) && Number.isInteger(citations) && Number(citations) > 0;
      try {
        const parsed = new URL(String(url));
        valid &&= /^https?:$/.test(parsed.protocol) && isGovernmentHost(parsed.hostname, destination);
      } catch {
        valid = false;
      }
      if (!valid) throw new Error(`Invalid official site: ${destination} ${kind}`);
    }
  }
  return input as OfficialSites;
}

/** Validates stored visa information pages: a web address for known destinations. */
export function parseVisaPages(input: unknown, codes: string[]): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid visa pages');
  for (const [destination, url] of Object.entries(input)) {
    let valid = codes.includes(destination) && typeof url === 'string';
    try {
      valid &&= /^https?:$/.test(new URL(String(url)).protocol);
    } catch {
      valid = false;
    }
    if (!valid) throw new Error(`Invalid visa page: ${destination}`);
  }
  return input as Record<string, string>;
}

export type NoteLabel = 'Exception' | 'ID card' | 'Fee' | 'Health' | 'Where to enter' | 'Registration' | 'Stay';
// The first that fits names a note on the page, so a reader can find the fee or the ID card rule at a glance.
const noteLabels: [NoteLabel, RegExp][] = [
  [
    'Exception',
    /\b(?:holders?|holding|those with|passengers with|travell?ers with)\b[^.]{0,80}\b(?:visas?|residen\w*|green cards?)\b|\bsubstitut|\bresiden\w* (?:permits?|cards?) (?:in|of|from|issued)\b/i,
  ],
  ['ID card', /\bID cards?\b|\bidentity cards?\b|\bnational identity\b/i],
  ['Fee', /\bfees?\b|\b(?:USD|EUR|GBP|US\$|€|£)\s?\d|\d\s?(?:USD|EUR|GBP)\b|\$\s?\d/i],
  [
    'Health',
    /\byellow fever\b|\bvaccinat|\bhealth (?:insurance|certificate|declaration)\b|\bmedical insurance\b|\bpolio\b/i,
  ],
  [
    'Where to enter',
    /\bonly (?:at|via|through|available at|be obtained at|issued at|if arriving (?:at|via))\b|\b(?:arrive|arriving|enter|entering|issued|available|obtained)\s+(?:only\s+)?(?:via|through|at)\b[^.]{0,80}\b(?:airports?|ports?|border|crossings?)\b|\bport of entry\b/i,
  ],
  [
    'Registration',
    /\bmust (?:pre-?)?register\b|\b(?:pre-?)?registration\b|\bregister (?:at|with|within|online|in the)\b|\barrival card\b|\blanding card\b/i,
  ],
  [
    'Stay',
    /\bwithin (?:any|a|each) \d|\bin any \d|\bin (?:a |any |each )?\d+[- ](?:day|month)s? period\b|\bon each visit\b|\bper (?:year|calendar)|\bextend|\bextension|\bmaximum stay\b|\bstays?\b/i,
  ],
];

/** What a note is about, for the label shown before it. Undefined when it fits none. */
export function noteLabel(note: string): NoteLabel | undefined {
  return noteLabels.find(([, pattern]) => pattern.test(note))?.[0];
}
