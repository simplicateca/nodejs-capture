const dotenv  = require('dotenv');
const express = require('express');
const cors    = require('cors');

const { verify_url } = require("./lib/utils");
const { prepare_file } = require("./lib/files");
const { capture_screenshot, capture_pdf, capture_recording } = require("./lib/capture");
const { upload2minio } = require("./lib/storage");

dotenv.config();

const SERVER_PORT = process.env.SERVER_PORT ?? 3000;
const BEARER_TOKEN = process.env.BEARER_TOKEN;
if (!BEARER_TOKEN) {
    console.error('Error: BEARER_TOKEN is not set in the .env file.');
    process.exit(1);
}

const app = express();
app.use(express.json());
app.use(cors())
app.options(/.*/, cors());


// Test Header Auth Token against .env
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


// Screenshot Endpoint
app.post('/screenshot', async (req, res) => {
    const { url, proxy, browser, config, upload } = req.body;
    console.log( upload )
    try {
        const file = prepare_file( upload, { prefix: 'screenshot-', ext: 'png' });
        const blob = await capture_screenshot( verify_url(url, proxy), { browser, config } );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/screenshot:', err);
        res.status(500).json({ error: err.message });
    }
});


// Recording Endpoint
app.post('/recording', async (req, res) => {
    const { url, proxy, browser, config, upload } = req.body;
    if (proxy) { return res.status(400).json({ error: 'Can not proxy recording requests' }); }
    try {
        const file = prepare_file( upload, { prefix: 'webclip-', ext: 'webm' });
        const blob = await capture_recording( verify_url(url), { browser, config } );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/recording:', err);
        res.status(500).json({ error: err.message });
    }
});


// PDF Endpoint
app.post('/pdf', async (req, res) => {
    const { url, proxy, browser, config, upload } = req.body;
    try {
        const params = browser ?? { viewport: { width: 1080, height: 1920 } };

        const file = prepare_file( upload, { prefix: 'webpage-', ext: 'pdf' });
        const blob = await capture_pdf( verify_url(url, proxy), { params, config } );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/pdf:', err);
        res.status(500).json({ error: err.message });
    }
});


// Start the Express.js server
app.listen(SERVER_PORT, () => {
    console.log(`Server is running on http://localhost:${SERVER_PORT}`);
});


// Common Response Handler
const stream_response = async (res, data) => {
    if (process.env.MINIO_ENDPOINT && data?.file?.bucket && data?.blob) {
        const upload = await upload2minio(data.file, data.blob);
        return res.json(upload);
    }
    res.set("Content-Type", data.file.type);
    res.set("Content-Length", data.blob.length);
    res.set("Content-Disposition", `attachment; filename="${data.file.name}"`);
    res.end(Buffer.from(data.blob, 'binary'));
};