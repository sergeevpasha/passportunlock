import { changedRules, type EntryRule, type VisaMatrix } from './passports.ts';

export interface RuleChange {
  /** The date of the first snapshot that showed the rule as it is now. */
  on: string;
  /** The rule before that. */
  was: EntryRule;
}

export interface RuleHistory {
  /** The date of the first snapshot compared; a rule without a change has been the same since then. */
  since: string;
  /** The latest change of each rule that changed since then, by passport and destination. */
  changes: Record<string, Record<string, RuleChange>>;
}

interface Dated {
  sourceDate: string;
  matrix: VisaMatrix;
  history?: RuleHistory;
}

/** Carries the history to a new snapshot of `matrix` dated `date`: each rule that differs from the previous
 * snapshot's changed on that date. */
export function nextHistory(previous: Dated | undefined, matrix: VisaMatrix, date: string): RuleHistory {
  if (!previous) return { since: date, changes: {} };
  const history = previous.history ?? { since: previous.sourceDate, changes: {} };
  const changes = structuredClone(history.changes);
  for (const change of changedRules(previous.matrix, matrix))
    (changes[change.passport] ??= {})[change.destination] = { on: date, was: change.before };
  return { since: history.since, changes };
}

/** The history of the last of `snapshots`, oldest first, for snapshots that predate stored histories. */
export function historyOf(snapshots: Dated[]): RuleHistory | undefined {
  let previous: Dated | undefined;
  for (const snapshot of snapshots) {
    previous = {
      ...snapshot,
      history: snapshot.history ?? nextHistory(previous, snapshot.matrix, snapshot.sourceDate),
    };
  }
  return previous?.history;
}

/** Validates a stored history: dates, and earlier rules for known countries. */
export function parseHistory(input: unknown, codes: string[]): RuleHistory {
  const date = /^\d{4}-\d{2}-\d{2}$/;
  const { since, changes } = (input ?? {}) as Record<string, unknown>;
  if (typeof since !== 'string' || !date.test(since) || !changes || typeof changes !== 'object')
    throw new Error('Invalid history');
  for (const [passport, destinations] of Object.entries(changes)) {
    if (!codes.includes(passport) || !destinations || typeof destinations !== 'object')
      throw new Error(`Invalid history: ${passport}`);
    for (const [destination, change] of Object.entries(destinations as Record<string, unknown>)) {
      const { on, was } = (change ?? {}) as Record<string, unknown>;
      if (!codes.includes(destination) || typeof on !== 'string' || !date.test(on) || !was || typeof was !== 'object')
        throw new Error(`Invalid history: ${passport} → ${destination}`);
    }
  }
  return input as RuleHistory;
}
