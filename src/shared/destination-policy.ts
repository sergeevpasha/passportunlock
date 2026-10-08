// Reads Wikipedia's "Visa policy of …" articles: each destination's own account of who may enter it and how. They
// list passports under headings for each entry type ("Visa exemption", "Electronic visa (e-Visa)"), grouped under a
// stay length in bold, and often say what everyone else needs: "Visitors to Thailand must obtain an e-Visa unless …".
// A destination's article is the one place editors update when a policy changes for every passport, which the
// articles written per nationality can take months to follow, so the sync checks those against it.
import { countryGroups } from './countries.ts';
import type { RequirementType } from './passports.ts';
import { normalizeName, stayDays, stripNoise, visibleText, withoutFootnotes } from './wikipedia.ts';

export interface PolicyRule {
  status: RequirementType;
  days?: number;
}

export interface DestinationPolicy {
  /** The rule for each passport the article lists for the current ordinary-passport policy. */
  rules: Record<string, PolicyRule>;
  /** What the article says every passport it doesn't list needs, when it says so. */
  others?: RequirementType;
  /** How long a visitor's passport must stay valid, when the article gives one rule for every visitor. */
  passportValidity?: PassportValidity;
  /** The digital arrival card every visitor must file. */
  arrivalCard?: string;
}

export interface PassportValidity {
  months: number;
  /** What the months count from, when the article says. */
  after?: 'arrival' | 'departure' | 'stay';
}

const groupCodes = (id: string) => [...(countryGroups.find(group => group.id === id)?.codes ?? [])];
// Entries that stand for a whole bloc, as in "{{flagicon|EU}} All European Union member states (except Ireland)".
const blocs: [RegExp, () => string[]][] = [
  [/european economic area|\beea\b/i, () => [...groupCodes('eu'), 'IS', 'LI', 'NO']],
  [/european union|\beu\b/i, () => groupCodes('eu')],
  [/european free trade|\befta\b/i, () => ['CH', 'IS', 'LI', 'NO']],
  [/schengen/i, () => groupCodes('schengen')],
  [/gulf cooperation council|\bgcc\b/i, () => groupCodes('gcc')],
  [/\basean\b/i, () => groupCodes('asean')],
  [/ecowas|economic community of west african/i, () => groupCodes('ecowas')],
  [/east african community/i, () => groupCodes('eac')],
  [/caricom|caribbean community/i, () => groupCodes('caricom')],
  [/mercosur/i, () => groupCodes('mercosur')],
  [/eurasian economic union/i, () => groupCodes('eaeu')],
];

// Sections about other passports, other purposes, other times or conditional entry, such as visa-free entry for
// holders of a US visa: the notes on each rule describe those. A heading anywhere above a list rules it out.
const unrelated = new RegExp(
  [
    'non-ordinary|diplomatic|official|service|special passport|\\bapec\\b|business travel|transit|history|statistic',
    '\\bvisitors? (?:by|arrivals)|see also|references|external links|further reading|\\bnotes\\b|bibliography|gallery',
    '\\bmap\\b|\\btypes?\\b|categor|\\bwork|\\bstud(?:y|ent)|resid|investor|golden|nomad|retire|medical|crew|seam[ae]n',
    'pilgrim|hajj|umrah|reciproc|\\bfees?\\b|\\bcosts?\\b|future|proposed|planned|upcoming|suspend|abolish|former',
    'previous|yellow fever|vaccin|health|covid|extension|overstay|at the border|land border|local border|special',
    'restricted|protected area|sponsor|\\bgroups?\\b|\\btours?\\b|cruise|\\bships?\\b|facilitation|holders of|family',
    'refugee|stateless|pupil|minors?\\b|children|unrecogni[sz]ed|kinship|ethnic|descent|returning|overseas citizens',
    'bilateral|substitut|partial|green card|with (?:a )?(?:valid )?(?:us|u\\.s\\.|uk|schengen|eu)\\b|other visa exemption',
    'driver|right of abode|mainland chinese|jeju|hainan|regional|designated|dual citizen|short stay visa waiver',
    'british-irish|border control agreement|\\bca-4\\b|authori[sz]ation certificate|nationality evaluation',
    'international organi[sz]ations|laissez|conditional',
  ].join('|'),
  'i'
);
// Lists of countries whose visas or residence permits let someone in: conditional entry, which the notes describe.
const conditional =
  /\b(?:holders? of|hold(?:ing)?|with|possess(?:ing)?)\b[^.]{0,60}\b(?:valid\s+)?(?:visas?|residence permits?|residence cards?|permanent residen\w*|green cards?)\b[^.]{0,80}\b(?:issued by|from|of)\b/i;
