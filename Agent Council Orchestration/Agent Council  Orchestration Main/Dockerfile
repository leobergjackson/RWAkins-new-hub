# Stage 1: Build dashboard
FROM node:22 AS dashboard-build
WORKDIR /app/dashboard
COPY dashboard/package.json ./
RUN npm install
COPY dashboard/ ./
RUN npm run build

# Stage 2: Build agent
FROM node:22 AS agent-build
WORKDIR /app/agent
COPY agent/package.json ./
RUN npm install
COPY agent/ ./
RUN npx tsc
RUN npm prune --omit=dev

# Stage 3: Production runtime
FROM node:22-slim
WORKDIR /app

COPY --from=agent-build /app/agent/node_modules ./agent/node_modules
COPY --from=agent-build /app/agent/package.json ./agent/package.json
COPY --from=agent-build /app/agent/dist ./agent/dist

COPY agent/contracts ./agent/contracts
COPY agent/circuits ./agent/circuits
COPY agent/SKILL.md ./agent/SKILL.md
COPY agent/SOUL.md ./agent/SOUL.md

COPY --from=dashboard-build /app/dashboard/dist ./dashboard/dist

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "agent/dist/index.js"]
