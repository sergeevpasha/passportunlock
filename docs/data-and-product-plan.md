# Passport Unlock: product and data plan

Research checked on 28 September 2026. Public vendor claims and documentation are distinguished below from our proposed architecture. No vendor account, subscription, deployment or scheduled job has been created.

## Recommendation

Build two connected experiences: passport exploration using a dated comparison matrix, and trip verification using a licensed, itinerary-aware requirements API. Start commercial evaluation with Sherpa for the consumer experience and IATA Timatic for document-compliance depth. Ask Arton Capital about licensing if matching Passport Index's exact coverage and methodology is important.

The local prototype reads its rules from Wikipedia (see below). It is not a current travel eligibility service. Connecting a paid API alone also does not establish rights to rebuild and publicly distribute an entire passport matrix: get that use case, caching, derived statistics and history retention covered in the agreement.

## What the reference does, and what to improve

The linked comparison opens New Zealand and Russia, with a third passport slot, headline mobility scores, per-passport year selectors, country search, category filters, and a destination table with entry categories and stay durations. The inspected view used dense, full-cell colors, compact controls and labels that require explanation.

Keep the useful comparison engine. Make country selection searchable; use quiet colors and explicit status text; surface differences and shared access; retain names while scrolling on a phone; put source dates where decisions happen. Avoid a decorative map as the only way to understand access. A future map should be an optional view backed by the same results.

The prototype has 1–3 passport slots, a snapshot selector per passport once more than one snapshot exists, shareable passport/date URLs, country and region search, requirement filters, differences including duration changes, combined access, incremental result display, CSV export and a source-details dialog. It does not offer all of Passport Index's historical years, their proprietary ranking, a map, trip verification, accounts or policy alerts.

## Verified source options

