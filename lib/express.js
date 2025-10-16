const express = require('express');
const cors = require('cors');

const BEARER_TOKEN = process.env.BEARER_TOKEN;
if (!BEARER_TOKEN) {
    console.error('Error: BEARER_TOKEN is not set in the .env file.');
    process.exit(1);
}

const basic_setup = () => {
    const app = express();
    app.use(express.json());

    // CORS Config
    app.use(cors())
    app.options(/.*/, cors());

    // Header Authentication Middleware
    app.use((req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({});
        }

        const token = authHeader.split(' ')[1];
        if (token !== BEARER_TOKEN) {
            return res.status(403).json({});
        }

        next();
    });

    return app;
};


module.exports = { basic_setup };