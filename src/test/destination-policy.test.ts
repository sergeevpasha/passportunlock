import { describe, expect, it } from 'vitest';
import {
  arrivalCardName,
  describesFuture,
  exemptNeedAuthorisation,
  headingKind,
  othersRequirement,
  parsePolicyPage,
  passportValidity,
} from '#shared/destination-policy';
import { nameIndex } from '#shared/wikipedia';
import { wikipediaPages } from '#shared/wikipedia-pages';

const index = nameIndex(Object.keys(wikipediaPages));
const now = new Date('2026-10-08T00:00:00Z');

// Modelled on "Visa policy of Thailand": a lead with the rule for everyone else, stay lengths in bold over lists in
// nested tables, a bloc entry with an exception, an authorisation that is only planned, and diplomatic passports.
const thailand = `
{{short description|Policy on permits required to enter Thailand}}
Visitors to '''[[Thailand]]''' must obtain an [[electronic visa|e-Visa]] unless they are citizens of one of the visa-exempt countries or citizens who may obtain a visa on arrival.<ref>{{cite web|url=https://example.org|title=x}}</ref>

Beginning 1 May 2025, all foreigners entering Thailand will be required to apply for the [[Thailand Digital Arrival Card]] (TDAC), a replacement of TM6 Form.

==Visa policy map==
[[File:Visa policy of Thailand.png|thumb]]

==Visa exemption==
===Ordinary passports===
Citizens of the following countries may enter Thailand without a visa for stays up to the duration listed below.
{|
|-
|
'''90 days'''
{|
|
*{{flag|Argentina}}<sup>B(90)</sup>
*{{flag|Brazil}}
|}

'''30 days'''<sup>A</sup>
*{{flagicon|ASEAN}} [[ASEAN|ASEAN member states]] (except Cambodia and Myanmar)
{|
|
*{{flag|Australia}}
*{{flag|United Kingdom}}
|}
|}

===Electronic Travel Authorization===
According to government plans as of April 2024, the ETA system is expected to launch by June 2025.
*{{flag|Germany}}

===Non-ordinary passports===
Holders of diplomatic passports of the following countries may enter Thailand without a visa.
*{{flag|Cambodia}}

==Visa on arrival==
Citizens of the following countries may obtain a visa on arrival for up to 15 days.
*{{flag|Bhutan}}
*{{flag|Brazil}}
`;

