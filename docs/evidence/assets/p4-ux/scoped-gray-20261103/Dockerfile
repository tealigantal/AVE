FROM node:22.16.0-bookworm-slim@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS build
WORKDIR /build
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY contracts ./contracts
COPY database ./database
COPY resources/audio ./resources/audio
COPY tools/contract-codegen ./tools/contract-codegen
COPY scripts/docker/build-desktop.mjs ./scripts/docker/build-desktop.mjs
RUN pnpm run contracts:generate && node scripts/docker/build-desktop.mjs /build/dist


FROM ave-p4-browser:grayscale-20261103@sha256:25d4dec400ef4c7b89965bd6b62c542780521d5f036ef0304e97824f2da8ae8c
USER root
COPY --from=build /build/dist/app /opt/ave/app
RUN echo "10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de  /opt/ave/sound/yamnet.tflite" | sha256sum -c - && echo "cdf24d193e196d9e95912a2667051ae203e92a2ba09449218ccb40ef787c6df2  /opt/ave/sound/yamnet_class_map.csv" | sha256sum -c -
