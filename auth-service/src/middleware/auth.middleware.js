const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");
const { redisClient } = require("../config/redis");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    logger.warn("Authentication attempt without a token");
    return res.status(401).json({ message: "Missing login token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const lastLogoutAt = await redisClient.get(`lastLogoutAt:${decoded.id}`);
    if (lastLogoutAt) {
      const iatMs = decoded.iat * 1000;
      if (iatMs <= Number(lastLogoutAt)) {
        return res
          .status(401)
          .json({ message: "Session expired. Please log in again." });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    logger.error(`Invalid access token: ${err.message}`);
    return res.status(403).json({ message: "Invalid access token" });
  }
};

module.exports = authenticateToken;
