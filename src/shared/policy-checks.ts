// Checks each rule against its destination's own visa policy (see destination-policy.ts). Agreement confirms a rule.
// A difference is shown to readers and listed in the sync report until someone checks the destination against
// official sources; a review then says which source to show (policy-reviews.ts).
import type { DestinationPolicy, PassportValidity } from './destination-policy.ts';
import type { EntryRule, RequirementType, VisaMatrix } from './passports.ts';

export interface PolicyReview {
  /** When the destination's article was checked against official sources. */
  checked: string;
  /** Whose rule a page shows where they differ: the destination's own article, or the articles per nationality. */
  use: 'destination' | 'nationality';
  /** Whether the destination article's rule for every passport it doesn't list counts too. */
  others?: boolean;
  /** What the check found, and where. */
  note: string;
}

export interface PolicyChecks {
  /** Passports whose rule the destination's own policy confirms, by destination. */
  confirmed: Record<string, string[]>;
  /** The destination policy's rule where it differs from the one shown and no review has settled it. */
  differs: Record<string, Record<string, EntryRule>>;
  /** Passports whose rule comes from the destination's own policy after a review, by destination. */
  corrected: Record<string, string[]>;
}

/** What every visitor to a destination needs, from its own visa policy. */
export interface DestinationFacts {
  passportValidity?: PassportValidity;
  arrivalCard?: string;
}

const sameRule = (a: EntryRule, b: EntryRule) => a.status === b.status && (!a.days || !b.days || a.days === b.days);
const noAdvance = new Set<RequirementType>(['visa free', 'visa on arrival']);

/** Whether a difference changes what a traveller does: arranging something before the trip, which kind of approval,
 * being refused, or the days allowed. A visa waiver at the border and a free visa on arrival don't differ. */
export function materialDifference(shown: EntryRule, listed: EntryRule) {
  if (shown.status === listed.status) return Boolean(shown.days && listed.days && shown.days !== listed.days);
  return !(noAdvance.has(shown.status as RequirementType) && noAdvance.has(listed.status as RequirementType));
}

/** The rules to show and how each compares with its destination's own policy. A reviewed destination whose policy
 * the review trusts replaces the rules that differ; the notes on those rules describe the rule they replace. */
export function checkRules(
  matrix: VisaMatrix,
  policies: Record<string, DestinationPolicy>,
  reviews: Record<string, PolicyReview>
) {
  const shown: VisaMatrix = structuredClone(matrix);
  const checks: PolicyChecks = { confirmed: {}, differs: {}, corrected: {} };
  for (const [destination, policy] of Object.entries(policies)) {
    const review = reviews[destination];
    for (const passport of Object.keys(matrix)) {
      if (passport === destination) continue;
      const rule = shown[passport]![destination];
      // The rule for everyone else only replaces rules that ask for nothing before the trip: it is how a policy
      // brought in for every visitor shows, and passports it doesn't list may still need an embassy visa.
      const listed: EntryRule | undefined =
        policy.rules[passport] ??
        (review?.others && policy.others && rule && noAdvance.has(rule.status as RequirementType)
          ? { status: policy.others }
          : undefined);
      if (!listed) continue;
      if (review?.use === 'destination' && (!rule || !sameRule(rule, listed))) {
        shown[passport]![destination] = listed.days
          ? { status: listed.status, days: listed.days }
          : { status: listed.status };
        (checks.corrected[destination] ??= []).push(passport);
        (checks.confirmed[destination] ??= []).push(passport);
      } else if (rule && sameRule(rule, listed)) (checks.confirmed[destination] ??= []).push(passport);
      else if (rule && review?.use !== 'nationality') (checks.differs[destination] ??= {})[passport] = listed;
    }
  }
  return { matrix: shown, checks };
}

/** How the destination's own policy compares with one rule: it confirms it, the rule came from it, or it says
 * something else that matters. */
export function policyCheckFor(
  checks: PolicyChecks | undefined,
  rule: EntryRule,
  passport: string,
  destination: string
) {
  if (!checks) return null;
  if (checks.corrected[destination]?.includes(passport)) return { result: 'corrected' as const };
  if (checks.confirmed[destination]?.includes(passport)) return { result: 'confirmed' as const };
  const listed = checks.differs[destination]?.[passport];
  return listed && materialDifference(rule, listed) ? { result: 'differs' as const, rule: listed } : null;
}

const isCode = (code: unknown, codes: string[]) => typeof code === 'string' && codes.includes(code);

/** Validates stored checks: lists of known passports by known destination. */
export function parsePolicyChecks(input: unknown, codes: string[]): PolicyChecks {
  const { confirmed, differs, corrected } = (input ?? {}) as Record<string, unknown>;
  for (const lists of [confirmed, corrected]) {
    if (!lists || typeof lists !== 'object') throw new Error('Invalid policy checks');
    for (const [destination, passports] of Object.entries(lists))
      if (!isCode(destination, codes) || !Array.isArray(passports) || !passports.every(code => isCode(code, codes)))
        throw new Error(`Invalid policy checks: ${destination}`);
  }
  if (!differs || typeof differs !== 'object') throw new Error('Invalid policy checks');
  for (const [destination, rules] of Object.entries(differs))
    if (!isCode(destination, codes) || !rules || !Object.keys(rules).every(code => isCode(code, codes)))
      throw new Error(`Invalid policy checks: ${destination}`);
  return input as PolicyChecks;
}

/** Validates stored destination facts. */
export function parseDestinationFacts(input: unknown, codes: string[]): Record<string, DestinationFacts> {
  if (!input || typeof input !== 'object') throw new Error('Invalid destination facts');
  for (const [destination, facts] of Object.entries(input)) {
    const { passportValidity, arrivalCard } = (facts ?? {}) as DestinationFacts;
    const months = passportValidity?.months;
    if (
      !isCode(destination, codes) ||
      (passportValidity && !(Number.isInteger(months) && months! >= 1 && months! <= 12)) ||
      (arrivalCard !== undefined && (typeof arrivalCard !== 'string' || arrivalCard.length > 100))
    )
      throw new Error(`Invalid destination facts: ${destination}`);
  }
  return input as Record<string, DestinationFacts>;
}
