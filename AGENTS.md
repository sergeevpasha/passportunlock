# Repository instructions

These instructions apply to the entire repository. Communicate with the user in English unless they explicitly request another language in their current message. Also follow applicable parent instructions, `CLAUDE.md` files, and `.claude` safety rules.

## Always run the application through Docker

- Run all application commands inside the Docker Compose `app` service: dependency installation, development servers, builds, previews, linting, formatting, tests and type checks.
- Never run the project's Node.js, Yarn, npm, npx, Corepack, Nuxt, ESLint, Prettier, or TypeScript commands directly on the host. Do not install host dependencies or switch package managers.
- Host commands for Git, file inspection/editing, Docker Compose, and browser/HTTP verification are fine.
- Run Compose commands from the repository root, where `docker-compose.yml` lives. Use service name `app`; the container name is `passportunlock`.
- Prefer `docker compose exec -T app ...` for automated commands in a running container. Use `docker compose exec app bash` for an interactive shell.
- If Docker is unavailable, report the blocker and resolve Docker access; do not fall back to a host runtime.

## Project and container layout

- The app is a Nuxt 4 / Vue 3 app using TypeScript and Tailwind CSS 4. So far it is an empty scaffold: one placeholder page, no server routes and no tests.
- Application source and `package.json` are in `src/`, in Nuxt 4's layout: `app/` holds the Vue app (`app.vue`, `layouts/`, `pages/` and `assets/css/main.css`, plus `components/`, `composables/` and `utils/` as they are needed), `server/` the Nitro routes, and `shared/` the code both use. `server/` and `shared/` don't exist yet; create them with their first file. Static files are in `public/`. Unit tests go in `test/` as `*.test.ts`.
- Tailwind is configured in CSS. `app/assets/css/main.css` imports Tailwind and holds the base styles, including the one keyboard focus ring every control uses. Add theme tokens there in an `@theme` block; there is no `tailwind.config` file.
- In Vue components, `<script setup lang="ts">` comes before `<template>`. ESLint enforces both the block order and the script language (`vue/block-order`, `vue/block-lang`).
- `Dockerfile` currently uses Node.js `24.21.0` on Debian Trixie. Corepack provides the Yarn version pinned by `src/package.json` (`4.18.1`).
- Compose bind-mounts `./src` to `/var/www`, which is the container's working directory. Paths passed to application tools are relative to `/var/www`, so use `app/pages/index.vue`, not `src/app/pages/index.vue`.
- The container runs as user `node`. Build arguments `UID` and `GID` default to `1000`; preserve this setup and do not work around permission problems by routinely running the app as root.
- `node_modules`, `.nuxt`, and `.output` created in the container appear under local `src/`. They are generated files and must not be committed or edited as source.

## Start the development app

Ensure Docker is running. Create the root `.env` only if it is missing; preserve existing values:

```sh
test -f .env || cp .env.example .env
docker compose up --build -d
docker compose logs --tail=100 app
docker compose ps
docker compose port app 3000
```

- `.env.example` sets `DOCKER_NODEJS_PORT=3024`, giving `http://localhost:3024`. Compose falls back to host port `3000` when the variable is unset or empty. Check the actual mapping instead of assuming the port.
- The app listens on container port `3000`; Compose sets `HOST=0.0.0.0`.
- Root `.env` is passed into the container. It sets the host port and, optionally, `NUXT_PUBLIC_SITE_URL` (the public address used for canonical links, the sitemap and share cards) and `WIKIMEDIA_CONTACT` (for the data sync). Secrets added later belong there, not in the repository; read them on the server through private `runtimeConfig` and do not expose or commit them.
- The Dockerfile's default command is `sh -c "yarn install --immutable && exec yarn dev"`. Installation happens on each normal container start, before the dev server. There is no custom entrypoint script or `/build` dependency directory.
- Wait for installation and the Nuxt ready message before testing the page. A running container alone does not prove the server is ready.
- Source edits are visible through the bind mount and Nuxt hot reload. Do not start another `yarn dev` process in the same container.
- Hot reload uses the same published port (Vite's HMR websocket connects to the page's port), so no separate HMR port mapping is needed.

## Daily Docker commands

Run these from the repository root:

| Task | Command |
| --- | --- |
| Start existing development service | `docker compose up -d` |
| Rebuild image and start/recreate service | `docker compose up --build -d` |
| Check status | `docker compose ps` |
| Read recent logs | `docker compose logs --tail=100 app` |
| Follow logs interactively | `docker compose logs -f app` |
| Open an interactive shell | `docker compose exec app bash` |
| Sync dependencies to the current lockfile | `docker compose exec -T app yarn install --immutable` |
| Lint (ESLint, then a Prettier check of every file) | `docker compose exec -T app yarn lint` |
| Apply lint fixes when requested | `docker compose exec -T app yarn lint:fix` |
| Type-check app, server, shared and test code | `docker compose exec -T app yarn typecheck` |
| Run the unit tests | `docker compose exec -T app yarn test` |
| Check formatting of a changed file | `docker compose exec -T app yarn prettier --check app/pages/index.vue` |
| Format a changed file | `docker compose exec -T app yarn prettier --write app/pages/index.vue` |
| Restart and rerun startup installation | `docker compose restart app` |
| Stop without removing the container | `docker compose stop app` |
| Stop and remove the development containers/network | `docker compose down` |
| Validate Compose configuration | `docker compose config --quiet` |

