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
COPY tools/contract-codegen ./tools/contract-codegen
COPY scripts/docker/build-desktop.mjs ./scripts/docker/build-desktop.mjs
RUN pnpm run contracts:generate && node scripts/docker/build-desktop.mjs /build/dist

FROM node:22.16.0-bookworm-slim@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34
USER root
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg fonts-noto-cjk curl && rm -rf /var/lib/apt/lists/*
COPY apps/worker-host/requirements.txt /tmp/worker-requirements.txt
COPY docker/sound-requirements.txt /tmp/sound-requirements.txt
RUN python3 -m venv /opt/ave-python && /opt/ave-python/bin/pip install --no-cache-dir -r /tmp/worker-requirements.txt -r /tmp/sound-requirements.txt
COPY --from=build /build/dist/app /opt/ave/app
COPY --from=build /build/node_modules /opt/ave/node_modules
COPY scripts/stage3/yamnet_service.py /opt/ave/yamnet_service.py
COPY docker/download-sound.py /opt/ave/download-sound.py
RUN /opt/ave-python/bin/python /opt/ave/download-sound.py /opt/ave/sound && rm -rf /opt/ave/node_modules/electron
COPY docker/start-desktop.sh /usr/local/bin/ave-desktop
COPY docker/health-desktop.sh /usr/local/bin/ave-health

COPY docker/configure.py docker/model-services.template.json /opt/ave/
RUN sed -i 's/\r$//' /usr/local/bin/ave-desktop /usr/local/bin/ave-health && chmod 755 /usr/local/bin/ave-desktop /usr/local/bin/ave-health && mkdir -p /workspace/materials /workspace/projects /workspace/exports /workspace/uploads /config && chown -R node:node /workspace /config
ENV AVE_PYTHON=/opt/ave-python/bin/python AVE_MODEL_CONFIG=/run/ave/model-services.json AVE_FONT_FILE=/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc

ENTRYPOINT ["/opt/ave-python/bin/python", "/opt/ave/configure.py", "--launch"]
