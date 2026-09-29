import { requirementTypes, type EntryRule, type RequirementType } from './passports';

/** What a destination shows on the map: its entry type, a selected passport's home, or no rule to show. */
export type MapAccess = RequirementType | 'home' | 'unknown';

/** The easiest way in with the chosen passport, or with any of them when combined. A rule that is not confirmed
 * could be the easiest, so it outranks everything except visa-free. */
export function mapAccess(rules: EntryRule[] | undefined, passport: number | 'combined'): MapAccess {
  if (!rules?.length) return 'unknown';
  const selected = passport === 'combined' ? rules : [rules[passport]];
  if (selected.some(rule => rule?.status === 'domestic')) return 'home';
  const easiest = requirementTypes.find(type => selected.some(rule => rule?.status === type));
  if (easiest === 'visa free') return easiest;
  return !easiest || selected.some(rule => !rule || rule.status === 'unknown') ? 'unknown' : easiest;
}
