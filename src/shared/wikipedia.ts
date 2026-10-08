// Reads the destination tables of Wikipedia's "Visa requirements for … citizens" articles into entry rules.
// The articles share one table layout: a flag cell for the destination, a status template such as
// {{yes|Visa not required}} or {{yes2|eVisa}}, then the allowed stay. Editors choose the template's colour
// deliberately, so it breaks ties the wording leaves open.
import { countryName } from './countries.ts';
import type { EntryRule, RequirementType } from './passports.ts';

export const wikipediaSource = {
  name: 'Wikipedia: visa requirements by nationality',
  url: 'https://en.wikipedia.org/wiki/Category:Visa_requirements_by_nationality',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
};

interface Cell {
  header: boolean;
  attrs: string;
  content: string;
}

/** Comments and citations are never part of a rule, and citations often contain table syntax of their own. With
 * `keepLinks`, a citation leaves the addresses it cites behind in a {{cited|…}} marker, which reads as nothing. */
export function stripNoise(wikitext: string, { keepLinks = false } = {}) {
  return wikitext
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref\b[^>]*\/>/gi, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref\s*>/gi, citation => {
      const urls = keepLinks ? [...new Set(citation.match(/https?:\/\/[^\s|\]}{<>"]+/g))] : [];
      return urls.length ? `{{cited|${urls.join(' ')}}}` : '';
    });
}

/** The addresses that the citations in a cell cite, from the markers `stripNoise` leaves with `keepLinks`. */
export function citedLinks(wikitext: string) {
  return [...wikitext.matchAll(/\{\{cited\|([^{}]*)\}\}/g)].flatMap(match => match[1]!.split(' '));
}

/** Top-level {| … |} tables; tables nested inside a cell are dropped. */
export function wikiTables(wikitext: string): string[] {
  const tables: string[] = [];
  let lines: string[] = [];
  let depth = 0;
  for (const line of wikitext.split('\n')) {
    const start = line.trimStart();
    if (start.startsWith('{|')) {
      depth++;
      if (depth === 1) lines = [line];
      continue;
    }
    if (start.startsWith('|}') && depth > 0) {
      depth--;
      if (depth === 0) tables.push(lines.join('\n'));
      continue;
    }
    if (depth === 1) lines.push(line);
  }
  return tables;
}

/** The article with its tables removed. */
function outsideTables(wikitext: string) {
  const kept: string[] = [];
  let depth = 0;
  for (const line of wikitext.split('\n')) {
    const start = line.trimStart();
    if (start.startsWith('{|')) depth++;
    else if (start.startsWith('|}') && depth > 0) depth--;
    else if (!depth) kept.push(line);
  }
  return kept.join('\n');
}

/** Rows of raw cells, split only on separators that are outside templates and links. */
function tableRows(table: string) {
  const rows: { header: boolean; text: string }[][] = [];
  let row: { header: boolean; text: string }[] | undefined;
  let cell: { header: boolean; text: string } | undefined;
  let braces = 0;
  let brackets = 0;
  function consume(text: string, header: boolean, splitCells: boolean) {
    let i = 0;
    while (i < text.length) {
      if (text.startsWith('{{', i) || text.startsWith('[[', i)) {
        if (text[i] === '{') braces++;
        else brackets++;
        cell!.text += text.slice(i, i + 2);
        i += 2;
      } else if ((text.startsWith('}}', i) && braces) || (text.startsWith(']]', i) && brackets)) {
        if (text[i] === '}') braces--;
        else brackets--;
        cell!.text += text.slice(i, i + 2);
        i += 2;
      } else if (
        splitCells &&
        !braces &&
        !brackets &&
        (text.startsWith('||', i) || (header && text.startsWith('!!', i)))
      ) {
        cell = { header, text: '' };
        row!.push(cell);
        i += 2;
      } else {
        cell!.text += text[i];
        i++;
      }
    }
  }
  for (const [index, line] of table.split('\n').entries()) {
    const start = line.trimStart();
    if (index === 0 && start.startsWith('{|')) continue;
    // A row separator always starts a row, even after unbalanced markup in the previous one.
    if (start.startsWith('|-')) {
      braces = brackets = 0;
      row = [];
      rows.push(row);
      cell = undefined;
      continue;
    }
    if (!braces && !brackets && start.startsWith('|+')) {
      cell = undefined;
      continue;
    }
    if (!braces && !brackets && (start.startsWith('|') || start.startsWith('!'))) {
      if (!row) rows.push((row = []));
      const header = start[0] === '!';
      cell = { header, text: '' };
      row.push(cell);
      consume(start.slice(1), header, true);
    } else if (cell) {
      cell.text += '\n';
      consume(line, cell.header, false);
    }
  }
  return rows.filter(cells => cells.length);
}

/** Separates a cell's attributes (styles, sort keys, spans) from its content. */
export function splitAttributes(raw: string): { attrs: string; content: string } {
  let braces = 0;
  let brackets = 0;
  for (let i = 0; i < raw.length; i++) {
    const pair = raw.slice(i, i + 2);
    if (pair === '{{' || pair === '[[' || (pair === '}}' && braces) || (pair === ']]' && brackets)) {
      if (pair === '{{') braces++;
      else if (pair === '[[') brackets++;
      else if (pair === '}}') braces--;
      else brackets--;
      i++;
    } else if (raw[i] === '\n') break;
    else if (raw[i] === '|' && !braces && !brackets) return { attrs: raw.slice(0, i), content: raw.slice(i + 1) };
  }
  // Attributes may also sit right before a status template, which brings its own separator.
  const inline = raw.match(/^\s*((?:[\w-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'{|]+)\s*)+)(?=\{\{)/);
  return inline ? { attrs: inline[1]!, content: raw.slice(inline[0].length) } : { attrs: '', content: raw };
}

function span(attrs: string, name: 'colspan' | 'rowspan') {
  const value = Number(attrs.match(new RegExp(`${name}\\s*=\\s*["']?(\\d+)`, 'i'))?.[1] ?? 1);
  return Math.min(Math.max(value, 1), 20);
}

/** The table as a grid, with row- and column-spanning cells repeated in every position they cover. */
export function tableGrid(table: string): Cell[][] {
  const grid: Cell[][] = [];
  const carried: { cell: Cell; rows: number }[] = [];
  for (const rawRow of tableRows(table)) {
    const row: Cell[] = [];
    let column = 0;
    const fillCarried = () => {
      while (carried[column]?.rows) {
        row[column] = carried[column]!.cell;
        carried[column]!.rows--;
        column++;
      }
    };
    for (const raw of rawRow) {
      fillCarried();
      const cell = { header: raw.header, ...splitAttributes(raw.text) };
      const rows = span(cell.attrs, 'rowspan');
      for (let covered = span(cell.attrs, 'colspan'); covered > 0; covered--) {
        row[column] = cell;
        carried[column] = { cell, rows: rows - 1 };
        column++;
      }
    }
    fillCarried();
    grid.push(row);
  }
  return grid;
}

const decode: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  ndash: '–',
  mdash: '—',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
};

/** Roughly what a reader sees: template display text, link labels, no markup. `hidden` also keeps text a reader does
 * not see but editors put there on purpose: link targets and the keys of {{sort|key|shown}}, which often name the
 * category or scheme ("Visa not required", "New Zealand Electronic Travel Authority") behind the shown text. */
export function visibleText(wikitext: string, { hidden = false } = {}) {
  let text = wikitext
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, (_, target: string, label: string) =>
      hidden ? `${target} ${label}` : label
    )
    .replace(/\[\[([^\]|]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s*([^\]]*)\]/g, '$1');
  for (let pass = 0; pass < 5 && text.includes('{{'); pass++) {
    text = text
      .replace(/\{\{\s*(?:sort|hs)\s*\|([^{}|]*)\|([^{}]*)\}\}/gi, (_, key: string, shown: string) =>
        hidden ? `${key} ${shown}` : shown
      )
      .replace(/\{\{\s*(?:nowrap|nobr|small|abbr|tooltip|lang\|[\w-]+)\s*\|([^{}|]*)[^{}]*\}\}/gi, '$1')
      .replace(
        /\{\{\s*(?:yes2|yes-no|yes|no2|no|optional|free|black|n\/a|usually|partial|dunno|maybe)\s*(?:\|([^{}]*))?\}\}/gi,
        (_, inner: string | undefined) => (inner ?? '').replace(/^\s*[\w-]+\s*=[^|]*\|/, '')
      )
      .replace(/\{\{[^{}]*\}\}/g, ' ');
  }
  return text
    .replace(/'{2,}/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(\w+);/g, (entity, name: string) => decode[name] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
}

const statusTemplate = /\{\{\s*(yes2|yes-no|yes|no2|no|optional|free|black|n\/a|usually|partial|dunno|maybe)\s*[|}]/i;
const templateStatus: Record<string, RequirementType | undefined> = {
  yes: 'visa free',
  yes2: 'e-visa',
  optional: 'e-visa',
  'yes-no': 'visa on arrival',
  no: 'visa required',
  no2: 'visa required',
};
const refused =
  /not recogni[sz]ed|admission (?:refused|restrict)|entry (?:refused|denied|banned|prohibited|not permitted|restrict)|\bbanned\b|prohibited|not admitted|particular visit regime/;
// Entry is possible, but only with a visa or permission obtained beforehand.
const permission =
  /visa restrict|partial visa restriction|special permit|permit required|permission required|invitation required/;
const authorisation =
  /\b(?:eta|esta|eta-il|k-eta|nzeta|evisitor|electronic(?:al)? travel authori(?:ty|[sz]ations?)|travel authori[sz]ations?|electronic border system|visa waiver program|e-?tourist card)\b/;

/** Maps a status cell to an entry type. Undefined means not applicable (the passport's own country) or unreadable. */
export function requirementStatus(content: string): RequirementType | undefined {
  const template = content.match(statusTemplate)?.[1]?.toLowerCase();
  const text = visibleText(content, { hidden: true }).toLowerCase();
  if (/^(?:n\/?a)?$/.test(text)) return undefined;
  if (template === 'black' || refused.test(text)) return 'no admission';
  if (permission.test(text)) return 'visa required';
  if (template === 'free' || text.includes('freedom of movement')) return 'visa free';
  const eta = authorisation.test(text);
  const free = /not required|visa[- ]free|visa exempt|\bno visa\b/.test(text);
  const eVisa = /\be-?visa\b|online visa|electronic visa|\be600\b/.test(text);
  if (free && template === 'yes' && !eta) return 'visa free';
  // A free visitor's permit handed out at the border is marked like visa-free travel.
  if (/on arrival|\be-?voa\b/.test(text))
    return template === 'yes' && /permit on arrival/.test(text) ? 'visa free' : 'visa on arrival';
  if (eta) return 'eta';
  if (free && !eVisa) return 'visa free';
  if (eVisa) return 'e-visa';
  if (text.includes('required')) return 'visa required';
  return template ? templateStatus[template] : undefined;
}

const scheme = /electronic travel authori(?:ty|[sz]ation)|\b(?:eta|esta|nzeta|k-eta|eta-il)\b/i;
const mandatory =
  /must (?:be )?(?:obtain|appl|hold|have|register|complete)|(?:is|are) (?:now )?(?:required|mandatory)|required (?:before|prior|for all|to (?:obtain|apply|hold))|mandatory/i;
const waived =
  /not (?:be )?required|(?:is|are) exempt|exempt(?:ed)? from|no longer|will be|will require|planned|expected|proposed|suspended/i;

/** Some articles mark a destination "Visa not required" and say only in the notes that an electronic travel
 * authorisation is needed. This looks for that, stated as a current rule. */
export function notesRequireAuthorisation(notes: string) {
  return notes
    .split(/\n\s*[*#:]|<br\s*\/?>/i)
    .flatMap(line => visibleText(line).split(/(?<=\.)\s+/))
    .some(sentence => scheme.test(sentence) && mandatory.test(sentence) && !waived.test(sentence));
}

/** Notes that apply to many passports live in one shared page, in sections such as "Algeria. VOA", and rows pull a
 * section in with {{#section-h::Template:Transcluded sections for the visa articles|Algeria. VOA}}. */
export const sharedNotesTitle = 'Template:Transcluded sections for the visa articles';
const sharedNote =
  /\{\{\s*#section-h\s*:\s*:?\s*Template\s*:\s*Transcluded[ _]sections[ _]for[ _]the[ _]visa[ _]articles\s*\|\s*([^{}|]+?)\s*\}\}/gi;
const sectionKey = (name: string) =>
  name
    .replace(/[\s_]+/g, ' ')
    .trim()
    .toLowerCase();

/** The shared page's sections by heading. As when the page is transcluded, a section runs to the next heading of the
 * same or a higher level. */
export function sharedNoteSections(wikitext: string) {
  const sections = new Map<string, string>();
  const open: { key: string; level: number; lines: string[] }[] = [];
  for (const line of stripNoise(wikitext).split('\n')) {
    const heading = line.match(/^(={2,6})\s*(.+?)\s*\1\s*$/);
    if (heading) {
      const level = heading[1]!.length;
      while (open.at(-1) && open.at(-1)!.level >= level) {
        const section = open.pop()!;
        sections.set(section.key, section.lines.join('\n'));
      }
      // A subheading reads as a line of its own in the sections around it.
      for (const section of open) section.lines.push(`* ${heading[2]}`);
      open.push({ key: sectionKey(heading[2]!), level, lines: [] });
    } else for (const section of open) section.lines.push(line);
  }
  for (const section of open) sections.set(section.key, section.lines.join('\n'));
  return sections;
}

const footnote = /\{\{\s*(?:refn|efn|efn-[a-z]+|notetag|sfn|r)\s*[|}]/i;

/** Footnotes are citations too, and they can nest templates and run over several lines, so they go before the text is
 * split into lines. Unclosed markup removes the rest of the text. */
export function withoutFootnotes(wikitext: string) {
  let text = wikitext;
  for (let match = text.match(footnote); match; match = text.match(footnote)) {
    let depth = 0;
    let end = match.index!;
    while (end < text.length) {
      if (text.startsWith('{{', end)) depth++;
      else if (text.startsWith('}}', end)) depth--;
      else {
        end++;
        continue;
      }
      end += 2;
      if (!depth) break;
    }
    text = `${text.slice(0, match.index)} ${text.slice(end)}`;
  }
  return text;
}

const stayOnly = /^(?:up to )?\d{1,4}\s*-?\s*(?:day|week|month|year)s?\.?$/i;

/** A notes cell as the separate points a reader sees, one per bullet or paragraph, in plain text. A stay length on its
 * own is left out: it is already the rule's stay. */
export function noteItems(wikitext: string, sections: Map<string, string> = new Map()) {
  const text = withoutFootnotes(
    wikitext.replace(sharedNote, (_, name: string) => `\n${sections.get(sectionKey(name)) ?? ''}\n`)
  )
    // Struck-out text is out of date.
    .replace(/<(s|del|strike)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/\[\[\s*(?:File|Image)\s*:[^[\]]*(?:\[\[[^\]]*\]\][^[\]]*)*\]\]/gi, ' ')
    .replace(/\{\{\s*(?:flag|flagcountry|flagu|flag country)\s*\|\s*([^|{}]+)[^{}]*\}\}/gi, '$1')
    .replace(/\{\{\s*flagicon\b[^{}]*\}\}/gi, ' ');
  const items = `\n${text}`
    .split(/\n[ \t]*[*#:;]+|\n[ \t]*\n|<br\s*\/?>/i)
    .map(item =>
      visibleText(item)
        .replace(/^[\s*#:;•·–—-]+/, '')
        // Removed footnotes leave a space before the punctuation that followed them.
        .replace(/\s+([,.;:!?)])/g, '$1')
        .trim()
    )
    .filter(item => /[\p{L}\p{N}]/u.test(item) && !stayOnly.test(item));
  return [...new Set(items)];
}

/** Shared notes an article includes that the shared page no longer has, so those rows lose them. */
export function missingSharedNotes(wikitext: string, sections: Map<string, string>) {
  return [...stripNoise(wikitext).matchAll(sharedNote)]
    .map(match => match[1]!.trim())
    .filter(name => !sections.has(sectionKey(name)));
}

/** Markup left in a note means the cell could not be read. */
export function unreadableNote(note: string) {
  return /\{\{|\}\}|\[\[|\]\]|<\/?[a-z!]/i.test(note);
}

const units: Record<string, number> = { day: 1, week: 7, month: 30, year: 365 };

/** The first stay length mentioned, in days: "3 months" is 90, "6 weeks" 42. */
export function stayDays(text: string): number | undefined {
  const match = text.toLowerCase().match(/(\d{1,4})\s*-?\s*(day|week|month|year)s?\b/);
  const days = match ? Number(match[1]) * units[match[2]!]! : /^\d{1,4}$/.test(text.trim()) ? Number(text) : 0;
  return days > 0 && days <= 3650 ? days : undefined;
}

export function destinationName(content: string): string | undefined {
  const flag = content.match(/\{\{\s*(?:flag|flagcountry|flagu|flag country)\s*\|\s*([^|}]+)/i);
  if (flag) return flag[1]!.trim();
  const link = content.match(/\[\[(?:[^\]|]*\|)?([^\]|]+)\]\]/);
  return link?.[1]?.trim() || visibleText(content) || undefined;
}

export function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/\bst\.?(?=\s)/g, 'saint')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^the /, '');
}

// Names Wikipedia uses that differ from our display names and from Intl's.
const aliases: Record<string, string> = {
  burma: 'MM',
  'cabo verde': 'CV',
  'cape verde': 'CV',
  congo: 'CG',
  'republic of the congo': 'CG',
  'democratic republic of the congo': 'CD',
  'czech republic': 'CZ',
  'east timor': 'TL',
  'federated states of micronesia': 'FM',
  'holy see': 'VA',
  'ivory coast': 'CI',
  'republic of korea': 'KR',
  'south korea': 'KR',
  'north korea': 'KP',
  macao: 'MO',
  macau: 'MO',
  macedonia: 'MK',
  palestine: 'PS',
  'state of palestine': 'PS',
  'palestinian territories': 'PS',
  'peoples republic of china': 'CN',
  'saint vincent and the grenadines': 'VC',
  swaziland: 'SZ',
  turkey: 'TR',
  'united states of america': 'US',
  vatican: 'VA',
  'vatican city': 'VA',
  gambia: 'GM',
  bahamas: 'BS',
  russia: 'RU',
  laos: 'LA',
  brunei: 'BN',
  syria: 'SY',
  iran: 'IR',
  vietnam: 'VN',
  moldova: 'MD',
  bolivia: 'BO',
  venezuela: 'VE',
  tanzania: 'TZ',
  micronesia: 'FM',
};

/** Normalised destination name → country code, for the codes in the dataset. */
export function nameIndex(codes: string[]) {
  const intl = new Intl.DisplayNames(['en'], { type: 'region' });
  const index = new Map<string, string>();
  for (const code of codes) {
    for (const name of [countryName(code), intl.of(code)]) if (name) index.set(normalizeName(name), code);
  }
  for (const [name, code] of Object.entries(aliases)) if (codes.includes(code)) index.set(name, code);
  return index;
}

export interface PageRules {
  rules: Record<string, EntryRule>;
  /** The notes on each rule: conditions, exemptions, where the visa is issued. Only destinations with notes. */
  notes: Record<string, string[]>;
  /** The addresses each rule's requirement cell cites. Only destinations whose cell cites any. */
  cited: Record<string, string[]>;
  /** Destination names that are not in the dataset, such as dependent territories. */
  unknown: string[];
  /** Status cells that could not be read, as "CODE: text". */
  unreadable: string[];
  /** Notes left out because markup remained in them, as "CODE: text". */
  unreadableNotes: string[];
}

const staysListed = new Set<RequirementType>(['visa free', 'visa on arrival', 'eta', 'e-visa']);

/** Entry rules for one passport; the first row for a destination wins when an article lists it twice. `sections` are
 * the shared notes some rows include, from `sharedNoteSections`. */
export function parseVisaPage(
  wikitext: string,
  passport: string,
  index: Map<string, string>,
  sections: Map<string, string> = new Map()
): PageRules {
  const rules: Record<string, EntryRule> = {};
  const notesByCode: Record<string, string[]> = {};
  const cited: Record<string, string[]> = {};
  const unknown = new Set<string>();
  const unreadable: string[] = [];
  const unreadableNotes: string[] = [];
  const text = stripNoise(wikitext, { keepLinks: true });
  for (const table of wikiTables(text)) {
    const grid = tableGrid(table);
    const header = grid.find(row => row.length > 1 && row.every(cell => cell?.header));
    if (!header) continue;
    const names = header.map(cell => visibleText(cell.content).toLowerCase());
    const requirementColumn = names.findIndex(name => /requirement|conditions of access/.test(name));
    const destinationColumn = names.findIndex(name =>
      /countr|jurisdiction|territor|destination|region|visitor/.test(name)
    );
    // A destination heading may span a flag column and a name column.
    const destinationColumns = header.flatMap((cell, column) => (cell === header[destinationColumn] ? [column] : []));
    const stayColumn = names.findIndex(name => /stay|duration|length/.test(name));
    const notesColumn = names.findIndex(name => /^notes?\b/.test(name));
    if (requirementColumn < 0 || destinationColumn < 0) continue;
    for (const row of grid) {
      const destination = row[destinationColumn];
      const requirement = row[requirementColumn];
      if (!destination || !requirement || requirement === destination || row.every(cell => cell?.header)) continue;
      const name = destinationColumns.map(column => destinationName(row[column]?.content ?? '')).find(Boolean);
      if (!name) continue;
      const code = index.get(normalizeName(name));
      if (!code) {
        unknown.add(name);
        continue;
      }
      if (code === passport || rules[code]) continue;
      const notes = notesColumn >= 0 ? row[notesColumn] : undefined;
      let status = requirementStatus(requirement.content);
      if (status === 'visa free' && notes && notes !== requirement && notesRequireAuthorisation(notes.content))
        status = 'eta';
      if (!status) {
        unreadable.push(`${code}: ${visibleText(requirement.content)}`);
        continue;
      }
      let days: number | undefined;
      if (staysListed.has(status) && stayColumn >= 0) {
        const stay = row[stayColumn];
        if (stay && stay !== requirement) days = stayDays(visibleText(stay.content));
      } else if (staysListed.has(status)) {
        // Tables without a stay column ("Territory | Conditions of access | Notes") give it in the status text, or
        // as a note that opens with it: "* 90 days".
        const note = notes && notes !== requirement ? visibleText(notes.content).replace(/^[*#:\s]+/, '') : '';
        const noted = note.match(/^\d{1,4}\s*-?\s*(?:day|week|month|year)s?\b/i)?.[0];
        days = stayDays(visibleText(requirement.content)) ?? (noted ? stayDays(noted) : undefined);
      }
      rules[code] = days ? { status, days } : { status };
      const noteCell = notes && notes !== requirement ? notes.content : '';
      const items = noteItems(noteCell, sections);
      const readable = items.filter(note => !unreadableNote(note));
      unreadableNotes.push(...items.filter(unreadableNote).map(note => `${code}: ${note}`));
      if (readable.length) notesByCode[code] = readable;
      // Only the rule's own citations: notes cite pages about the exceptions they describe.
      const links = [...new Set(citedLinks(requirement.content))];
      if (links.length) cited[code] = links;
    }
  }
  // Some articles list territories as bullets instead: "* {{flag|Kosovo}} — Visa free for 90 days." Only a bullet
  // that starts with the flag alone is read, only its first sentence, and never over a table row.
  for (const line of outsideTables(text).split('\n')) {
    const item = line.match(/^\*+\s*\{\{\s*flag\s*\|\s*([^|}]+)[^}]*\}\}\s*[—–-]\s*(.+)$/);
    const code = item && index.get(normalizeName(item[1]!));
    if (!item || !code || code === passport || rules[code]) continue;
    const sentence = visibleText(item[2]!).split(/(?<=\.)\s/)[0]!;
    const status = requirementStatus(sentence);
    if (!status) continue;
    const days = staysListed.has(status) ? stayDays(sentence) : undefined;
    rules[code] = days ? { status, days } : { status };
  }
  return { rules, notes: notesByCode, cited, unknown: [...unknown].sort(), unreadable, unreadableNotes };
}
