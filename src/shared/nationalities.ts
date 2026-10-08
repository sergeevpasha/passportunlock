import { citizens } from './wikipedia-pages.ts';

// How searchers name a passport's holders where the articles' wording differs: "Filipino citizens", not "Philippine
// citizens", and "US citizens". The articles for Hong Kong, Macau and North Macedonia name no adjective at all.
const overrides: Record<string, string> = {
  AG: 'Antiguan',
  BA: 'Bosnian',
  HK: 'Hong Kong',
  MH: 'Marshallese',
  MK: 'North Macedonian',
  MO: 'Macau',
  PH: 'Filipino',
  US: 'US',
};

/** The word for a passport's holders, as in "German citizens" or "Do German citizens need a visa …". */
export function nationality(code: string) {
  return overrides[code] ?? citizens[code] ?? code;
}
