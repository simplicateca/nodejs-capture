const express = require('express');
const puppeteer = require('puppeteer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN;

if (!API_TOKEN) {
    console.error('Error: API_TOKEN is not set in the .env file.');
    process.exit(1);
}

app.use(express.json());

app.use((req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No Bearer token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (token !== API_TOKEN) {
        return res.status(403).json({ error: 'Forbidden: Invalid Bearer token' });
    }

    next();
});

async function newBrowser(body) {
    const { url, options } = body || {};

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
}

function validate(url) {
    return (url && /^https?:\/\/\S+$/.test(url))
}

app.post('/screenshot', async (req, res) => {
    try {
        const { browser, page } = await newBrowser(req.body);
        const binary = await page.screenshot(req.body.options?.screenshot || { clip: { x: 0, y: 0, width: 1024, height: 768 } } );
        await browser.close();

        res.set('Content-Type', 'image/png');
        res.set('Content-Disposition', 'attachment; filename="screenshot.png"');
        res.send(Buffer.from(binary));
    } catch( error ) {
        console.error('Error taking screenshot:', error);
        res.status(500).json({ error: 'Failed to take screenshot' });
    }
});

app.post('/screencast', async (req, res) => {
    try {
        const { browser, page } = await newBrowser(req.body);
        const binary = await page.screencast(req.body.options?.screencast || { video: { width: 1024, height: 768, frameRate: 30 } } )

        await new Promise(resolve => setTimeout(resolve, 2000));

        await page.screencast({ stop: true });
        await browser.close();

        res.set('Content-Type', 'video/webm');
        res.set('Content-Disposition', 'attachment; filename="screencast.webm"');
        res.send(Buffer.from(binary));
    } catch( error ) {
        console.error('Error recording screencast:', error);
        res.status(500).json({ error: 'Failed to record screencast' });
    }
});

app.post('/pdf', async (req, res) => {
    try {
        const { browser, page } = await newBrowser(req.body);
        const binary = await page.pdf(req.body.options?.pdf || { format: 'A4' } );
        await browser.close();

        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'attachment; filename="webpage.pdf"');
        res.send(Buffer.from(binary));
    } catch( error ) {
        console.error('Error capturing PDF:', error);
        res.status(500).json({ error: 'Failed to capture PDF' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Screenshot app listening at http://localhost:${PORT}`);
});