Builds are not in this table on purpose: run `yarn build` or `yarn generate` only with the dev service stopped (next section), because they rewrite the `src/.nuxt` the dev server uses. Replace example file paths with the files being changed. `yarn format` formats the entire application; prefer targeted formatting to avoid unrelated edits. `yarn test` runs the Vitest unit tests in `src/test/`; it passes while there are none (`--passWithNoTests`). `yarn typecheck` runs vue-tsc and is not part of `yarn lint`.

After pulling dependency changes or switching branches, restart the service or run the install command explicitly. `docker compose up -d` alone does not restart an already-running, unchanged container. After changing the Dockerfile, rebuild with `docker compose up --build -d`. After changing `.env` or Compose runtime settings, use `docker compose up -d --force-recreate app`; a simple restart does not reload container environment values.

## Commands when the service is stopped

Custom commands passed to `docker compose run` replace the Dockerfile's default command, so they **skip automatic dependency installation**. Install explicitly before running tools when dependencies may be missing or outdated:

```sh
docker compose build app
docker compose run --rm --no-deps -T app sh -c 'yarn install --immutable && yarn lint'
docker compose run --rm --no-deps -T app sh -c 'yarn install --immutable && yarn build'
```

Choose the check relevant to the task; there is no need to run both for every edit. These temporary containers share the same `src/` bind mount and generated outputs. Avoid overlapping installs or builds against that shared directory.

For a local production preview, stop the dev service to free its port, then build and preview in a temporary container:

```sh
docker compose stop app
docker compose run --rm --no-deps -T --service-ports app sh -c 'yarn install --immutable && yarn build && exec yarn preview --port 3000'
```

`--service-ports` publishes the configured browser port; ordinary `docker compose run` does not. Stop the foreground preview with Ctrl+C, then return to development with `docker compose up -d`. This Dockerfile is a development environment, not a production deployment workflow.

## Intentional dependency changes

`src/.yarnrc.yml` enables immutable installs. Routine installation must respect `src/yarn.lock`. If the dependency manifest and lockfile disagree, startup fails rather than silently rewriting the lockfile.

When an authorized dependency change requires regenerating the lockfile after editing `src/package.json`, allow it for that single Docker command:

```sh
docker compose run --rm --no-deps -T -e YARN_ENABLE_IMMUTABLE_INSTALLS=false app yarn install
```

Review the resulting `src/package.json` and `src/yarn.lock` changes together. Keep immutable installs enabled in the committed configuration. Do not delete the lockfile or disable immutability just to get past an unexplained installation failure.

`src/.yarnrc.yml` keeps Yarn's safer defaults: third-party install scripts don't run, git dependencies are blocked, and a version published less than a day ago isn't installed yet. If a new dependency needs its install script, allow that package with `dependenciesMeta` instead of turning scripts on for all. When `packageManager` moves to a newer Yarn, Yarn may rewrite `.yarnrc.yml` to keep older, looser behavior (`enableScripts: true`, `npmMinimalAgeGate: 0`, `approvedGitRepositories`); review the file and remove those.

TypeScript stays on 6.x. TypeScript 7 is the native compiler without a JavaScript API, which vue-tsc and typescript-eslint need. `@types/node` follows the Node major version of the Dockerfile (24). `vite` and `rolldown` are listed because Nuxt and the Tailwind and Vitest plugins expect the project to provide them; keep them on the versions Nuxt uses.

## Production and hosting

The app is not deployed yet. There is no domain, hosting, analytics, CI or deployment configuration; do not add any unless the user asks.

## Troubleshooting

- The dev server shares `src/.nuxt` with any other Nuxt process that uses `src/`. Running `yarn build` or `yarn generate` while it is up rewrites `.nuxt`, and every page then returns 500 (`Package import specifier "#internal/nuxt/paths" is not defined`). A Nuxt process outside the container causes similar 500s, such as `Cannot find module …/client.manifest.mjs` with the other environment's path. Stop the other process, then run `docker compose restart app`.

## Make shortcuts and verification

The Makefile wraps Docker: `make up` starts the service, `make down` stops/removes it, `make build` rebuilds the image with `--no-cache`, `make bash` opens an interactive shell, and `make start` starts the service and opens a shell. There are no `make dev` or `make test` targets. Prefer direct Compose commands for noninteractive automation.

Validate changes with the relevant Docker commands above. For startup or UI changes, inspect logs and verify the page at the published port. Keep verification proportional to the change; documentation-only edits do not require rebuilding the app. Report which checks actually ran and any failures or blockers. Preserve unrelated working-tree changes and omit AI attribution from code, commits, and PR descriptions.