// A section whose introduction requires another country's visa anywhere: "they exclusively need to be holders of a
// valid … visa issued by the US".
const requiresOtherVisa =
  /\b(?:must|need(?:s)? to|only if|provided (?:that )?they|on condition)\b[^.]{0,80}\b(?:holders? of|hold|have)\b[^.]{0,40}\bvalid\b[^.]{0,80}\b(?:visas?|residence|permits?|green cards?)\b/i;
// A list of who can't, as in "This is not applicable to citizens of the following countries".
const negativeList =
  /\b(?:not applicable|not eligible|ineligible|cannot (?:apply|obtain|use)|are excluded|do not qualify|does not apply|is not available|not available to)\b/i;
// An electronic travel authorisation is checked before the visa exemption it goes with: "Visa Waiver Program" is
// the US ESTA, not plain visa-free entry.
const authorisationWords =
  /electronic travel authori|travel authori[sz]ation|\be?tas?\b|\besta\b|k-eta|nzeta|eta-il|evisitor|electronic border system|visa waiver program/i;
const headingKinds: [RequirementType, RegExp][] = [
  [
    'no admission',
    /admission restrict|entry restrict|entry ban|travel ban|banned|refus|denied|not admitted|prohibited|not recogni/i,
  ],
  ['visa on arrival', /on arrival|\bvoa\b/i],
  ['e-visa', /\be-?visas?\b|electronic visa|online visa|e-?tourist/i],
  ['visa free', /exempt|visa[- ]free|freedom of movement|without a visa|visa not required|\bno visa\b|waiver/i],
];

/** The entry type a heading stands for, or undefined when it names none or several. An exemption from an
 * authorisation, such as Canada's "eTA exemption", is visa-free entry without one. */
export function headingKind(heading: string): RequirementType | undefined {
  if (authorisationWords.test(heading)) return /exempt/i.test(heading) ? 'visa free' : 'eta';
  const kinds = headingKinds.filter(([, pattern]) => pattern.test(heading)).map(([kind]) => kind);
  return kinds.length === 1 ? kinds[0] : undefined;
}

const monthNames = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
const datePattern =
  '(?:(\\d{1,2})\\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)?,?\\s*(\\d{4})\\b';
function dateIn(match: RegExpMatchArray | null) {
  if (!match) return undefined;
  const month = match[2] ? monthNames.indexOf(match[2].toLowerCase()) : 0;
  return Date.UTC(Number(match[3]), month, Number(match[1] ?? 1));
}
const reported =
  /\b(?:plans? to|planning|planned|proposed|expected to|intends? to|anticipated|announced (?:future )?plans?)\b/i;
const futureTense =
  /\b(?:is set to|to be (?:introduced|launched|implemented)|will (?:be (?:introduced|launched|implemented|replaced|required)|require|introduce|launch|replace))\b/i;

/** Whether text describes a rule that isn't in force yet. Plans are never in force; "will be required" is, once the
 * start date it gives has passed: "Beginning 1 May 2025, all foreigners will be required …". */
export function describesFuture(text: string, now: Date) {
  if (reported.test(text)) return true;
  if (!futureTense.test(text)) return false;
  const start = dateIn(
    text.match(new RegExp(`\\b(?:from|beginning|since|starting|effective|as of|on)\\s+${datePattern}`, 'i'))
  );
  return start === undefined || start > now.getTime();
}

