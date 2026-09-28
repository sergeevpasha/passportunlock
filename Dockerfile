FROM node:24.21.0-trixie-slim

ARG UID=1000
ARG GID=1000

USER root
RUN groupmod -o -g "${GID}" node && usermod -o -u "${UID}" -g "${GID}" node
RUN apt-get update && apt-get install -y --no-install-recommends ripgrep && rm -rf /var/lib/apt/lists/*
RUN corepack enable

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

USER node

WORKDIR /var/www

CMD ["sh", "-c", "yarn install --immutable && exec yarn dev"]
