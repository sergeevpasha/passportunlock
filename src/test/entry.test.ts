import { describe, expect, it } from 'vitest';
import { approvalKinds } from '#shared/requirements';
import { entryAnswer, typicalRequirements } from '~/utils/entry';

describe('entry answers', () => {
  it('answers in plain words, with the stay only where the rule gives one', () => {
    expect(entryAnswer({ status: 'visa free', days: 90 }, 'Germany', 'Japan')).toEqual({
      title: 'No visa needed',
      text: 'Germany passport holders can visit Japan without a visa for up to 90 days.',
    });
    expect(entryAnswer({ status: 'visa free' }, 'Germany', 'Japan').text).toBe(
      'Germany passport holders can visit Japan without a visa.'
    );
    expect(entryAnswer({ status: 'visa on arrival', days: 30 }, 'Germany', 'Nepal').text).toBe(
      'Germany passport holders can get a visa on arrival in Nepal, for stays of up to 30 days.'
    );
    expect(entryAnswer({ status: 'eta', days: 90 }, 'Germany', 'the United States').text).toContain(
      'can visit the United States without a visa for up to 90 days, but must get an electronic travel authorisation'
    );
    expect(entryAnswer({ status: 'e-visa', days: 30 }, 'Germany', 'India').text).toBe(
      'Germany passport holders need a visa for India, which they apply for online before they travel. It allows stays of up to 30 days.'
    );
    expect(entryAnswer({ status: 'visa required' }, 'India', 'Canada').title).toBe('Visa needed');
    expect(entryAnswer({ status: 'unknown' }, 'Kosovo', 'Palestine').title).toBe('Not confirmed');
  });
  it('lists what is usually needed for every entry type that needs an approval, and only those', () => {
    for (const kind of approvalKinds) expect(typicalRequirements[kind]?.length).toBeGreaterThan(2);
    expect(Object.keys(typicalRequirements).sort()).toEqual([...approvalKinds].sort());
  });
});
