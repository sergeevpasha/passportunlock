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

const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A name as an owner: "Malaysia’s", "the United States’". */
export function possessive(name: string) {
  return /s$/i.test(name) ? `${name}’` : `${name}’s`;
}

/** A plain answer to "do I need a visa?" that opens with yes or no. `holders` names the passport's holders, as in
 * "German citizens"; `destination` is the name as it reads inside a sentence; `scheme` names an eTA. */
export function entryAnswer(rule: EntryRule, holders: string, destination: string, scheme = 'eTA') {
  const stay = rule.days ? ` for up to ${rule.days} days` : '';
  switch (rule.status) {
    case 'visa free':
      return { title: 'No visa needed', text: `No. ${holders} can visit ${destination} without a visa${stay}.` };
    case 'visa on arrival':
      return {
        title: 'Visa on arrival',
        text: `Yes, but ${holders} can get it on arrival in ${destination}${rule.days ? `, for stays of up to ${rule.days} days` : ''}.`,
      };
    case 'eta':
      return {
        title: `No visa, but ${scheme} needed`,
        text: `No visa, but ${holders} need an approved ${scheme} before they travel: an electronic travel authorisation, applied for online. They can then visit ${destination}${stay}.`,
      };
    case 'e-visa':
      return {
        title: 'eVisa needed',
        text: `Yes. ${holders} need a visa for ${destination}, which they apply for online before they travel${rule.days ? `. It allows stays of up to ${rule.days} days` : ''}.`,
      };
    case 'visa required':
      return {
        title: 'Visa needed',
        text: `Yes. ${holders} need a visa for ${destination}, arranged before they travel, usually through an embassy or consulate.`,
      };
    case 'no admission':
      return {
        title: 'Entry restricted',
        text: `${capitalized(destination)} refuses or restricts entry for ${holders}.`,
      };
    default:
      return {
        title: 'Not confirmed',
        text: `There is no confirmed rule for ${holders} visiting ${destination}. Check with the destination before you plan a trip.`,
      };
  }
}

/** A page title in the words people search with, answer included: "Malaysia visa for German citizens: not required
 * (90 days)". `destination` is the plain name. */
export function entryHeadline(rule: EntryRule, nationality: string, destination: string, scheme = 'eTA') {
  const visa = `${destination} visa for ${nationality} citizens`;
  const days = rule.days ? ` (${rule.days} days)` : '';
  switch (rule.status) {
    case 'visa free':
      return `${visa}: not required${days}`;
    case 'visa on arrival':
      return `${visa}: visa on arrival${days}`;
    case 'eta':
      return `${visa}: not required, ${scheme} needed`;
    case 'e-visa':
      return `${visa}: eVisa required`;
    case 'visa required':
      return `${visa}: visa required`;
    case 'no admission':
      return `${destination} entry for ${nationality} citizens: restricted`;
    default:
      return `Do ${nationality} citizens need a visa for ${destination}?`;
  }
}

const grantPhrases: Partial<Record<EntryType, string>> = {
  'visa free': 'no visa needed',
  'visa on arrival': 'a visa on arrival',
  eta: 'an eTA instead',
  'e-visa': 'an eVisa instead',
};

/** What a visa or residence permit from other countries changes: "With a valid visa or residence permit from the
 * United States or Canada: no visa needed, for up to 90 days." */
export function exceptionLine(exception: { grants: EntryType; issuers: string[]; holds: string; days?: number }) {
  const issuers = new Intl.ListFormat('en', { type: 'disjunction' }).format(exception.issuers);
  const stay = exception.days ? `, for up to ${exception.days} days` : '';
  return `With a valid ${exception.holds} from ${issuers}: ${grantPhrases[exception.grants] ?? exception.grants}${stay}.`;
}

/** Passport validity in words: "valid for at least 6 months after arrival". */
export function validityLabel(validity: { months: number; after?: 'arrival' | 'departure' | 'stay' }) {
  const months = `${validity.months} ${validity.months === 1 ? 'month' : 'months'}`;
  const after = validity.after
    ? { arrival: ' after arrival', departure: ' after departure', stay: ' beyond the stay' }[validity.after]
    : '';
  return `Valid for at least ${months}${after}`;
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
