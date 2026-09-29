import { entryLabels, type EntryRule } from '#shared/passports';

export function comparisonCsv(
  columns: { name: string; snapshot: { sourceDate: string; source: string; license?: string } }[],
  rows: { name: string; rules: EntryRule[] }[]
): string {
  const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = [
    [
      'Destination',
      // Wikipedia-derived data is CC BY-SA 4.0, which asks for attribution wherever it is shared.
      ...columns.map(
        ({ name, snapshot }) =>
          `${name} (${[snapshot.sourceDate, snapshot.source, snapshot.license].filter(Boolean).join('; ')})`
      ),
    ],
    ...rows.map(row => [
      row.name,
      ...row.rules.map(rule => `${entryLabels[rule.status]}${rule.days ? `; ${rule.days} days` : ''}`),
    ]),
  ];
  return '\uFEFF' + lines.map(row => row.map(cell).join(',')).join('\r\n');
}
