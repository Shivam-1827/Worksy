const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
        logger.warn('Authentication attempt without a token');
        return res.status(401).json({
            message: "Missing login token"
        });
    }

    // This is the key part: using the shared secret to verify the token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            logger.error(`Invalid access token: ${err.message}`);
            return res.status(403).json({
                message: "Invalid access token"
            });
        }
        
        // The token is valid, attach the user info to the request
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;