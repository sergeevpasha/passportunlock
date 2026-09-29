# Passport Unlock

A Nuxt 4 passport-comparison prototype with 199 passports read from Wikipedia, destination filters, combined visa-free access, source details and CSV export.

The homepage (`/`) links to the searchable passport directory (`/passports`), comparison (`/compare`), and global ranking (`/rankings`). Select up to three passports, explore combined access on a map, filter destination requirements, and export CSV results. Once the app holds more than one snapshot, each passport can be read at any of their dates. The ranking uses visa-free counts with shared ranks for tied scores. Sources and methodology are at `/about`.

All UI styling uses Tailwind utility classes; the stylesheet contains only Tailwind import/source directives. Vue components use TypeScript, with shared data rules and small composables for selection and comparison state. No custom CSS, inline styles, or additional UI dependencies are required.

Visa rules come from English Wikipedia's [visa requirements by nationality](https://en.wikipedia.org/wiki/Category:Visa_requirements_by_nationality) articles, one per passport, read on **28 September 2026** and licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Each passport records the article revision it came from. Destinations an article does not list are left out and shown as not confirmed: 84 of the 39,402 rules, mostly Palestine, Kosovo, Macau, Hong Kong and Taiwan. This is not a live visa feed or personalized travel advice. Read [the source research, product scope and production sync plan](docs/data-and-product-plan.md) before selecting a production provider. No hosting, commercial subscription or recurring sync job is configured.

## Stack

- Nuxt 4 and Vue 3 with TypeScript
- Tailwind CSS 4, configured in `src/app/assets/css/main.css`
- ESLint and Prettier for linting and formatting, Vitest for unit tests
- Yarn 4 through Corepack, run inside a Docker dev container

## Getting started

### Prerequisites

- Docker and Docker Compose
- Make (optional, for the Makefile shortcuts)

### Environment setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Set the host port in your `.env` file:
```env
# Docker Configuration
DOCKER_NODEJS_PORT=3024
```

## Development with Docker

The Dockerfile's default startup command runs `yarn install --immutable` with `src/` mounted at `/var/www`, then starts the Nuxt dev server (`yarn dev`). Dependencies are installed into `src/node_modules`. After pulling dependency changes or switching branches, restart the container to sync dependencies. Startup fails if installation would require changing `yarn.lock`. Custom commands passed to `docker compose run` replace this default command and skip automatic installation.

1. Build and start the container:
```bash
docker compose up --build -d
```

The app is served at `http://localhost:${DOCKER_NODEJS_PORT}`.

2. Follow the dev server logs:
```bash
docker compose logs -f app
```

3. Open a shell in the container:
```bash
docker compose exec app bash
```

4. Stop the container:
```bash
docker compose down
```

## Checks

Run these in the running container:

```bash
docker compose exec -T app yarn lint       # ESLint, then a Prettier check
docker compose exec -T app yarn typecheck  # vue-tsc
docker compose exec -T app yarn test       # Data integrity and comparison checks
```

## Data updates

Read every passport's Wikipedia article and check the result without changing what the app serves:

```bash
docker compose exec -T app node scripts/sync-passports.ts
```

The script fetches the 199 articles listed in `src/shared/wikipedia-pages.ts` through the MediaWiki API, 50 per request. An article edited in the last 24 hours is read at its previous revision, so vandalism has time to be reverted. Set `WIKIMEDIA_CONTACT` in `.env` to an email address or URL for the User-Agent Wikimedia asks automated clients to send. Parsing lives in `src/shared/wikipedia.ts`.

- `--publish` makes the candidate the snapshot the app serves (`src/.data/passports/current.json`, kept outside Git), archiving the previous one.
- `--baseline` writes the candidate to `src/server/data/<date>.json` for committing; import the new file in `src/server/utils/passport-data.ts`.
- Both refuse a candidate that fails a check: an article missing or yielding fewer than 150 destinations, more than 2% of rules missing from the articles, a stale or backwards date, rules changed on the same date, or more than 5% of rules changed. A rule that appears or disappears counts as changed, so with no snapshot to compare against every rule does. After reviewing the report, `--accept-large-change` waives only the 5% limit.

Exit code 2 means the candidate was held back. The report is `src/.data/passports/last-check.json`, with every changed rule and the destinations each article leaves out; held-back candidates go to `src/.data/passports/quarantine/`. See the plan for lock recovery and production limitations.

The directory and ranking use `GET /api/passports`. The comparison API is `GET /api/compare?p1=nz&p2=ru&s1=latest&s2=2026-09-28` (up to three passports). Comparison links preserve passports and snapshot choices. Search and view filters are local UI state. Unknown passports return HTTP 400; a snapshot the app no longer holds falls back to the latest one.

## Search engines and sharing

Each page sets its title, description, canonical link and Open Graph/Twitter card tags through `usePageSeo` (`src/app/composables/usePageSeo.ts`); a comparison page's title and description name its passports. `GET /sitemap.xml` lists the pages plus one comparison page per passport, and `GET /robots.txt` points to it and keeps `/api/` out of search results. The share image is `src/public/og-image.png` (1200×630). Absolute addresses use `NUXT_PUBLIC_SITE_URL` from the root `.env`, or the request's own address when it is unset; set it before deploying. Unknown pages return HTTP 404 with the site's error page, which is marked `noindex`.

## Makefile shortcuts

```bash
make up      # start the container (runs the dev server)
make down    # stop the container
make build   # rebuild the image without cache
make bash    # open a shell in the container
make start   # up + bash
```
