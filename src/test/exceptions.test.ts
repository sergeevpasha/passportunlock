import { describe, expect, it } from 'vitest';
import { issuerName, noteExceptions, ruleExceptions } from '#shared/exceptions';
import { nationality } from '#shared/nationalities';
import { noteLabel } from '#shared/requirements';

describe('exceptions in notes', () => {
  it('reads what another country’s visa or residence permit grants, and from whom', () => {
    expect(
      noteExceptions(
        'Visa not required for holders of a valid visa or permanent residence issued by the United States, Canada, Chile, Colombia, Japan, United Kingdom, or Schengen area. Visa requirement effective on January 21, 2022.',
        'VE',
        'MX'
      )
    ).toEqual([
      {
        grants: 'visa free',
        issuers: ['SCHENGEN', 'US', 'CA', 'CL', 'CO', 'JP', 'GB'],
        holds: 'visa or residence permit',
      },
    ]);
    expect(
      noteExceptions(
        'Holders of a valid UK, Canada or USA visa may enter North Macedonia for up to 15 days visa free.',
        'CU',
        'MK'
      )
    ).toEqual([{ grants: 'visa free', issuers: ['GB', 'CA', 'US'], holds: 'visa', days: 15 }]);
    expect(
      noteExceptions(
        'Permanent residents and holders of multiple entry visa of the US or Canada may obtain a visa on arrival. Holders of a valid visa issued by a Schengen Member state are visa exempt for a maximum stay of 90 days.',
        'NG',
        'XX'
      )
    ).toEqual([
      { grants: 'visa on arrival', issuers: ['US', 'CA'], holds: 'visa or residence permit' },
      { grants: 'visa free', issuers: ['SCHENGEN'], holds: 'visa', days: 90 },
    ]);
  });

  it('reads rules that cover tourism along with transit, and rules that drop an authorisation', () => {
    expect(
      noteExceptions(
        'National visa may be substituted with a valid visa or permanent residence documents issued by the US, Canada, Japan, UK, or Schengen Area member state to enter Mexico for tourism, transit, or business purposes.',
        'IN',
        'MX'
      )
    ).toEqual([
      { grants: 'visa free', issuers: ['SCHENGEN', 'US', 'CA', 'JP', 'GB'], holds: 'visa or residence permit' },
    ]);
    expect(
      ruleExceptions(
        [
          'National visa may be substituted with a US permanent resident card. Travelers with a US permanent resident card no longer require an Electronic Travel Authorization (ETA) as of 26 April 2022.',
        ],
        'visa required',
        'IN',
        'CA'
      )
    ).toEqual([{ grants: 'visa free', issuers: ['US'], holds: 'residence permit' }]);
  });

  it('leaves out transit, the passport’s and the destination’s own documents, and documents that aren’t visas', () => {
    expect(
      noteExceptions('Holders of a valid US visa can pass through the territory without a visa.', 'IN', 'MX')
    ).toEqual([]);
    expect(
      noteExceptions(
        'Visa not required for holders of an entry permit letter (visa letter) issued by Nauru.',
        'IN',
        'NR'
      )
    ).toEqual([]);
    expect(
      noteExceptions(
        'Visa is not required for holders of a valid travel documents issued by EU Member States based on the 1951 Convention.',
        'CN',
        'XK'
      )
    ).toEqual([]);
    expect(
      noteExceptions(
        'An AVE is available for Taiwanese passport with a valid entry authorization for the United States of America.',
        'TW',
        'AR'
      )
    ).toEqual([]);
  });

  it('leaves out a group’s documents for one of its own members', () => {
    expect(noteExceptions('National visa may be substituted with a valid Schengen visa.', 'IN', 'FI')).toEqual([]);
    expect(noteExceptions('National visa may be substituted with a valid Schengen visa.', 'IN', 'CY')).toHaveLength(1);
  });

  it('keeps only exceptions that ask less than the rule', () => {
    const notes = ['eVisa available for holders of a valid Schengen visa.'];
    expect(ruleExceptions(notes, 'visa required', 'IN', 'TR')).toHaveLength(1);
    expect(ruleExceptions(notes, 'visa free', 'IN', 'TR')).toEqual([]);
    expect(issuerName('SCHENGEN')).toBe('the Schengen Area');
    expect(issuerName('US')).toBe('the United States');
  });

  it('labels notes by what they are about', () => {
    expect(noteLabel('eTA fee is 32.50 USD.')).toBe('Fee');
    expect(noteLabel('ID card valid')).toBe('ID card');
    expect(noteLabel('Yellow fever vaccination certificate is required if coming from endemic countries.')).toBe(
      'Health'
    );
    expect(noteLabel('Only if arriving at Ouagadougou Airport.')).toBe('Where to enter');
    expect(noteLabel('90 days within any 180-day period in the Schengen Area.')).toBe('Stay');
    expect(
      noteLabel('Visa-free for a maximum stay of 15 days for valid visa holders or residents of the Schengen Area.')
    ).toBe('Exception');
    expect(noteLabel('Must have a booking at a registered tourist facility.')).toBeUndefined();
  });

  it('names a passport’s holders the way searchers do', () => {
    expect(nationality('DE')).toBe('German');
    expect(nationality('PH')).toBe('Filipino');
    expect(nationality('US')).toBe('US');
    expect(nationality('HK')).toBe('Hong Kong');
  });
});
