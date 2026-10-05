import { sourceAgeDays } from './passports.ts';

/** Checks a candidate against the snapshot served now, which is undefined before the first baseline. */
export function publicationIssues(
  sourceDate: string,
  currentDate: string | undefined,
  changed: number,
  total: number,
  now = new Date()
) {
  const age = sourceAgeDays(sourceDate, now);
  return [
    ...(age > 14 ? ['Source date is stale'] : []),
    ...(age < 0 ? ['Source date is in the future'] : []),
    ...(currentDate && sourceDate < currentDate ? ['Source date moved backwards'] : []),
    ...(sourceDate === currentDate && changed > 0 ? ['Rules changed without a new source date'] : []),
    ...(total <= 0 || changed / total > 0.05 ? ['More than 5% of rules changed; human review required'] : []),
  ];
}

/** Holds back a snapshot whose notes are incomplete: the shared notes several destinations' rows include are missing,
 * or more than 1% of notes kept markup that could not be read. */
export function noteIssues({
  sharedNotesFound,
  unreadable,
  total,
}: {
  sharedNotesFound: boolean;
  unreadable: number;
  total: number;
}) {
  return [
    ...(sharedNotesFound ? [] : ['Shared notes not found']),
    ...(total > 0 && unreadable / total > 0.01 ? ['More than 1% of notes are unreadable'] : []),
  ];
}

/** Holds back a Wikipedia snapshot when articles are missing or leave out too many destinations. */
export function coverageIssues({
  missingPages,
  thinPages,
  missingCells,
  total,
}: {
  missingPages: string[];
  thinPages: string[];
  missingCells: number;
  total: number;
}) {
  return [
    ...(missingPages.length ? [`Articles not found: ${missingPages.join(', ')}`] : []),
    ...(thinPages.length ? [`Articles with too few destinations: ${thinPages.join(', ')}`] : []),
    ...(total <= 0 || missingCells / total > 0.02 ? ['More than 2% of rules are missing from Wikipedia'] : []),
  ];
}