| Source | What was verified | Appropriate role |
| --- | --- | --- |
| [Passport Index / Arton](https://www.passportindex.org/about.php) | 199 passports/destinations; government information, crowdsourcing and proprietary research. Its mobility score includes visa-free, arrival visas, eTA and some fast eVisas. No public licensed bulk API was established in this research. | Seek a direct data agreement for exact parity. Do not assume their website is a supported API. |
| [Sherpa requirements](https://www.joinsherpa.com/products/travel-requirements/) | Advertises 220 destinations and 10 requirement categories; pricing depends on integration and usage. [API documentation](https://docs.joinsherpa.io/requirements-api/quickstart-visa.html) documents a trip endpoint with source links, stay information and procedures. | Preferred evaluation candidate for consumer trip guidance. Pricing and redistribution rights need a quote/agreement. |
| [IATA Timatic](https://www.iata.org/timatic) | Government/airline sources, human validation and frequent updates; [AutoCheck](https://www.iata.org/en/services/compliance/timatic/autocheck/) exposes integration for passenger document checks. | Evaluate for detailed itinerary/document compliance. Confirm a passport-comparison product is an allowed use and obtain API terms/pricing. |
| [imorte/passport-index-data](https://github.com/imorte/passport-index-data) | 199-passport matrix, MIT notice, derived by scraping Passport Index. README reports **17 February 2026**. The JSON file's latest inspected commit was **18 February 2026**, revision `842d43ce5045a93b051af664e955310ccc9b7341`. | Seeded the prototype until 28 September 2026; removed since. No freshness SLA or rule-level official citations. |
| [ilyankou/passport-index-dataset](https://github.com/ilyankou/passport-index-dataset) | Maintainer says archived; last dataset update **12 January 2025**. MIT notice; links to the newer repository. | Was a historical comparison; removed. Not a current feed. |

Sherpa's [API FAQ](https://docs.joinsherpa.io/requirements-api/requirements-api-faq.html) says updates pass quality control and are pushed hourly; recommends caching no longer than one hour; documents a 100 requests/second rate limit and 10 MB response limit. Treat these as published documentation to reconfirm for the signed product tier, not a negotiated SLA. Webhooks/delta feeds were not established; do not design around their existence without confirmation.

Public immigration and embassy sites are the underlying official evidence. They are fragmented and can disagree or omit operational details. A government-monitoring approach requires jurisdiction-specific extraction, translators and editorial review. It is an ongoing data operation, not just a scraper.

The community maintainers publish MIT licenses. That is not independently verified authorization from every upstream rights holder. Before commercial redistribution, obtain a clear licensed source or review the upstream rights chain. This was a procurement issue, not a claim that the dataset is prohibited. The prototype no longer uses either dataset.

## Correct comparison semantics

1. Define the destination universe and keep it versioned. The prototype's universe is the 199 passports in `src/shared/wikipedia-pages.ts`, each with 198 foreign destinations. Other providers use different universes, so their scores are not directly comparable.
2. Keep visa-free, visa on arrival, eTA, eVisa, visa required, restricted and unknown separate. Never convert a missing rule into visa-free. Do not infer freedom of movement from an unspecified stay.
3. The headline here counts strictly `visa free`; it intentionally is not Passport Index's mobility score. Status and stay-duration differences both count as differences.
4. Shared access is the intersection of visa-free destinations. Combined access is the union. Additional access is union minus the first passport's visa-free destinations. Selected home countries are excluded from all three counts, giving them the same comparison universe.
5. Mixed snapshot dates are allowed for historical exploration and explicitly identified. Their combined count is illustrative, not concurrent travel eligibility. Snapshots are observations, not proof of when a policy began or ended.
6. A maximum stay may be a shared regional allowance, a rolling window, or conditional on arrival method. A simple `90 days` does not mean 90 new days in each Schengen country.
7. A person's multiple citizenships can create obligations or restrictions that do not follow a simple best-passport rule. Combined access is exploratory; a trip check must handle relevant nationality and residence conditions.

## Production model

Keep the present Nuxt/Vue UI and Nitro server. Use a relational database for normalized rules and publication state, plus durable object storage for raw provider responses and immutable snapshots when permitted by the license. Hosting and provider contracts are undecided; no infrastructure has been added.

Store at least:

- Provider, rule ID/revision, original category, normalized category, source citations, raw-response reference and content hash.
- Passport country and document type; destination and entry points; ordinary tourist baseline assumptions. Preserve unsupported conditions rather than flattening them away.
- Residence, other visas/permits, purpose, duration, travel mode, transit/airport context and relevant traveler conditions for actual trip queries.
- `sourceUpdatedAt`, `fetchedAt`, `verifiedAt` when supplied, `effectiveFrom`, `effectiveUntil`, status and review state. Use nullable fields where the provider cannot supply a fact.
- Separate `snapshotVersion`, destination-universe version, normalization version and scoring-method version.

Retain original requirement details even when displaying a short label. Show official source links next to the result. Keep provider configuration on the server; do not put credentials in repository files or query strings. Personal trip data should have minimal collection, restricted access and a documented retention window.

## Continuous sync design

This is the proposed production workflow; it is not a running scheduler.

1. **Ingest:** use the provider's contracted feed/delta mechanism, or poll documented endpoints at an agreed frequency. Where appropriate, revalidate popular trip queries on demand and cap cache lifetime at the provider's allowed interval. For Sherpa, start the design at no more than one hour, subject to contract. Never scrape interactive consumer pages as the primary production feed.
2. **Control requests:** enforce a single writer or distributed lease, timeouts, response-size bounds, retries with exponential backoff/jitter, `Retry-After`, quota budgets and conditional requests where supported. Do not retry authentication/schema failures indefinitely.
3. **Stage immutable input:** bind all pages of a batch to a provider revision if available. Record observation time separately from policy time. Preserve the previous published release during collection.
4. **Validate:** schema, recognized country codes, coverage, categories, duplicate keys, temporal ranges and evidence URLs. Unknown source values go to review, never to visa-free. Distinguish a valid provider deletion from an incomplete page.
5. **Review changes:** compare status, durations, fees, eligibility conditions and effective dates. Quarantine large or unexpected changes, data older than freshness targets, new restrictions and material conflicts. A human reviewer resolves high-impact changes using primary evidence or the provider's support channel.
6. **Publish atomically:** one reviewed batch becomes active in a transaction; readers never see a half-updated matrix. Preserve prior versions and normalization code versions so results can be reproduced and rolled back.
7. **Invalidate caches:** invalidate affected passport/destination and trip-profile keys. Cache keys must include all eligibility-relevant inputs and provider version; nationality plus destination alone is insufficient for personalized advice.
8. **Apply time correctly:** distinguish published today from effective next month. Serve the applicable rule for the trip date. If future-date evaluation is unsupported, say so.
9. **Monitor freshness:** track last successful fetch, upstream source age, per-destination completeness, validation failures, oldest active rule and published-version lag. A successful fetch of unchanged old bytes must not reset source freshness. Alert operators on actionable failures and stale coverage.
10. **Handle outages:** retain the last approved snapshot with its original age. Mark expired data as stale. For individualized trip checks, return unavailable/reconfirmation-needed when the accepted freshness limit is exceeded; do not claim a live check succeeded.

A 199 × 198 matrix contains 39,402 international pairs. Rechecking it hourly with one request per pair would be 945,648 requests per day before residence, transit, purpose or travel-date variants. Prefer a licensed bulk baseline plus contextual on-demand queries; obtain a cost model before selecting a per-query provider. Do not assume a rate limit makes this amount of redistribution permitted or affordable.

## Wikipedia as the working source (decided 28 September 2026)

The Passport Index community copies stopped moving: imorte last published on 17 February 2026, and a fork that re-scrapes passportindex.org weekly produced a 28 September snapshot identical to it (0 of 39,402 rules changed). English Wikipedia's "Visa requirements for … citizens" articles are the freshest free source found: one per passport, edited continuously (the US, Nigerian and Chinese articles within the last week), most rows cited to Timatic or government pages, and licensed CC BY-SA 4.0. The prototype now uses them.

What that means in practice:

- **Coverage.** All 199 passports have an article. The first read produced 39,180 of 39,402 rules (99.4%); also reading territory tables with other headings, and territories listed as bullets, raised that to 39,318 (99.8%). The other 84 are mostly Palestine, Kosovo, Macau, Hong Kong and Taiwan, missing from some articles. They are left out of the snapshot and shown as not confirmed, never filled from another source; the sync report lists them.
- **Classification.** Editors' status templates and wording map onto the existing categories. An authorisation named in the status cell, its link or its sort key (ESTA, eTA, ETA, NZeTA, K-ETA, eVisitor) counts as an eTA, as does a present-tense "must be obtained" in the notes; eVisa-or-visa-on-arrival counts as visa on arrival. About 10% of statuses differ from February's Passport Index data. Spot checks found real changes (Thailand's shorter exemption, Djibouti's move to eVisa, Seychelles' and Kenya's authorisations) and stricter eVisa eligibility.
- **Known weakness.** Articles are not equally careful. The Hong Kong article, for example, lists Canada and Israel as visa-free without mentioning their authorisations. Each passport links to its article revision so readers can check; a small reviewed list of destination-wide authorisation rules would be the next improvement.
- **Licence.** CC BY-SA requires attribution and share-alike for the adapted data, which covers the bundled snapshot, the API and the CSV export (it names the source and licence). The application code is not affected.

## Implemented local sync

`src/scripts/sync-passports.ts` reads the 199 articles named in `src/shared/wikipedia-pages.ts` through the MediaWiki API, 50 per request, with `maxlag`, retries that honour `Retry-After`, a response size bound and a User-Agent naming `WIKIMEDIA_CONTACT`. An article revised in the last 24 hours is read at its previous revision, so vandalism has time to be reverted. `src/shared/wikipedia.ts` parses the tables. The script records each passport's article revision and the destinations its article leaves out, validates every passport and destination, compares with the snapshot being served, and writes an audit report listing every changed rule. It holds a candidate back for a missing article or one with fewer than 150 destinations, more than 2% of rules missing, a date older than 14 days, in the future or moving backwards, rules changed without a new date, or more than 5% of rules changed. These are conservative **prototype** gates, not a production freshness guarantee.

Run from the repository root:

```sh
docker compose exec -T app node scripts/sync-passports.ts
docker compose exec -T app node scripts/sync-passports.ts --publish
docker compose exec -T app node scripts/sync-passports.ts --baseline
```

The first command checks only. `--publish` makes the candidate the served snapshot through an atomic rename, archiving the previous version under `src/.data/passports/`. `--baseline` writes it to `src/server/data/<date>.json` for committing, which must then be imported in `src/server/utils/passport-data.ts`. After reviewing a report, `--accept-large-change` waives only the 5% limit; it was used for the switch from Passport Index to Wikipedia, and again when the baseline was rebuilt without the Passport Index fill-ins. With no snapshot to compare against, every rule counts as changed. The API reads a published file newer than the newest bundled snapshot, re-reading it only when it changes. No browser-triggered sync endpoint exists. Exit 2 means held back; other failures leave the active snapshot unchanged.

The local lock is exclusive and removed on normal completion/error. If the process is forcibly killed, inspect for an active sync process before removing a stale `src/.data/passports/sync.lock`. This prototype has no distributed lock, durable production volume, scheduler, alert delivery, authenticated review interface or commercial provider adapter. Prior local publications are archived for operator recovery but are not yet enumerated in the UI's historical selector. Those are explicit production follow-ups.

The API's private `passportDataDirectory` defaults to `/var/www/.data/passports`, the Docker bind mount, so both development and the built preview read the same published file regardless of their working directory. A future deployment must set `NUXT_PASSPORT_DATA_DIRECTORY` to its persistent storage location and have its publisher write to that same location. The local sync CLI is run from `/var/www` as documented above.

## Questions for vendor evaluation

Request one quote covering public passport comparisons and personalized travel checks. Ask about bulk access, data export, allowed caching, historical retention, derived scores, citations, attribution, geographic coverage, exception handling, future-effective rules, correction SLAs, change feeds, sandbox access and traffic quotas. Test NZ/RU cases, three-passport combinations, same-passport history, home destinations, conditional eVisa eligibility, transit, dual nationality, unknown records and unexpected restrictions before choosing.

Do not promise live global data until access is contracted, ingestion is connected, freshness is monitored and the comparison normalization has been checked against representative provider responses.
