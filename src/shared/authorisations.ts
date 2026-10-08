// The name each destination gives its electronic travel authorisation, for the destinations whose eTA rules cover
// most passports. Travellers search for these names ("ETA-IL", "K-ETA"), and the official sites use them. A
// destination left out is shown with the generic "eTA". Add one only after checking the name on its official site.
export const authorisations: Record<string, { name: string; full: string }> = {
  AU: { name: 'ETA or eVisitor', full: 'Australian ETA (subclass 601) or eVisitor (subclass 651)' },
  CA: { name: 'eTA', full: 'Canadian Electronic Travel Authorization' },
  GB: { name: 'UK ETA', full: 'UK Electronic Travel Authorisation' },
  IL: { name: 'ETA-IL', full: 'Israeli Electronic Travel Authorization' },
  KE: { name: 'Kenya eTA', full: 'Kenyan Electronic Travel Authorisation' },
  KN: { name: 'eTA', full: 'Saint Kitts and Nevis Electronic Travel Authorisation' },
  KR: { name: 'K-ETA', full: 'Korea Electronic Travel Authorization' },
  LK: { name: 'ETA', full: 'Sri Lankan Electronic Travel Authorization' },
  NZ: { name: 'NZeTA', full: 'New Zealand Electronic Travel Authority' },
  SC: { name: 'Travel Authorisation', full: 'Seychelles Travel Authorisation' },
  US: { name: 'ESTA', full: 'Electronic System for Travel Authorization' },
};
