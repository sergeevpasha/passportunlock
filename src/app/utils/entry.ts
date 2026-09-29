import type { EntryRule, EntryType } from '#shared/passports';

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

export function stayLabel(rule: EntryRule) {
  if (rule.days) return `${rule.days} days`;
  if (rule.status === 'domestic') return 'Not counted';
  if (rule.status === 'visa required') return 'Apply before travel';
  if (rule.status === 'e-visa' || rule.status === 'eta') return 'Approval before travel';
  if (rule.status === 'no admission') return 'Check restrictions';
  return 'Stay not specified';
}

export function dateLabel(value: string, month: 'short' | 'long' = 'short') {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`)
  );
}