const issuerWords =
  /\b(?:citizens?|nationals?|permanent residents?|residents?|green card holders?|holders?|passports?)\b/gi;
/** The countries in a list of names such as "United States citizens and permanent residents". */
function codesIn(text: string, index: Map<string, string>) {
  return text
    .split(/,|\band\b|\bor\b|;/)
    .flatMap(name => index.get(normalizeName(name.replace(issuerWords, ''))) ?? []);
}

/** Whether a sentence says visa-exempt visitors still need an electronic travel authorisation, and whose
 * passports it excepts: "All visa-exempt travellers to Canada (except United States citizens …) … eTA". */
export function exemptNeedAuthorisation(sentence: string, index: Map<string, string>) {
  const text = visibleText(sentence);
  const exempt =
    /\bvisa[- ]exempt\w*|\bvisa exemption (?:countries|nationals)|\bexempt from (?:the )?visa\b|\bvisa[- ]free (?:visitors|travell?ers|nationals)/i;
  const scheme = /\b(?:eta-il|k-eta|esta|nzeta|e?ta|electronic travel authori[sz]ation|travel authori[sz]ation)\b/i;
  const forward = new RegExp(
    `(?:${exempt.source})[^.]{0,160}?\\b(?:must|required|mandatory|need|obtain)\\b[^.]{0,80}?(?:${scheme.source})`,
    'i'
  );
  const backward = new RegExp(
    `(?:${scheme.source})[^.]{0,120}?\\b(?:mandatory|required|requirement)\\b[^.]{0,80}?(?:${exempt.source})`,
    'i'
  );
  if (!forward.test(text) && !backward.test(text)) return undefined;
  if (/\b(?:not|no longer|exempt from (?:the )?(?:eta|k-eta|esta|electronic))\b/i.test(text.match(forward)?.[0] ?? ''))
    return undefined;
  return { except: codesIn(text.match(/\(\s*(?:except|excluding|other than)\s+([^)]*)\)/i)?.[1] ?? '', index) };
}

/** What a sentence such as "citizens of all countries except those listed below must apply for an eTA" or
 * "Visitors to Thailand must obtain an e-Visa unless …" says every visitor not listed needs. */
export function othersRequirement(sentence: string): RequirementType | undefined {
  const text = visibleText(sentence);
  // A sentence about the passports listed with it isn't about everyone else.
  if (
    /\b(?:the following|listed (?:below|above)|these countries)\b/i.test(text) &&
    !/\b(?:except|unless|other than|not (?:listed|included))\b/i.test(text)
  )
    return undefined;
  const match = text.match(
    /\b(?:(?:citizens|nationals|visitors|holders|travell?ers|foreigners)\s+of\s+all\s+(?:other\s+)?(?:countries|nationalities)|all\s+(?:other\s+)?(?:visitors|foreigners|foreign nationals|travell?ers|nationalities)|visitors to\b)[^.]{0,120}?\b(?:(?:must|are required to|need to|have to|shall|can|may)\s+(?:first\s+)?(?:obtain|apply for|hold|get|have|possess|receive)|requires?|needs?)\s+([^.;]{3,160})/i
  );
  // What the sentence excepts is listed elsewhere: "a visa … unless they are eligible for an e-Visa".
  const object = match?.[1]?.split(/\bunless\b|\bexcept\b|\bif they\b/i)[0];
  if (!object) return undefined;
  if (/electronic travel authori|travel authori[sz]ation|\besta\b|\be?ta\b|k-eta|nzeta/i.test(object)) return 'eta';
  if (/\be-?visa\b|electronic visa|online visa/i.test(object)) return 'e-visa';
  if (/on arrival/i.test(object)) return 'visa on arrival';
  if (/\bvisas?\b/i.test(object)) return 'visa required';
  return undefined;
}

const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, six: 6, twelve: 12 };

/** The passport validity a sentence asks of every visitor: "All visitors must hold a passport valid for at least 6
 * months." A rule for some nationalities only is not taken. */
