require("dotenv").config();

const env = process.env;

const config = {
  nodeEnv: env.NODE_ENV || "development",
  port: Number.parseInt(env.PORT || "3001", 10),
  db: {
    host: env.DB_HOST || "localhost",
    port: Number.parseInt(env.DB_PORT || "5432", 10),
    user: env.DB_USER || "annuaire",
    password: env.DB_PASSWORD || "annuaire",
    database: env.DB_NAME || "annuaire",
  },
  allowedEmailDomains: (env.ALLOWED_EMAIL_DOMAINS || "univ-paris13.fr")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean),
  allowDevUser: env.ALLOW_DEV_USER === "true",
};

module.exports = config;
