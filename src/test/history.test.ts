import { describe, expect, it } from 'vitest';
import type { DestinationPolicy } from '#shared/destination-policy';
import { historyOf, nextHistory } from '#shared/history';
import { checkRules, materialDifference, policyCheckFor } from '#shared/policy-checks';

describe('rule history', () => {
  it('records when each rule changed and what it was', () => {
    const first = { sourceDate: '2026-09-28', matrix: { DE: { TH: { status: 'visa free', days: 60 } } } } as const;
    const second = { sourceDate: '2026-10-05', matrix: { DE: { TH: { status: 'visa free', days: 30 } } } } as const;
    const history = historyOf([first, second]);
    expect(history).toEqual({
      since: '2026-09-28',
      changes: { DE: { TH: { on: '2026-10-05', was: { status: 'visa free', days: 60 } } } },
    });
    const third = nextHistory({ ...second, history }, { DE: { TH: { status: 'eta', days: 30 } } }, '2026-10-12');
    expect(third.changes.DE!.TH).toEqual({ on: '2026-10-12', was: { status: 'visa free', days: 30 } });
    // The earlier history is not changed in place.
    expect(history!.changes.DE!.TH!.on).toBe('2026-10-05');
  });
});

describe('checks against the destination’s own policy', () => {
  const matrix = {
    LK: {},
    DE: { LK: { status: 'visa on arrival', days: 30 }, TH: { status: 'visa free', days: 60 } },
    FR: { LK: { status: 'eta', days: 30 }, TH: { status: 'visa free', days: 30 } },
    TH: {},
  } as const;
  const policies: Record<string, DestinationPolicy> = {
    LK: { rules: { DE: { status: 'eta', days: 30 }, FR: { status: 'eta', days: 30 } } },
    TH: { rules: { DE: { status: 'visa free', days: 30 }, FR: { status: 'visa free', days: 30 } } },
  };

  it('confirms agreeing rules and keeps differences for review', () => {
    const { matrix: shown, checks } = checkRules(structuredClone(matrix), policies, {});
    expect(shown.DE!.LK).toEqual({ status: 'visa on arrival', days: 30 });
    expect(checks.confirmed).toEqual({ LK: ['FR'], TH: ['FR'] });
    expect(checks.differs).toEqual({
      LK: { DE: { status: 'eta', days: 30 } },
      TH: { DE: { status: 'visa free', days: 30 } },
    });
    expect(policyCheckFor(checks, shown.DE!.TH!, 'DE', 'TH')).toEqual({
      result: 'differs',
      rule: { status: 'visa free', days: 30 },
    });
  });

  it('takes the destination’s rules where a review trusts them', () => {
    const reviews = { LK: { checked: '2026-10-08', use: 'destination' as const, note: 'eta.gov.lk' } };
    const { matrix: shown, checks } = checkRules(structuredClone(matrix), policies, reviews);
    expect(shown.DE!.LK).toEqual({ status: 'eta', days: 30 });
    expect(checks.corrected).toEqual({ LK: ['DE'] });
    expect(policyCheckFor(checks, shown.DE!.LK!, 'DE', 'LK')).toEqual({ result: 'corrected' });
  });

  it('only flags differences that change what a traveller does', () => {
    expect(materialDifference({ status: 'visa free' }, { status: 'visa on arrival' })).toBe(false);
    expect(materialDifference({ status: 'visa free', days: 60 }, { status: 'visa free', days: 30 })).toBe(true);
    expect(materialDifference({ status: 'visa on arrival' }, { status: 'eta' })).toBe(true);
    expect(materialDifference({ status: 'e-visa' }, { status: 'visa required' })).toBe(true);
  });
});
