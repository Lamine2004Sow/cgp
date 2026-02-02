const express = require("express");
const config = require("./config");
const { pool } = require("./db");
const { authMiddleware } = require("./auth");
const routes = require("./routes");

const app = express();

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get("/api/db-time", async (_req, res) => {
  try {
    const result = await pool.query("select now() as now;");
    res.json({ now: result.rows[0]?.now });
  } catch (error) {
    res.status(500).json({ error: "DB_ERROR" });
  }
});

app.use("/api", authMiddleware, routes);

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.statusCode || 500;
  res.status(status).json({
    error: error.code || "SERVER_ERROR",
    message: error.message || "Une erreur est survenue",
  });
});

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`Backend listening on http://0.0.0.0:${config.port}`);
});

const shutdown = async () => {
  server.close();
  await pool.end();
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
