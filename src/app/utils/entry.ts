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

/** What travellers usually need for each entry type that needs an approval. It is the same for every destination, so
 * pages label it as typical and show it after the rule's own notes and official site. */
export const typicalRequirements: Partial<Record<EntryType, string[]>> = {
  'visa required': [
    'A passport valid for your whole stay, and often for 3 to 6 months beyond it, with blank pages',
    'The application form, a recent passport photo and the fee',
    'Proof of your trip, such as a return or onward ticket and where you’ll stay',
    'Proof that you can pay for your stay, such as recent bank statements',
    'An appointment at the embassy, a consulate or a visa centre, where many countries take fingerprints or interview applicants',
    'Time: a decision can take several weeks, so apply well before you travel',
  ],
  'e-visa': [
    'A passport valid for your whole stay, and often for 6 months beyond it',
    'A scan of your passport’s photo page and a recent digital photo',
    'A bank card to pay the fee online',
    'Your travel dates and where you’ll stay',
    'The approval, printed or on your phone, to show at check-in and at the border',
  ],
  'visa on arrival': [
    'A passport valid for your whole stay, and often for 6 months beyond it, with a blank page',
    'The fee, which some borders take only in cash',
    'A return or onward ticket and the address where you’ll stay',
    'At some borders, a passport photo or a form filled in online before you arrive',
  ],
  eta: [
    'The passport you’ll travel with: the approval is linked to it, and a new passport needs a new approval',
    'A bank card to pay the fee online',
    'Answers about your trip, your health and any criminal record',
    'Time before you fly: most are approved within minutes, but some take a few days',
  ],
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

/** A site's address as a reader checks it: its host, without www. */
export function siteHost(url: string) {
  return new URL(url).hostname.replace(/^www\./, '');
}

/** One page however its address is spelled: http or https, with or without www or a trailing slash. */
export function sitePage(url: string) {
  const { hostname, pathname, search } = new URL(url);
  return `${hostname.replace(/^www\./, '')}${pathname.replace(/\/+$/, '')}${search}`;
}
