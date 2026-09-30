# Passport Unlock

Check whether you need a visa for a trip, see which countries your passport can visit without one and which passports each destination lets in, and compare up to three passports side by side.

https://passportunlock.com

Visa rules come from Wikipedia and can be out of date. Check with the embassy before you travel.

## Environment

```env
DOCKER_NODEJS_PORT=3024
WIKIMEDIA_CONTACT=
```

## Local development

```bash
cp .env.example .env
docker compose up -d
```

Open http://localhost:3024.

```bash
docker compose exec -T app yarn lint
docker compose exec -T app yarn typecheck
docker compose exec -T app yarn test
```

## Updating visa data

```bash
docker compose exec -T app node scripts/sync-passports.ts --baseline
```

Import the new file from `src/server/data/` in `src/server/utils/passport-data.ts`, then commit and push. Pushes to `master` deploy to Vercel.

## Credits

- Visa rules: Wikipedia contributors, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Map: [D3 Maps Atlas](https://github.com/souljorje/d3-maps)
- Flags: [flag-icons](https://github.com/lipis/flag-icons)
- Passport covers: recreated from photographs and scans of each passport; the adapted Wikimedia Commons works are credited in `src/app/utils/cover-credits.ts` and on the About page
