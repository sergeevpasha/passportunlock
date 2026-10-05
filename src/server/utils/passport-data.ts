import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import wikipedia from '../data/2026-10-05.json';
import { parseMatrix, type Snapshot } from '#shared/passports';
import { parseNotes, parseOfficialSites, parseVisaPages } from '#shared/requirements';
import { wikipediaSource } from '#shared/wikipedia';

// The committed baseline. The sync script can publish a newer snapshot at runtime, which then leads the list.
const bundled = wikipedia as Snapshot;
const codes = Object.keys(bundled.matrix);
let published: { modified: number; snapshot: Snapshot } | undefined;

async function publishedSnapshot(): Promise<Snapshot | undefined> {
  const path = resolve(useRuntimeConfig().passportDataDirectory, 'current.json');
  let modified: number;
  try {
    modified = (await stat(path)).mtimeMs;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  if (published?.modified !== modified) {
    const candidate = JSON.parse(await readFile(path, 'utf8')) as Snapshot;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(candidate.sourceDate) ||
      candidate.id !== candidate.sourceDate ||
      candidate.sourceUrl !== wikipediaSource.url
    ) {
      throw new Error('Invalid snapshot metadata');
    }
    candidate.matrix = parseMatrix(candidate.matrix, codes, { complete: false });
    if (candidate.notes) candidate.notes = parseNotes(candidate.notes, codes);
    if (candidate.officialSites) candidate.officialSites = parseOfficialSites(candidate.officialSites, codes);
    if (candidate.visaPages) candidate.visaPages = parseVisaPages(candidate.visaPages, codes);
    published = { modified, snapshot: candidate };
  }
  return published.snapshot;
}

/** Newest first. */
export async function passportSnapshots(): Promise<Snapshot[]> {
  const candidate = await publishedSnapshot();
  return candidate && candidate.sourceDate > bundled.sourceDate ? [candidate, bundled] : [bundled];
}
