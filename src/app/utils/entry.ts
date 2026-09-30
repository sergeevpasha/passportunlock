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

/** The badge colours of each entry type, shared by the badge component and lists drawn without components. */
export const entryClasses: Record<EntryType, string> = {
  'visa free': 'bg-emerald-50 text-emerald-800',
  'visa on arrival': 'bg-blue-50 text-blue-800',
  eta: 'bg-violet-50 text-violet-800',
  'e-visa': 'bg-orange-50 text-orange-800',
  'visa required': 'bg-stone-100 text-stone-600',
  'no admission': 'bg-red-50 text-red-800',
  domestic: 'bg-emerald-900 text-white',
  unknown: 'bg-stone-100 text-stone-600',
};

/** A plain answer to "do I need a visa?". `destination` is the name as it reads inside a sentence. */
export function entryAnswer(rule: EntryRule, passport: string, destination: string) {
  const holders = `${passport} passport holders`;
  const stay = rule.days ? ` for up to ${rule.days} days` : '';
  switch (rule.status) {
    case 'visa free':
      return { title: 'No visa needed', text: `${holders} can visit ${destination} without a visa${stay}.` };
    case 'visa on arrival':
      return {
        title: 'Visa on arrival',
        text: `${holders} can get a visa on arrival in ${destination}${rule.days ? `, for stays of up to ${rule.days} days` : ''}.`,
      };
    case 'eta':
      return {
        title: 'No visa, but an eTA',
        text: `${holders} can visit ${destination} without a visa${stay}, but must get an electronic travel authorisation (eTA) online before they travel.`,
      };
    case 'e-visa':
      return {
        title: 'eVisa needed',
        text: `${holders} need a visa for ${destination}, which they apply for online before they travel${rule.days ? `. It allows stays of up to ${rule.days} days` : ''}.`,
      };
    case 'visa required':
      return {
        title: 'Visa needed',
        text: `${holders} need a visa for ${destination}, arranged before they travel, usually through an embassy or consulate.`,
      };
    case 'no admission':
      return { title: 'Entry restricted', text: `${destination} refuses or restricts entry for ${holders}.` };
    default:
      return {
        title: 'Not confirmed',
        text: `There is no confirmed rule for ${holders} visiting ${destination}. Check with the destination before you plan a trip.`,
      };
  }
}

export function dateLabel(value: string, month: 'short' | 'long' = 'short') {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`)
  );
}
