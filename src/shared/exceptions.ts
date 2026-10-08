// Notes often say a visa or residence permit from another country changes the rule: "National visa may be
// substituted with a valid visa or residence permit issued by the US, Canada, Japan, UK, or Schengen Area member
// state". This reads those sentences into exceptions, so a page can lead with them and a passport's page can list
// what a US visa or a Schengen residence permit unlocks. The note itself stays on the page with its conditions.
import { countryGroups, countryName, countryNameInText } from './countries.ts';
import { normalizeName, stayDays } from './wikipedia.ts';
import { citizens } from './wikipedia-pages.ts';
import type { RequirementType } from './passports.ts';

/** Groups whose visas or residence permits count, besides single countries. */
export const issuerGroups = {
  SCHENGEN: 'the Schengen Area',
  EU: 'the European Union',
  EEA: 'the European Economic Area',
  GCC: 'the Gulf Cooperation Council',
  OECD: 'the OECD',
} as const;

export interface EntryException {
  /** The entry the traveller gets instead of the rule's own. */
  grants: RequirementType;
  /** Who must have issued the visa or residence permit: country codes, or a key of `issuerGroups`. */
  issuers: string[];
  /** What the traveller must hold. */
  holds: 'visa' | 'residence permit' | 'visa or residence permit';
  /** The stay it allows, when the note gives one. */
  days?: number;
}

const groupNames: [RegExp, keyof typeof issuerGroups][] = [
  [/\bschengen\b/i, 'SCHENGEN'],
  [/\beuropean union\b|\beu (?:member|country|countries|state|states)\b|\bany eu\b|\ban eu\b/i, 'EU'],
  [/\beuropean economic area\b|\beea\b/i, 'EEA'],
  [/\bgulf cooperation council\b|\bgcc\b/i, 'GCC'],
  [/\boecd\b/i, 'OECD'],
];
// Short forms the notes use for issuers, besides country names and the adjectives in article titles.
const shortNames: Record<string, string> = {
  us: 'US',
  usa: 'US',
  'u s': 'US',
  'u s a': 'US',
  'united states of america': 'US',
  america: 'US',
  american: 'US',
  uk: 'GB',
  'u k': 'GB',
  'great britain': 'GB',
  britain: 'GB',
  british: 'GB',
  uae: 'AE',
  'south korean': 'KR',
  korean: 'KR',
  'ireland rep': 'IE',
  'republic of ireland': 'IE',
  'hong kong sar': 'HK',
};

const memberCodes = (id: string) => [...(countryGroups.find(group => group.id === id)?.codes ?? [])];
const groupMembers: Record<string, () => string[]> = {
  SCHENGEN: () => memberCodes('schengen'),
  EU: () => memberCodes('eu'),
  EEA: () => [...memberCodes('eu'), 'IS', 'LI', 'NO'],
  GCC: () => memberCodes('gcc'),
};

let issuerIndex: Map<string, string> | undefined;
/** Names, adjectives and short forms of every country, normalised. */
function issuers() {
  if (issuerIndex) return issuerIndex;
  issuerIndex = new Map(Object.entries(shortNames));
  for (const [code, adjective] of Object.entries(citizens)) {
    issuerIndex.set(normalizeName(adjective), code);
    issuerIndex.set(normalizeName(countryName(code)), code);
  }
  return issuerIndex;
}

/** The issuers a sentence names, longest names first so "United States" isn't read as "United". */
export function issuersIn(sentence: string, passport: string, destination: string) {
  const found = new Set<string>();
  for (const [pattern, group] of groupNames) if (pattern.test(sentence)) found.add(group);
  const words = normalizeName(sentence.replace(/\./g, ' ')).split(' ');
  for (let start = 0; start < words.length; start++) {
    for (let length = 5; length >= 1; length--) {
      const code = issuers().get(words.slice(start, start + length).join(' '));
      if (code) {
        found.add(code);
        start += length - 1;
        break;
      }
    }
  }
  // A destination's own permits, such as a visa letter it issued, are its rules, not an exception, and a note names
  // the passport's own country when it describes its holders.
  found.delete(destination);
  found.delete(passport);
  // A Schengen visa for a Schengen state, or an EU permit for an EU state, is that state's own document.
  for (const [group, members] of Object.entries(groupMembers)) if (members().includes(destination)) found.delete(group);
  return [...found];
}

// "Visa not required" and "national visa" name the rule, not a document the traveller holds.
const ruleWords =
  /\b(?:national|e-?)\s*visas?\b|\bvisas?[- ](?:is |are )?(?:not required|free|exempt\w*|waiver|waived|required|on arrival)\b|\bno visa\b|\bwithout (?:a )?visa\b/gi;