describe('destination visa policy articles', () => {
  it('reads lists by the heading and the stay above them, and the rule for everyone else', () => {
    const policy = parsePolicyPage(thailand, 'TH', index, now);
    expect(policy.rules.AR).toEqual({ status: 'visa free', days: 90 });
    // Listed for both, Brazil gets the easier way in.
    expect(policy.rules.BR).toEqual({ status: 'visa free', days: 90 });
    expect(policy.rules.AU).toEqual({ status: 'visa free', days: 30 });
    expect(policy.rules.MY).toEqual({ status: 'visa free', days: 30 });
    expect(policy.rules.KH).toBeUndefined();
    expect(policy.rules.MM).toBeUndefined();
    expect(policy.rules.BT).toEqual({ status: 'visa on arrival', days: 15 });
    // A planned authorisation and diplomatic passports are not the rule for ordinary travellers.
    expect(policy.rules.DE).toBeUndefined();
    expect(policy.others).toBe('e-visa');
    expect(policy.arrivalCard).toBe('Thailand Digital Arrival Card (TDAC)');
  });

  it('reads the rule for everyone except an exemption list', () => {
    const kenya = `
Most visitors must obtain an eTA prior to travel.
==Electronic Travel Authorisation (eTA)==
From 1 January 2024, citizens of all countries except those listed below must apply for an eTA in advance.
* eTA fee is [[USD]]&nbsp;32.50.
===Exemption===
Citizens of the following countries do not need an eTA before entering Kenya:
'''90 days'''
*{{flag|Uganda}}
*{{flag|Malawi}}
`;
    const policy = parsePolicyPage(kenya, 'KE', index, now);
    expect(policy.others).toBe('eta');
    expect(policy.rules.UG).toEqual({ status: 'visa free', days: 90 });
  });

  it('turns visa-free entry into an authorisation where every visa-exempt visitor needs one', () => {
    const canada = `
==Visa exemption==
All visa-exempt travellers to Canada (except [[United States citizens]] and permanent residents) have been required to obtain an [[Electronic Travel Authorization]] (eTA) when arriving by air since 10 November 2016.
===Visa-exempt citizens===
'''6 months'''
*{{flag|France}}
*{{flag|United States}}
`;
    const policy = parsePolicyPage(canada, 'CA', index, now);
    expect(policy.rules.FR).toEqual({ status: 'eta', days: 180 });
    expect(policy.rules.US).toEqual({ status: 'visa free', days: 180 });
  });

  it('keeps an authorisation list, and its legend exemptions, over a general statement', () => {
    const korea = `
==Visa exemption==
===Korea Electronic Travel Authorization===
The Korea Electronic Travel Authorization (K-ETA) is a mandatory requirement for visitors from visa exemption countries visiting South Korea, which came into effect on 1 September 2021.
'''90 days'''
*{{flag|Canada}}{{bsup|*}}
*{{flag|Brazil}}
<sub>* - Exempt from the K-ETA requirement from 1 April 2023 to 31 December 2026.</sub>
===Other===
'''30 days'''
*{{flag|Fiji}}
`;
    const policy = parsePolicyPage(korea, 'KR', index, now);
    expect(policy.rules.CA).toEqual({ status: 'visa free', days: 90 });
    expect(policy.rules.BR).toEqual({ status: 'eta', days: 90 });
    expect(policy.rules.FJ).toEqual({ status: 'visa free', days: 30 });
    // An exemption list is a visa exemption, and the general statement only summarises the K-ETA list above.
    expect(parsePolicyPage(korea, 'KR', index, new Date('2027-02-01')).rules.CA).toEqual({ status: 'eta', days: 90 });
  });

  it('leaves out lists of other countries whose visas or permits let someone in', () => {
    const conditional = `
==Visa exemption==
'''90 days'''
*{{flag|Japan}}
===Substitute visa===
*{{flag|India}}
==Electronic visa==
Holders of a valid visa issued by one of the following countries may apply for an e-Visa:
*{{flag|United States}}
`;
    const policy = parsePolicyPage(conditional, 'GT', index, now);
    expect(Object.keys(policy.rules)).toEqual(['JP']);
    // Argentina's authorisation is for holders of a US visa, and its list names who can't use it.
    const argentina = `
==Electronic Travel Authorization==
Citizens of most countries that are not visa-exempt may apply for an Electronic Travel Authorization (or AVE).
For this, they exclusively need to be holders of a valid B2 visa issued by the US.
This is not applicable to citizens of the following countries and territories:
*{{flag|Afghanistan}}
`;
    expect(parsePolicyPage(argentina, 'AR', index, now).rules).toEqual({});
  });

  it('classifies headings', () => {
    expect(headingKind('Visa Waiver Program')).toBe('eta');
    expect(headingKind('eTA exemption')).toBe('visa free');
    expect(headingKind('Electronic visa (e-Visa)')).toBe('e-visa');
    expect(headingKind('Visa on arrival / Electronic visa (e-Visa)')).toBeUndefined();
    expect(headingKind('Admission restrictions')).toBe('no admission');
  });

  it('tells plans from rules in force', () => {
    expect(describesFuture('The government announced future plans to introduce JESTA.', now)).toBe(true);
    expect(describesFuture('Beginning 1 May 2025, all foreigners will be required to apply for a card.', now)).toBe(
      false
    );
    expect(describesFuture('From 1 January 2027, visitors will be required to apply for an ETA.', now)).toBe(true);
    expect(describesFuture('Citizens of the following countries may enter without a visa.', now)).toBe(false);
  });

  it('reads sentences about everyone else, passport validity and arrival cards', () => {
    expect(
      othersRequirement(
        'Visitors to Ruritania must obtain a visa from one of the diplomatic missions unless they come from one of the visa exempt countries or may obtain an e-Visa.'
      )
    ).toBe('visa required');
    expect(othersRequirement('Citizens of the following countries may obtain a visa on arrival.')).toBeUndefined();
    expect(passportValidity('All visitors must hold a passport valid for at least 6 months.')).toEqual({ months: 6 });
    expect(
      passportValidity('All visitors must hold a passport valid for at least 3 months from the date of arrival.')
    ).toEqual({
      months: 3,
      after: 'arrival',
    });
    expect(
      passportValidity('Citizens of Singapore may enter with a passport valid for at least 3 months.')
    ).toBeUndefined();
    expect(arrivalCardName('Arrival cards were abolished in 2020.', now)).toBeUndefined();
    expect(exemptNeedAuthorisation('Visa-exempt nationals do not need an ETA.', index)).toBeUndefined();
  });
});
