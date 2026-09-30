import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { countrySlugs } from '#shared/country-paths';
import { coverCredits, coverLicenses } from '~/utils/cover-credits';

const directory = (width: number) => fileURLToPath(new URL(`../public/covers/${width}/`, import.meta.url));

// Covers have transparent corners, so they are extended-format WebP files, whose header holds the canvas size.
function size(file: string) {
  const bytes = readFileSync(file);
  expect(bytes.toString('ascii', 12, 16)).toBe('VP8X');
  return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
}

describe('passport covers', () => {
  it.each([160, 480])('has a %ipx cover of the same size for every passport', width => {
    const files = readdirSync(directory(width)).sort();
    expect(files).toEqual(
      Object.keys(countrySlugs)
        .map(code => `${code.toLowerCase()}.webp`)
        .sort()
    );
    for (const file of files) expect(size(directory(width) + file)).toEqual([width, width * 1.5]);
  });
  it('credits existing passports under a known licence', () => {
    for (const [code, credit] of Object.entries(coverCredits)) {
      expect(Object.keys(countrySlugs)).toContain(code);
      expect(Object.keys(coverLicenses)).toContain(credit.license);
      expect(credit.url).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });
});
