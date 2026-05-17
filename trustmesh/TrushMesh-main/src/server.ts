import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import type { PrismaClient } from "@prisma/client";
import { API_PREFIX } from "./lib/constants.js";
import { env } from "./lib/env.js";
import { loggerOptions } from "./lib/logger.js";
import { prisma as defaultPrisma } from "./lib/prisma.js";
import { redis as defaultRedis, type RedisLike } from "./lib/redis.js";
import { registerErrorHandlers } from "./middleware/errorHandler.js";
import { authPlugin } from "./middleware/auth.js";
import { anchorService, type AnchorVerifier } from "./services/anchor.js";
import { createSnsResolver, type SnsResolver } from "./services/sns.js";
import { registerWebsocketRoutes } from "./websocket/index.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerJobRoutes } from "./routes/jobs.js";
import { registerAgentRoutes } from "./routes/agents.js";
import { registerMessageRoutes } from "./routes/messages.js";
import { registerStatsRoutes } from "./routes/stats.js";
import { registerGraphRoutes } from "./routes/graph.js";

export type AppServices = {
  prisma: PrismaClient;
  redis: RedisLike;
  sns: SnsResolver;
  anchor: AnchorVerifier;
};

export type BuildServerOptions = {
  logger?: FastifyServerOptions["logger"];
  disableRateLimit?: boolean;
  disableWebsocket?: boolean;
  services?: Partial<AppServices>;
};

declare module "fastify" {
  interface FastifyInstance {
    services: AppServices;
  }
}

