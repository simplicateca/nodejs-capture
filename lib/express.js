const express = require('express');
const cors = require('cors');

const CAPTURE_TOKEN = process.env.CAPTURE_TOKEN;
if (!CAPTURE_TOKEN) {
    console.error('Error: CAPTURE_TOKEN is not set in the .env file.');
    process.exit(1);
}

// In-memory request history (last 5 requests)
const requestHistory = [];
const MAX_REQUESTS = 5;

const basic_setup = () => {
    const app = express();
    app.use(express.json());

    // CORS Config
    app.use(cors())
    app.options(/.*/, cors());

    // Header Authentication Middleware (skip for /health endpoint)
    app.use((req, res, next) => {
        if (req.path === '/health') {
            return next();
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({});
        }

        const token = authHeader.split(' ')[1];
        if (token !== CAPTURE_TOKEN) {
            return res.status(403).json({});
        }

        next();
    });

    // Request logging middleware (after auth, only logs authenticated requests)
    app.use((req, res, next) => {
        // Skip logging for health endpoints
        if (req.path === '/health' ) {
            return next();
        }

        requestHistory.push({
            endpoint: req.path,
            timestamp: new Date().toISOString()
        });
        if (requestHistory.length > MAX_REQUESTS) {
            requestHistory.shift();
        }
        next();
    });

    // Expose request history getter
    app.getRequestHistory = () => requestHistory;

    return app;
};


module.exports = { basic_setup };