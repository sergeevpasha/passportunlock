# Passport Unlock

An empty Nuxt 4 app to build Passport Unlock on. It has one placeholder page and no features yet.

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
docker compose exec -T app yarn test       # Vitest unit tests in src/test/ (none yet)
```

## Makefile shortcuts

```bash
make up      # start the container (runs the dev server)
make down    # stop the container
make build   # rebuild the image without cache
make bash    # open a shell in the container
make start   # up + bash
```