export function passportValidity(sentence: string): PassportValidity | undefined {
  const text = visibleText(sentence);
  if (/\b(?:citizens|nationals|holders) of (?!all\b)|\bexcept\b|\bunless\b/i.test(text)) return undefined;
  const match = text.match(
    /\bpassports?\b[^.]{0,120}?\bvalid(?:ity)?\b[^.]{0,30}?\b(?:for\s+)?(?:at least|a minimum of|minimum|of at least|no less than)\s+(\d{1,2}|one|two|three|four|six|twelve)\s+months?\b([^.]{0,60})/i
  );
  if (!match) return undefined;
  const months = numberWords[match[1]!.toLowerCase()] ?? Number(match[1]);
  if (!(months >= 1 && months <= 12)) return undefined;
  const anchor = match[2]!.match(
    /^\s*(?:beyond|after|from|past|following|longer than)\s+(?:the\s+)?(?:date of\s+)?(?:(?:intended|planned|expected)\s+)?(arrival|entry|departure|exit|return|stay|period of (?:intended )?stay|visit|duration)/i
  )?.[1];
  const after = !anchor
    ? undefined
    : /arrival|entry/i.test(anchor)
      ? 'arrival'
      : /departure|exit|return/i.test(anchor)
        ? 'departure'
        : 'stay';
  return after ? { months, after } : { months };
}

