import { PeerServer } from "peer";

const port = Number(process.env.PEER_PORT || 9000);
const path = process.env.PEER_PATH || "/peerjs";
const key = process.env.PEER_KEY || "peerjs";
const allowDiscovery = (process.env.PEER_ALLOW_DISCOVERY || "false") === "true";
const proxied = (process.env.PEER_PROXIED || "false") === "true";
const aliveTimeout = Number(process.env.PEER_ALIVE_TIMEOUT_MS || 60000);
const concurrentLimit = Number(process.env.PEER_CONCURRENT_LIMIT || 5000);
const allowedOrigins = (process.env.PEER_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const server = PeerServer({
  port,
  path,
  key,
  allow_discovery: allowDiscovery,
  proxied,
  alive_timeout: aliveTimeout,
  concurrent_limit: concurrentLimit,
  corsOptions: allowedOrigins.length ? { origin: allowedOrigins } : undefined,
});

server.on("connection", (client) => {
  console.log(`peer connected: ${client.getId()}`);
});

server.on("disconnect", (client) => {
  console.log(`peer disconnected: ${client.getId()}`);
});

const shutdown = (signal) => {
  console.log(`PeerJS server received ${signal}; shutting down.`);
  if (typeof server.close === "function") {
    server.close(() => process.exit(0));
    return;
  }
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log(`PeerJS server listening on :${port}${path}`);
console.log(`PeerJS discovery=${allowDiscovery} proxied=${proxied} alive_timeout=${aliveTimeout} concurrent_limit=${concurrentLimit}`);