export async function buildServer(options: BuildServerOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? loggerOptions,
    trustProxy: true
  });

  const services = createServices(options.services);
  app.decorate("services", services);

  registerErrorHandlers(app);

  const allowedOrigins = new Set(
    [
      "https://kubryx.vercel.app",
      env.FRONTEND_URL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null
    ].filter((origin): origin is string => Boolean(origin))
  );

  await app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"), false);
    }
  });

  if (!options.disableRateLimit) {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
      errorResponseBuilder() {
        return {
          data: null,
          error: {
            code: "RATE_LIMITED",
            message: "Rate limit exceeded"
          }
        };
      }
    });
  }

  await app.register(jwt, {
    secret: env.JWT_SECRET
  });

  if (!options.disableWebsocket) {
    await app.register(websocket);
  }
  await app.register(authPlugin);

  await app.register(registerAuthRoutes, { prefix: `${API_PREFIX}/auth` });
  await app.register(registerJobRoutes, { prefix: `${API_PREFIX}/jobs` });
  await app.register(registerAgentRoutes, { prefix: `${API_PREFIX}/agents` });
  await app.register(registerMessageRoutes, { prefix: `${API_PREFIX}/messages` });
  await app.register(registerStatsRoutes, { prefix: `${API_PREFIX}/stats` });
  await app.register(registerGraphRoutes, { prefix: `${API_PREFIX}/graph` });
  if (!options.disableWebsocket) {
    await registerWebsocketRoutes(app);
  }

  app.get('/health', async () => ({ status: 'ok', service: 'trustmesh' }));

  interface SolanaAgent {
    id: string;
    name: string;
    role: string;
    status: string;
    lastAction: string;
  }

  interface SolanaActivity {
    id: string;
    action: string;
    signature: string;
    timestamp: string;
  }

  // Stateful registries for Solana Agents Mesh
  const userAgents = new Map<string, SolanaAgent[]>();
  const userActivities = new Map<string, SolanaActivity[]>();

  const getOrCreateAgents = (pubkey: string): SolanaAgent[] => {
    if (!pubkey) return [];
    if (!userAgents.has(pubkey)) {
      userAgents.set(pubkey, [
        {
          id: 'agent-1',
          name: 'Liquidity Arb Scout',
          role: 'Scout arbitrage opportunities on Raydium/Orca',
          status: 'ACTIVE',
          lastAction: 'Scanned 42 pools'
        }
      ]);
    }
    return userAgents.get(pubkey)!;
  };

  const getOrCreateActivity = (pubkey: string): SolanaActivity[] => {
    if (!pubkey) return [];
    if (!userActivities.has(pubkey)) {
      userActivities.set(pubkey, [
        {
          id: 'act-1',
          action: 'Deployed Liquidity Arb Scout on Solana Devnet',
          signature: '5k8eWn9PhantomInitSignature8z7a9b',
          timestamp: new Date().toISOString()
        }
      ]);
    }
    return userActivities.get(pubkey)!;
  };

  app.post('/api/agents/deploy', async (request, reply) => {
    const body = request.body as { owner: string; name: string; role: string; permissions: string[] };
    const owner = body.owner || 'default';
    const agentsList = getOrCreateAgents(owner);
    const activityList = getOrCreateActivity(owner);
    
    const newAgent: SolanaAgent = {
      id: `agent-${Date.now()}`,
      name: body.name || 'Unnamed Agent',
      role: body.role || 'General tasks',
      status: 'ACTIVE',
      lastAction: 'Initialized'
    };
    
    agentsList.push(newAgent);
    
    const txSig = `sol-deploy-${Math.random().toString(36).slice(2, 10)}-PhantomSig-${Date.now().toString().slice(-4)}`;
    
    activityList.unshift({
      id: `act-${Date.now()}`,
      action: `Deployed agent ${newAgent.name} (Role: ${newAgent.role})`,
      signature: txSig,
      timestamp: new Date().toISOString()
    });
    
    return reply.status(201).send({
      ok: true,
      service: 'trustmesh',
      agent: newAgent,
      signature: txSig,
      status: 'deployed'
    });
  });

  app.get('/api/agents/:pubkey', async (request, reply) => {
    const params = request.params as { pubkey: string };
    const list = getOrCreateAgents(params.pubkey);
    return reply.send(list);
  });

  app.post('/api/agents/delegate', async (request, reply) => {
    const body = request.body as { agentId: string; task: string; signature: string };
    let targetAgentName = 'Agent';
    let ownerPubKey = 'default';
    
    for (const [pubkey, list] of userAgents.entries()) {
      const found = list.find(a => a.id === body.agentId);
      if (found) {
        found.lastAction = `Executing: ${body.task}`;
        targetAgentName = found.name;
        ownerPubKey = pubkey;
        break;
      }
    }
    
    const activityList = getOrCreateActivity(ownerPubKey);
    const txSig = body.signature && body.signature !== 'unsigned-preview' 
      ? body.signature.slice(0, 16) + '...Phantom'
      : `sol-delegate-${Math.random().toString(36).slice(2, 10)}-Ed25519`;
    
    activityList.unshift({
      id: `act-${Date.now()}`,
      action: `Delegated task to ${targetAgentName}: "${body.task}"`,
      signature: txSig,
      timestamp: new Date().toISOString()
    });
    
    return reply.send({
      ok: true,
      service: 'trustmesh',
      delegation: body,
      signature: txSig,
      status: 'delegated'
    });
  });

  app.post('/api/agents/revoke', async (request, reply) => {
    const body = request.body as { agentId: string };
    let ownerPubKey = 'default';
    let targetAgentName = 'Agent';
    
    for (const [pubkey, list] of userAgents.entries()) {
      const idx = list.findIndex(a => a.id === body.agentId);
      if (idx !== -1) {
        targetAgentName = list[idx].name;
        list[idx].status = 'REVOKED';
        list[idx].lastAction = 'Revoked by owner';
        ownerPubKey = pubkey;
        break;
      }
    }
    
    const activityList = getOrCreateActivity(ownerPubKey);
    const txSig = `sol-revoke-${Math.random().toString(36).slice(2, 10)}-Revocation`;
    
    activityList.unshift({
      id: `act-${Date.now()}`,
      action: `Revoked agent ${targetAgentName}`,
      signature: txSig,
      timestamp: new Date().toISOString()
    });
    
    return reply.send({
      ok: true,
      service: 'trustmesh',
      revocation: body,
      signature: txSig,
      status: 'revoked'
    });
  });

  app.get('/api/activity/:pubkey', async (request, reply) => {
    const params = request.params as { pubkey: string };
    const list = getOrCreateActivity(params.pubkey);
    return reply.send(list);
  });

  return app;
}

function createServices(overrides: Partial<AppServices> = {}): AppServices {
  const redis = overrides.redis ?? defaultRedis;
  const sns = overrides.sns ?? createSnsResolver(redis);
  const anchor = overrides.anchor ?? anchorService;

  return {
    prisma: overrides.prisma ?? defaultPrisma,
    redis,
    sns,
    anchor
  };
}
