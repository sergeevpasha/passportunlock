export const maxPassports = 3;
const defaultPassports = ['SG', 'US'];

export interface PassportSelection {
  code: string;
  snapshot?: string;
}

function uniqueSelections(selections: PassportSelection[]): PassportSelection[] {
  const seen = new Set<string>();
  return selections
    .map(selection => ({ ...selection, code: selection.code.toUpperCase() }))
    .filter(({ code }) => {
      if (seen.has(code)) return false;
      seen.add(code);
      return true;
    })
    .slice(0, maxPassports);
}

/** Decode page and API queries identically, retaining the first snapshot for a repeated passport. */
export function parseComparisonQuery(query: Record<string, unknown>): PassportSelection[] {
  const selections: PassportSelection[] = [];
  for (let index = 1; index <= maxPassports; index++) {
    const code =
      query[`p${index}`] ?? (index === 1 || query.p1 === undefined ? defaultPassports[index - 1] : undefined);
    if (code === undefined) continue;
    const snapshot = query[`s${index}`] ?? 'latest';
    if (typeof code !== 'string' || !/^[a-z]{2}$/i.test(code) || typeof snapshot !== 'string') {
      throw new Error('Choose a supported passport.');
    }
    selections.push({ code, snapshot });
  }
  return uniqueSelections(selections);
}

/** Snapshot-free selections produce canonical links; selected snapshots produce shareable views. */
export function comparisonQuery(selections: PassportSelection[]): Record<string, string> {
  return Object.fromEntries(
    uniqueSelections(selections).flatMap(({ code, snapshot }, index) => [
      [`p${index + 1}`, code.toLowerCase()],
      ...(snapshot === undefined ? [] : [[`s${index + 1}`, snapshot]]),
    ])
  );
}
