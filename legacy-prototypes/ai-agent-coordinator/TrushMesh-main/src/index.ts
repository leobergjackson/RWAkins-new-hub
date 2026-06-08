// Built by vsrupeshkumar
import { buildServer } from "./server.js";
import { redis, redisPublisher, redisSubscriber } from "./lib/redis.js";

const app = await buildServer();
const port = parseInt(process.env.PORT || "3002", 10);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await app.services.prisma.$disconnect();
  await redis.quit?.();
  await redisPublisher.quit?.();
  await redisSubscriber.quit?.();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ port, host: "0.0.0.0" });
