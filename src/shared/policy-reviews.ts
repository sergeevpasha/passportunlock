import type { PolicyReview } from './policy-checks.ts';

// Destinations whose own visa policy article was checked against official sources where it differs from the articles
// per nationality. `destination` shows the destination article's rules wherever the two differ, `nationality` keeps
// the per-nationality rules and stops flagging the difference. With `others`, the destination article's rule for every
// passport it doesn't list replaces rules that ask for nothing before the trip. Review a destination again when the
// sync report lists new differences for it, and record what was checked and where.
export const policyReviews: Record<string, PolicyReview> = {
  CR: {
    checked: '2026-10-08',
    use: 'destination',
    note: 'UK travel advice (updated 19 May 2026): visits without a visa for up to 180 days under the tourist visa waiver.',
  },
  DO: {
    checked: '2026-10-08',
    use: 'destination',
    note: 'UK travel advice (updated 7 Aug 2026): tourism without a visa for 30 days.',
  },
  KR: {
    checked: '2026-10-08',
    use: 'destination',
    note: 'UK travel advice (updated 14 May 2026): K-ETA needed for visa-free entry; some nationalities, the British among them, are exempt until 31 December 2026.',
  },
  LK: {
    checked: '2026-10-08',
    use: 'destination',
    others: true,
    note: 'UK travel advice (updated 21 Sep 2026): visitors need an Electronic Travel Authorization (ETA); free ones are valid for 30 days.',
  },
  SC: {
    checked: '2026-10-08',
    use: 'destination',
    others: true,
    note: 'UK travel advice (updated 21 Jan 2026): no visa, but a travel authorisation is required before travel.',
  },
  TH: {
    checked: '2026-10-08',
    use: 'destination',
    note: 'UK travel advice (updated 28 Sep 2026): from 15 September 2026, stays under the visa exemption scheme are up to 30 days.',
  },
};