/** The name of a digital arrival card every visitor must file, from a sentence that says so. */
export function arrivalCardName(sentence: string, now: Date): string | undefined {
  if (!/arrival card/i.test(sentence) || describesFuture(sentence, now)) return undefined;
  if (/\b(?:abolished|no longer|replaced by|discontinued|optional|voluntary)\b/i.test(sentence)) return undefined;
  if (
    !/\b(?:required|must|mandatory|all (?:foreigners|visitors|foreign nationals|travell?ers|non-citizens))\b/i.test(
      sentence
    )
  )
    return undefined;
  const linked = sentence.match(/\[\[(?:[^\]|]*\|)?([^\]|]*arrival card[^\]|]*)\]\]\s*(?:\(([A-Za-z-]{2,10})\))?/i);
  const plain = visibleText(sentence).match(
    /\b((?:[A-Z][\w’'-]*\s+){1,4}(?:Digital\s+)?Arrival\s+Card)\b\s*(?:\(([A-Za-z-]{2,10})\))?/
  );
  const [name, short] = linked ? [linked[1], linked[2]] : plain ? [plain[1], plain[2]] : [];
  if (!name) return undefined;
  return short ? `${name.trim()} (${short})` : name.trim();
}

/** Footnote markers whose legend exempts the passports they mark from the authorisation, while that lasts:
 * "* - Exempt from the K-ETA requirement from 1 April 2023 to 31 December 2026." */
export function authorisationExemptMarkers(text: string, now: Date) {
  const markers = new Set<string>();
  for (const line of text.split('\n')) {
    const legend = visibleText(line).match(/^\s*([*†‡#]{1,3}|[A-Z0-9]{1,2})\s*[-–—:]\s+(.+)$/);
    if (!legend || !/exempt|waive|not required/i.test(legend[2]!) || !authorisationWords.test(legend[2]!)) continue;
    const until = dateIn(legend[2]!.match(new RegExp(`\\b(?:to|until|till|through)\\s+${datePattern}`, 'i')));
    if (until === undefined || until >= now.getTime()) markers.add(legend[1]!);
  }
  return markers;
}

const sentencesOf = (text: string) =>
  visibleText(text)
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .filter(Boolean);
const flagTemplate = /\{\{\s*(?:flag|flagcountry|flagu|flag country|flagdeco)\s*\|\s*([^|}]+)[^{}]*\}\}/gi;
const flagIcon = /\{\{\s*flagicon\s*\|\s*([^|}]+)[^{}]*\}\}/i;
const markerPattern = /<sup\b[^>]*>([\s\S]*?)<\/sup\s*>|\{\{\s*(?:bsup|sup)\s*\|([^{}]*)\}\}/gi;
const precedence: RequirementType[] = ['visa free', 'eta', 'visa on arrival', 'e-visa', 'visa required'];

interface Section {
  level: number;
  heading: string;
  /** Prose before the section's first list, which says what the list means and whether it is in force yet. */
  intro: string[];
  listed: boolean;
  /** Its lists aren't rules in force for every holder of the passport: plans, or entry on another country's visa. */
  excluded: boolean;
}

/** The rules, rule for everyone else and facts one "Visa policy of …" article gives. */
export function parsePolicyPage(
  wikitext: string,
  destination: string,
  index: Map<string, string>,
  now = new Date()
): DestinationPolicy {
  const text = withoutFootnotes(stripNoise(wikitext));
  const exemptMarkers = authorisationExemptMarkers(text, now);
  const policy: DestinationPolicy = { rules: {} };
  const listed = new Map<string, Map<RequirementType, number | undefined>>();
  // Passports exempt from the authorisation that visa-exempt passports otherwise need.
  const authorisationExempt = new Set<string>();
  let authorisationForExempt: { except: string[] } | undefined;
  // When the article lists the passports that need the authorisation, a general statement that every visa-exempt
  // passport needs it is a summary of that list, or of plans: "In the future, AEVM will apply to all visa-exempt …".
  let authorisationListed = false;
  // The lead, before the first heading, is a section of level 1 that lists nothing.
  const sections: Section[] = [{ level: 1, heading: '', intro: [], listed: false, excluded: false }];
  let days: number | undefined;

  const codeOf = (name: string) => index.get(normalizeName(name));
  const kind = (): RequirementType | 'skip' | undefined => {
    const open = sections.slice(1);
    if (!open.length || open.some(section => section.excluded || unrelated.test(section.heading))) return 'skip';
    for (const section of [...open].reverse()) {
      const found = headingKind(section.heading);
      if (found) return found;
    }
    return undefined;
  };
  // Facts and the rule for everyone else come from prose in the lead and in sections about the current policy.
  function readProse(lines: string[]) {
    if (sections.length > 1 && kind() === 'skip') return;
    for (const sentence of sentencesOf(lines.join('\n'))) {
      if (describesFuture(sentence, now)) continue;
      policy.passportValidity ??= passportValidity(sentence);
      policy.others ??= othersRequirement(sentence);
      authorisationForExempt ??= exemptNeedAuthorisation(sentence, index);
    }
  }
  // A section without lists, such as "citizens of all countries except those listed below must apply for an eTA"
  // above an "Exemption" subsection, is read when it closes, while its heading still counts.
  function closeSection(level: number) {
    while (sections.length && sections.at(-1)!.level >= level) {
      if (!sections.at(-1)!.listed) readProse(sections.at(-1)!.intro);
      sections.pop();
    }
  }
  function list(codes: string[], status: RequirementType, stay: number | undefined) {
    for (const code of codes) {
      if (code === destination) continue;
      const kinds = listed.get(code) ?? new Map<RequirementType, number | undefined>();
      listed.set(code, kinds);
      if (!kinds.has(status) || (stay && (kinds.get(status) ?? 0) < stay)) kinds.set(status, stay);
    }
  }

  for (const raw of text.split('\n')) {
    const heading = raw.match(/^(={2,6})\s*(.+?)\s*\1\s*$/);
    if (heading) {
      const level = heading[1]!.length;
      // The lead summarises the article, so its rule for everyone else is read first.
      if (sections.length === 1 && !sections[0]!.listed) {
        readProse(sections[0]!.intro);
        sections[0]!.listed = true;
      }
      closeSection(level);
      sections.push({ level, heading: visibleText(heading[2]!), intro: [], listed: false, excluded: false });
      days = undefined;
      continue;
    }
    // Arrival cards are described in prose, often in the lead or an "Entry requirements" section.
    if (/arrival card/i.test(raw))
      for (const sentence of raw.split(/(?<=\.)\s+(?=[A-Z[])/)) policy.arrivalCard ??= arrivalCardName(sentence, now);
    const markers = [...raw.matchAll(markerPattern)].flatMap(match =>
      (match[1] ?? match[2] ?? '').split(/[\s,]+/).filter(Boolean)
    );
    const line = raw.replace(markerPattern, '');
    const section = sections.at(-1)!;
    const flags = [...line.matchAll(flagTemplate)].map(match => match[1]!.trim());
    const icon = line.match(flagIcon)?.[1]?.trim();
    if (!flags.length && !icon) {
      const label = line.match(/^\s*[|;]?\s*'''([^']+)'''\s*$/)?.[1] ?? line.match(/^\s*!\s*([^|!]+)$/)?.[1];
      if (label) days = stayDays(visibleText(label));
      else if (!section.listed && line.trim() && !/^\s*[{|]/.test(line)) section.intro.push(line);
      continue;
    }
    if (!section.listed) {
      section.listed = true;
      // Only the sentence that introduces the list says whose documents it is about: an exception elsewhere in the
      // introduction, such as "except for nationals with a valid Moroccan residence permit", isn't.
      const introduction = sentencesOf(section.intro.join('\n'));
      const introducing = introduction.at(-1) ?? '';
      section.excluded =
        sections.length > 1 &&
        (section.intro.some(prose => describesFuture(visibleText(prose), now)) ||
          conditional.test(introducing) ||
          negativeList.test(introducing) ||
          introduction.some(sentence => requiresOtherVisa.test(sentence)));
      readProse(section.intro);
      // Without a stay in bold, the introduction may give one for the whole list: "… for up to 15 days."
      days ??= stayDays(
        visibleText(section.intro.join(' ')).match(
          /\bfor (?:stays? of )?(?:up to |a maximum of )?(\d{1,3}\s*(?:days?|weeks?|months?))\b/i
        )?.[1] ?? ''
      );
    }
    const status = kind();
    if (!status || status === 'skip') continue;
    const shown = visibleText(line);
    // A stay given on the line itself, "{{flag|Albania}} – 90 days", wins over the label above the list.
    const stay = stayDays(shown.replace(/^[^–—-]*[–—-]\s*/, '')) ?? days;
    const named = [...flags, ...(icon ? [icon] : [])].flatMap(name => codeOf(name) ?? []);
    let codes = named;
    if (!named.length) {
      const members = blocs.find(([pattern]) => pattern.test(shown))?.[1]();
      if (!members) continue;
      const excepted = codesIn(shown.match(/\(\s*(?:except|excluding|other than)\s+([^)]*)\)/i)?.[1] ?? '', index);
      codes = members.filter(code => !excepted.includes(code));
    }
    list(codes, status, stay);
    if (status === 'eta') authorisationListed = true;
    const exempt =
      (status === 'visa free' &&
        sections.some(open => /exempt/i.test(open.heading) && authorisationWords.test(open.heading))) ||
      markers.some(marker => exemptMarkers.has(marker));
    if (exempt) codes.forEach(code => authorisationExempt.add(code));
  }
  closeSection(0);

  for (const [code, kinds] of listed) {
    if (kinds.has('no admission')) {
      policy.rules[code] = { status: 'no admission' };
      continue;
    }
    // Visa-free entry that needs an authorisation first is an eTA; otherwise the easiest way in counts.
    let status = precedence.find(type => kinds.has(type));
    if (status === 'visa free' && kinds.has('eta')) status = 'eta';
    if (authorisationExempt.has(code) && status === 'eta') status = 'visa free';
    if (
      status === 'visa free' &&
      authorisationForExempt &&
      !authorisationListed &&
      !authorisationForExempt.except.includes(code) &&
      !authorisationExempt.has(code)
    )
      status = 'eta';
    if (!status) continue;
    const stay = kinds.get(status) ?? kinds.get('visa free') ?? kinds.get('eta');
    policy.rules[code] = stay ? { status, days: stay } : { status };
  }
  return policy;
}
