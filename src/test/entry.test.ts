import { describe, expect, it } from 'vitest';
import { approvalKinds } from '#shared/requirements';
import { entryAnswer, entryHeadline, exceptionLine, typicalRequirements, validityLabel } from '~/utils/entry';

describe('entry answers', () => {
  it('answers with yes or no, with the stay only where the rule gives one', () => {
    expect(entryAnswer({ status: 'visa free', days: 90 }, 'German citizens', 'Japan')).toEqual({
      title: 'No visa needed',
      text: 'No. German citizens can visit Japan without a visa for up to 90 days.',
    });
    expect(entryAnswer({ status: 'visa free' }, 'German citizens', 'Japan').text).toBe(
      'No. German citizens can visit Japan without a visa.'
    );
    expect(entryAnswer({ status: 'visa on arrival', days: 30 }, 'German citizens', 'Nepal').text).toBe(
      'Yes, but German citizens can get it on arrival in Nepal, for stays of up to 30 days.'
    );
    expect(entryAnswer({ status: 'eta', days: 90 }, 'German citizens', 'Israel', 'ETA-IL')).toEqual({
      title: 'No visa, but ETA-IL needed',
      text: 'No visa, but German citizens need an approved ETA-IL before they travel: an electronic travel authorisation, applied for online. They can then visit Israel for up to 90 days.',
    });
    expect(entryAnswer({ status: 'e-visa', days: 30 }, 'German citizens', 'India').text).toBe(
      'Yes. German citizens need a visa for India, which they apply for online before they travel. It allows stays of up to 30 days.'
    );
    expect(entryAnswer({ status: 'no admission' }, 'Taiwanese citizens', 'the Netherlands').text).toBe(
      'The Netherlands refuses or restricts entry for Taiwanese citizens.'
    );
    expect(entryAnswer({ status: 'visa required' }, 'Indian citizens', 'Canada').title).toBe('Visa needed');
    expect(entryAnswer({ status: 'unknown' }, 'Kosovar citizens', 'Palestine').title).toBe('Not confirmed');
  });
  it('titles a page in the words people search with', () => {
    expect(entryHeadline({ status: 'visa free', days: 90 }, 'German', 'Malaysia')).toBe(
      'Malaysia visa for German citizens: not required (90 days)'
    );
    expect(entryHeadline({ status: 'eta', days: 90 }, 'British', 'Israel', 'ETA-IL')).toBe(
      'Israel visa for British citizens: not required, ETA-IL needed'
    );
    expect(entryHeadline({ status: 'no admission' }, 'Taiwanese', 'Moldova')).toBe(
      'Moldova entry for Taiwanese citizens: restricted'
    );
  });
  it('words exceptions and passport validity', () => {
    expect(
      exceptionLine({ grants: 'visa free', issuers: ['the United States', 'Canada'], holds: 'visa', days: 90 })
    ).toBe('With a valid visa from the United States or Canada: no visa needed, for up to 90 days.');
    expect(validityLabel({ months: 6, after: 'arrival' })).toBe('Valid for at least 6 months after arrival');
    expect(validityLabel({ months: 1 })).toBe('Valid for at least 1 month');
  });
  it('lists what is usually needed for every entry type that needs an approval, and only those', () => {
    for (const kind of approvalKinds) expect(typicalRequirements[kind]?.length).toBeGreaterThan(2);
    expect(Object.keys(typicalRequirements).sort()).toEqual([...approvalKinds].sort());
  });
});
