const { query } = require("./db");
const config = require("./config");

const loadUserByLogin = async (login) => {
  const result = await query(
    "select * from utilisateur where login = $1 limit 1",
    [login],
  );
  return result.rows[0] || null;
};

const loadUserById = async (id) => {
  const result = await query(
    "select * from utilisateur where id_user = $1 limit 1",
    [id],
  );
  return result.rows[0] || null;
};

const loadFallbackUser = async () => {
  const result = await query(
    "select * from utilisateur order by id_user asc limit 1",
  );
  return result.rows[0] || null;
};

const authMiddleware = async (req, res, next) => {
  try {
    const login = req.header("x-user-login");
    const userId = req.header("x-user-id");

    if (login) {
      const user = await loadUserByLogin(login);
      if (user) {
        req.user = user;
        return next();
      }
      return res.status(401).json({ error: "UNKNOWN_USER" });
    }

    if (userId) {
      const user = await loadUserById(userId);
      if (user) {
        req.user = user;
        return next();
      }
      return res.status(401).json({ error: "UNKNOWN_USER" });
    }

    if (config.allowDevUser) {
      const user = await loadFallbackUser();
      if (user) {
        req.user = user;
        return next();
      }
    }

    return res.status(401).json({ error: "UNAUTHENTICATED" });
  } catch (error) {
    return next(error);
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }
  return next();
};

module.exports = { authMiddleware, requireAuth };
