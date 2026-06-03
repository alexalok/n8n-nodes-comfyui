ARG N8N_IMAGE=docker.n8n.io/n8nio/n8n:2.20.6
FROM ${N8N_IMAGE}

USER root

RUN mkdir -p /home/node/.n8n/custom/node_modules/n8n-nodes-comfyui-ex

WORKDIR /home/node/.n8n/custom/node_modules/n8n-nodes-comfyui-ex

COPY --chown=node:node package.json pnpm-lock.yaml index.js ./
COPY --chown=node:node dist ./dist

RUN corepack prepare pnpm@9.1.4 --activate \
	&& pnpm install --prod --frozen-lockfile --ignore-scripts \
	&& chown -R node:node /home/node/.n8n/custom

USER node
