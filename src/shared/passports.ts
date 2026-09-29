export const requirementTypes = [
  'visa free',
  'visa on arrival',
  'eta',
  'e-visa',
  'visa required',
  'no admission',
] as const;
export type RequirementType = (typeof requirementTypes)[number];
export type EntryType = RequirementType | 'domestic' | 'unknown';
export interface EntryRule {
  status: EntryType;
  days?: number;
}
export type VisaMatrix = Record<string, Record<string, EntryRule>>;
/** The Wikipedia article revision a passport's rules were read from. */
export interface SnapshotPage {
  title: string;
  revision: number;
  /** When that revision was saved. */
  edited: string;
}
export interface Snapshot {
  id: string;
  source: string;
  sourceUrl: string;
  sourceDate: string;
  fetchedAt: string;
  revision: string;
  sha256: string;
  license?: string;
  /** The article revision behind each passport. */
  pages?: Record<string, SnapshotPage>;
  /** Destinations its article does not list are left out and shown as not confirmed. */
  matrix: VisaMatrix;
}
export const entryLabels: Record<EntryType, string> = {
  'visa free': 'Visa-free',
  'visa on arrival': 'Visa on arrival',
  eta: 'eTA required',
  'e-visa': 'eVisa required',
  'visa required': 'Visa required',
  'no admission': 'Entry restricted',
  domestic: 'Home country',
  unknown: 'Not confirmed',
};
/** What each entry type means for a traveller. */
export const entryDescriptions: Record<EntryType, string> = {
  'visa free':
    'No visa needed for a short visit. You may still be asked for an arrival form, an onward ticket or proof of funds.',
  'visa on arrival': 'You get the visa at the border, usually for a fee. Not every airport or land crossing issues it.',
  eta: 'Not a visa, but an approval you apply for online and must have before you travel, like the US ESTA or the UK ETA.',
  'e-visa': 'A visa you apply for online before you travel. It is still a visa, and approval can take several days.',
  'visa required': 'Apply for a visa before you travel, usually through an embassy or consulate.',
  'no admission': 'Entry is refused or restricted for this passport. Check official guidance for any exceptions.',
  domestic: 'The country that issued the passport. It is not counted as a destination.',
  unknown: 'No rule is listed for this destination. Don’t take that as permission to enter.',
};

/** Validates a passport × destination matrix. With `complete: false` a destination may be missing, which is then
 * shown as not confirmed; destinations must still be known countries other than the passport's own. */
export function parseMatrix(input: unknown, expectedCodes?: string[], { complete = true } = {}): VisaMatrix {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid matrix');
  const entries = Object.entries(input);
  const codes = entries.map(([code]) => code).sort();
  if (!codes.length || codes.some(code => !/^[A-Z]{2}$/.test(code))) throw new Error('Invalid country codes');
  if (expectedCodes && codes.join(',') !== [...expectedCodes].sort().join(','))
    throw new Error('Country coverage changed');
  const matrix: VisaMatrix = {};
  for (const [passport, rawRules] of entries) {
    if (!rawRules || typeof rawRules !== 'object' || Array.isArray(rawRules))
      throw new Error(`Invalid row: ${passport}`);
    const rules = rawRules as Record<string, unknown>;
    const destinations = Object.keys(rules).sort();
    const others = codes.filter(code => code !== passport);
    if (complete ? destinations.join(',') !== others.join(',') : destinations.some(code => !others.includes(code))) {
      throw new Error(`${complete ? 'Incomplete' : 'Invalid'} destination coverage: ${passport}`);
    }
    matrix[passport] = {};
    for (const [destination, raw] of Object.entries(rules)) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid entry rule');
      const { status, days } = raw as Record<string, unknown>;
      if (!requirementTypes.includes(status as RequirementType))
        throw new Error(`Unrecognized requirement: ${String(status)}`);
      if (days !== undefined && (!Number.isInteger(days) || Number(days) <= 0 || Number(days) > 3650)) {
        throw new Error('Invalid stay duration');
      }
      matrix[passport]![destination] = {
        status: status as RequirementType,
        ...(days === undefined ? {} : { days: Number(days) }),
      };
    }
  }
  return matrix;
}

