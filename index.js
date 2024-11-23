const dotenv  = require('dotenv');
const express = require('express');
const cors    = require('cors');
const axios    = require('axios');
const crypto   = require('crypto');
const {Client} = require('minio');
const puppeteer = require('puppeteer');


// Read local .env file and make sure we have everything we need
// --------------------------------------------------------------------
dotenv.config();

const SERVER_PORT = process.env.SERVER_PORT ?? 3000;
const BEARER_TOKEN = process.env.BEARER_TOKEN;
if (!BEARER_TOKEN) {
    console.error('Error: BEARER_TOKEN is not set in the .env file.');
    process.exit(1);
}


// Configure Express to test header auth Bearer token against .env
// --------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(cors())
app.options('*', cors());
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Unauthorized: No Bearer token provided')
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    if (token !== BEARER_TOKEN) {
        console.log('Forbidden: Invalid Bearer token')
        return res.status(403).json({ error: 'Forbidden' });
    }

    next();
});


// Screenshot Endpoint
// --------------------------------------------------------------------
app.post('/screenshot', async (req, res) => {
    try {
        const { url, options, upload } = req.body;
        const { browser, page } = await browserPage( url, options );

        const binary = await page.screenshot(req.body.options?.screenshot || { clip: { x: 0, y: 0, width: 1024, height: 768 } } );
        await browser.close();

        const buffer = Buffer.from(binary);
        const prefix = upload?.prefix ?? 'screenshot-';
        const filename = `${prefix}${random_filename()}.png`;

        if( upload?.path ) {
            const uploadUrl = await minio().putObject( upload.path, filename, buffer);
            return res.status(200).json({ message: 'PNG uploaded successfully', url: uploadUrl });
        }

        res.set('Content-Type', 'image/png');
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);

    } catch( error ) {
        console.error('Error taking screenshot:', error);
        res.status(500).json({ error: 'Failed to take screenshot' });
    }
});


// Screencast Endpoint
// --------------------------------------------------------------------
app.post('/screencast', async (req, res) => {
    try {
        const { url, options, upload } = req.body;
        const { browser, page } = await browserPage( url, options );

        const recorder = await page.screencast(req.body.options?.screencast || { video: { width: 1024, height: 768, frameRate: 30 } } );

        await new Promise(resolve => setTimeout(resolve, 2000));
        await recorder.stop();
        await browser.close();

        const buffer = Buffer.from(recorder);
        const prefix = upload?.prefix ?? 'screencast-';
        const filename = `${prefix}${random_filename()}.webm`;

        if( upload?.path ) {
            const uploadUrl = await minio().putObject( upload.path, filename, buffer);
            return res.status(200).json({ message: 'Webm uploaded successfully', url: uploadUrl });
        }

        res.set('Content-Type', 'video/webm');
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);

    } catch( error ) {
        console.error('Error recording screencast:', error);
        res.status(500).json({ error: 'Failed to record screencast' });
    }
});


// PDF Endpoint
// --------------------------------------------------------------------
app.post('/pdf', async (req, res) => {
    try {
        const { url, options, upload } = req.body;
        const { browser, page } = await browserPage( url, options );
        const binary = await page.pdf(req.body.options?.pdf || { format: 'A4' } );
        await browser.close();

        const buffer = Buffer.from(binary);
        const prefix = upload?.prefix ?? 'webpage-';
        const filename = `${prefix}${random_filename()}.pdf`;

        if( upload?.path ) {
            const uploadUrl = await minio().putObject( upload.path, filename, buffer);
            return res.status(200).json({ message: 'PDF uploaded successfully', url: uploadUrl });
        }

        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);

    } catch( error ) {
        console.error('Error capturing PDF:', error);
        res.status(500).json({ error: 'Failed to capture PDF' });
    }
});


// Upload a URL to MinIO
// --------------------------------------------------------------------
app.post('/upload', async (req, res) => {
    try {
        const { url, path, prefix } = req.body;

        if( ! validate(url) ) {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        if( ! path ) {
            return res.status(400).json({ error: 'Provide a bucket path' });
        }

        const uploadUrl = await url2MinIO( url, path, prefix );
        return res.status(200).json({ message: 'File uploaded successfully', url: uploadUrl });

    } catch( error ) {
        console.error('Error uploading file', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});


// Start the express server
// --------------------------------------------------------------------
app.listen(SERVER_PORT, () => {
    console.log(`Server is running on http://localhost:${SERVER_PORT}`);
});


// Load a URL inside a Puppeteer browser instance
// --------------------------------------------------------------------
const browserPage = async (url, options) => {

    if( ! validate(url) ) {
        console.error('Invalid URL:', url);
        return;
    }

    const browser = await puppeteer.launch(options?.launch || {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport(options?.viewport || { width: 1024, height: 768 } );
    await page.goto(url, options?.goto || { waitUntil: 'networkidle2' });
    return { browser, page };
};


// Configure MinIO Client
// --------------------------------------------------------------------
const minio = () => {
    return new Client({
        port     : process.env.MINIO_PORT,
        useSSL   : ( process.env.MINIO_USE_SSL ?? null ) ? true : false,
        endPoint : process.env.MINIO_ENDPOINT,
        accessKey: process.env.MINIO_ACCESS_KEY || 'YOUR_ACCESS_KEY',
        secretKey: process.env.MINIO_SECRET_KEY || 'YOUR_SECRET_KEY'
    });
};


// Upload a URL to MinIO
// --------------------------------------------------------------------
const url2MinIO = async (url, path, prefix = '') => {
    try {
        // Download file from the provided URL
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        if (response.status !== 200) {
            throw new Error(`Failed to download file from URL: ${url}. HTTP status: ${response.status}`);
        }

        const ls = path.indexOf('/');
        const bucket = ls ? path.substring(0,ls).trim() : path.trim();
        const folder = ls ? path.substring(ls+1).trim() : '';

        // Upload the buffer to MinIO
        const file_name = prefix + random_filename( response );
        const file_path = [folder,file_name].filter(i => i).join('/');
        const file_url  = [process.env.MINIO_ENDPOINT,bucket,file_path].filter(i => i).join('/');
        const meta      = { 'Content-Type': response.headers['content-type'] };
        const buffer    = Buffer.from(response.data, 'binary');

        const minioClient = minio();
        await minioClient.putObject( bucket, file_path, buffer, buffer.length, meta);

        console.log(`File uploaded successfully: ${file_path}`);

        return file_url;
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
};


const validate = (url) => {
    return (url && /^https?:\/\/\S+$/.test(url))
};


// Generate a random filename
const random_filename = (response) => {
    const ext  = response.headers['content-type'].split('/')[1] ?? null;
    return crypto.randomBytes(8).toString('hex').concat( ext ? `.${ext}` : '' );
}