const condition =
  /\b(?:holders?|holding|those with|travell?ers with|passengers with|with a valid|with valid|substitut\w*|except for)\b/i;
const grants: [RequirementType, RegExp][] = [
  ['eta', /\b(?:eta|ave|electronic travel authori[sz]ation|autori[sz]aci[oó]n de viaje electr[oó]nica)\b/i],
  ['e-visa', /\be-?visas?\b|\belectronic visa\b|\bonline visa\b/i],
  ['visa on arrival', /\bon arrival\b/i],
  [
    'visa free',
    /\bnot (?:be )?required\b|\bno visa\b|\bvisa[- ]free\b|\bvisa[- ]exempt\w*|\bwaiver\b|\bwaived\b|\bsubstitut\w*|\bwithout (?:a )?visa\b|\bexcept for\b|\bmay (?:enter|stay)\b|\bcan (?:enter|stay)\b/i,
  ],
];

/** The stay an exception allows: "for up to 15 days", "a maximum stay of 90 days", "30 days visa free". The validity
 * a note asks of the visa itself ("valid for at least 6 months") is not a stay. */
function exceptionStay(sentence: string) {
  const stay = sentence.match(
    /\b(?:for (?:up to |a (?:maximum|max\.?)(?: stay)? of )?|up to |(?:maximum|max\.?) (?:stay|period) of |stays? of (?:up to )?)(\d{1,3}\s*(?:days?|weeks?|months?))\b|\b(\d{1,3}\s*days?)\s+visa[- ]free\b/i
  );
  return stay ? stayDays(stay[1] ?? stay[2]!) : undefined;
}

/** The exceptions in one note: each sentence that names another country's visa or residence permit and what it
 * grants. Transit-only rules aren't entry rules, so they are left out. */
export function noteExceptions(note: string, passport: string, destination: string): EntryException[] {
  const found: EntryException[] = [];
  for (const sentence of note.split(/(?<=[.;])\s+(?=[A-Z])/)) {
    const residence = /residen|green card/i.test(sentence);
    const visa = /\bvisas?\b/i.test(sentence.replace(ruleWords, ''));
    // A sentence about passing through isn't an entry rule; one that also covers tourism or business is.
    const transitOnly =
      /\btransit\b|\bpass through\b/i.test(sentence) && !/\btouris|\bbusiness\b|\bvisit/i.test(sentence);
    if ((!visa && !residence) || !condition.test(sentence) || transitOnly) continue;
    // "… no longer require an Electronic Travel Authorization" frees them from it, unless another is required.
    const freed =
      /\b(?:no longer|not|do not|does not|don't)\s+(?:be\s+)?(?:require|need|required|needed)\b/i.test(sentence) &&
      !/\bmust (?:obtain|apply for|get|hold)\b/i.test(sentence);
    const granted = freed ? 'visa free' : grants.find(([, pattern]) => pattern.test(sentence))?.[0];
    const named = issuersIn(sentence, passport, destination);
    if (!granted || !named.length) continue;
    const holds = residence && visa ? 'visa or residence permit' : residence ? 'residence permit' : 'visa';
    const days = exceptionStay(sentence);
    found.push(days ? { grants: granted, issuers: named, holds, days } : { grants: granted, issuers: named, holds });
  }
  return found;
}

/** Ranks entry types by what they ask of the traveller, least first. An exception only counts when it asks less. */
export const easeOrder: RequirementType[] = [
  'visa free',
  'visa on arrival',
  'eta',
  'e-visa',
  'visa required',
  'no admission',
];

/** The exceptions in a rule's notes that make entry easier than the rule itself. */
export function ruleExceptions(notes: string[], status: string, passport: string, destination: string) {
  const base = easeOrder.indexOf(status as RequirementType);
  if (base < 0) return [];
  const exceptions = notes
    .flatMap(note => noteExceptions(note, passport, destination))
    .filter(exception => easeOrder.indexOf(exception.grants) < base);
  // Notes often say the same thing twice, once in each sentence.
  return exceptions.filter(
    (exception, index) => exceptions.findIndex(other => JSON.stringify(other) === JSON.stringify(exception)) === index
  );
}

/** An issuer as it reads in a sentence: "the United States", "the Schengen Area". */
export function issuerName(issuer: string) {
  return issuer in issuerGroups ? issuerGroups[issuer as keyof typeof issuerGroups] : countryNameInText(issuer);
}
