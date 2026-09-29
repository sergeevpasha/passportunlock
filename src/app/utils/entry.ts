import type { EntryType } from '#shared/passports';

export const entryShortLabels: Record<EntryType, string> = {
  'visa free': 'Visa-free',
  'visa on arrival': 'On arrival',
  eta: 'eTA',
  'e-visa': 'eVisa',
  'visa required': 'Visa required',
  'no admission': 'Restricted',
  domestic: 'Home country',
  unknown: 'Not confirmed',
};

export function dateLabel(value: string, month: 'short' | 'long' = 'short') {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`)
  );
}