export function ruleFor(matrix: VisaMatrix, passport: string, destination: string): EntryRule {
  if (passport === destination && matrix[passport]) return { status: 'domestic' };
  return matrix[passport]?.[destination] ?? { status: 'unknown' };
}

export function countsFor(matrix: VisaMatrix, passport: string) {
  const counts = Object.fromEntries(requirementTypes.map(status => [status, 0])) as Record<RequirementType, number>;
  for (const rule of Object.values(matrix[passport] ?? {})) {
    if (requirementTypes.includes(rule.status as RequirementType)) counts[rule.status as RequirementType]++;
  }
  return counts;
}

export function rulesDiffer(rules: EntryRule[]): boolean {
  return new Set(rules.map(rule => `${rule.status}:${rule.days ?? ''}`)).size > 1;
}

export function isVisaFree(rule: EntryRule) {
  return rule.status === 'visa free';
}

/** Which of the rules, by index, are the easiest way in: the least demanding entry type, then the longest stay when
 * every rule of that type states one. Home countries and unconfirmed rules are left out. Empty when the remaining rules
 * can't be told apart, so only real differences are marked. */
export function easiestRules(rules: EntryRule[]): number[] {
  const comparable = rules.flatMap((rule, index) => {
    const rank = requirementTypes.indexOf(rule.status as RequirementType);
    return rank < 0 ? [] : [{ index, rank, days: rule.days }];
  });
  const rank = Math.min(...comparable.map(rule => rule.rank));
  let easiest = comparable.filter(rule => rule.rank === rank);
  if (easiest.every(rule => rule.days)) {
    const longest = Math.max(...easiest.map(rule => rule.days!));
    easiest = easiest.filter(rule => rule.days === longest);
  }
  return easiest.length < comparable.length ? easiest.map(rule => rule.index) : [];
}

export type ComparisonFilter = 'all' | 'different' | 'shared' | 'combined';

/** The same access predicates drive both the destination list and its summary counts. */
export function matchesComparisonFilter(
  row: { code: string; rules: EntryRule[] },
  passportCodes: string[],
  filter: ComparisonFilter
) {
  if (filter === 'all') return true;
  if (filter === 'different') return rulesDiffer(row.rules);
  if (passportCodes.includes(row.code) || !row.rules.length) return false;
  return filter === 'shared' ? row.rules.every(isVisaFree) : row.rules.some(isVisaFree);
}

export function comparisonStats(rows: { code: string; rules: EntryRule[] }[], passportCodes: string[]) {
  const combined = rows.filter(row => matchesComparisonFilter(row, passportCodes, 'combined'));
  return {
    shared: rows.filter(row => matchesComparisonFilter(row, passportCodes, 'shared')).length,
    combined: combined.length,
    additional: combined.filter(row => !isVisaFree(row.rules[0]!)).length,
    differences: rows.filter(row => matchesComparisonFilter(row, passportCodes, 'different')).length,
  };
}

export function sourceAgeDays(sourceDate: string, now = new Date()): number {
  const date = Date.parse(`${sourceDate}T00:00:00Z`);
  if (!Number.isFinite(date)) throw new Error('Invalid source date');
  return Math.floor((now.getTime() - date) / 86_400_000);
}

/** Every rule that differs between two matrices, including one that only one of them lists. */
export function changedRules(before: VisaMatrix, after: VisaMatrix) {
  const changes: { passport: string; destination: string; before: EntryRule; after: EntryRule }[] = [];
  for (const passport of new Set([...Object.keys(before), ...Object.keys(after)])) {
    for (const destination of new Set([
      ...Object.keys(before[passport] ?? {}),
      ...Object.keys(after[passport] ?? {}),
    ])) {
      const pair = { before: ruleFor(before, passport, destination), after: ruleFor(after, passport, destination) };
      if (rulesDiffer([pair.before, pair.after])) changes.push({ passport, destination, ...pair });
    }
  }
  return changes;
}
