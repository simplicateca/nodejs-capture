const dotenv  = require('dotenv');
dotenv.config();

const { basic_setup } = require("./lib/express");
const { verify_url, prepare_file, stream_response } = require("./lib/utils");
const { capture_screenshot, capture_pdf, capture_recording } = require("./lib/capture");
const { video_optimize, video_looping, video_mp3, video_webm}  = require("./lib/ffmpeg");

const app = basic_setup();


// -------------------------------------------------------------------------------
// Puppeteer Capture Endpoints
// -------------------------------------------------------------------------------

// Webpage Screenshot
app.post('/screenshot', async (req, res) => {
    const { url, proxy, browser, config, upload } = req.body;
    try {
        const file = prepare_file( upload, { prefix: 'screenshot-', ext: 'png' });
        const blob = await capture_screenshot( verify_url(url, proxy), { browser, options: config } );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/screenshot:', err);
        res.status(500).json({ error: err.message });
    }
});


// Webpage to PDF
app.post('/pdf', async (req, res) => {
    const { url, proxy, browser, config, upload } = req.body;
    try {
        const params = browser ?? { viewport: { width: 1080, height: 1920 } };

        const file = prepare_file( upload, { prefix: 'webpage-', ext: 'pdf' });
        const blob = await capture_pdf( verify_url(url, proxy), { browser: params, options: config } );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/pdf:', err);
        res.status(500).json({ error: err.message });
    }
});


// Webpage Screen Recording
app.post('/recording', async (req, res) => {
    const { url, proxy, browser, config, upload } = req.body;
    if (proxy) { return res.status(400).json({ error: 'Can not proxy recording requests' }); }
    try {
        const file = prepare_file( upload, { prefix: 'webclip-', ext: 'webm' });
        const blob = await capture_recording( verify_url(url), { browser, options: config } );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/recording:', err);
        res.status(500).json({ error: err.message });
    }
});



// -------------------------------------------------------------------------------
// FFMPEG Video Processing Endpoints
// -------------------------------------------------------------------------------

// Optimize video for web playback
app.post("/optimize-video", async (req, res) => {
    const { url, upload } = req.body;
    try {
        const file = prepare_file( upload, { ext: 'mp4' } );
        const blob = await video_optimize( verify_url(url) );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/optimize-video:', err);
        res.status(500).json({ error: err.message });
    }
});


// Optimize video for silent web playback
app.post("/optimize-silent-video", async (req, res) => {
    const { url, upload } = req.body;
    try {
        const file = prepare_file( upload, { ext: 'mp4' } );
        const blob = await video_optimize( verify_url(url), { audio: false } );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/optimize-silent-video:', err);
        res.status(500).json({ error: err.message });
    }
});


// Optimize video for background (silent, looping) web playback
app.post("/optimize-looping-video", async (req, res) => {
    const { url, upload } = req.body;
    try {
        const file = prepare_file( upload, { ext: 'mp4' } );
        const blob = await video_looping( verify_url(url) );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/optimize-looping-video:', err);
        res.status(500).json({ error: err.message });
    }
});


// Convert video to webm format
app.post("/video-to-webm", async (req, res) => {
    const { url, upload } = req.body;
    try {
        const file = prepare_file( upload, { ext: 'webm' } );
        const blob = await video_webm( verify_url(url) );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/video-to-webm:', err);
        res.status(500).json({ error: err.message });
    }
});


// Extract audio from video (video to mp3)
app.post("/video-to-mp3", async (req, res) => {
    const { url, upload } = req.body;
    try {
        const file = prepare_file( upload, { ext: 'mp3' } );
        const blob = await video_mp3( verify_url(url) );
        return stream_response( res, { file, blob } );
    } catch (err) {
        console.error('/video-to-mp3:', err);
        res.status(500).json({ error: err.message });
    }
});
// -------------------------------------------------------------------------------


// -------------------------------------------------------------------------------
// Start the Express.js server
// -------------------------------------------------------------------------------
const server = app.listen( process.env.SERVER_PORT ?? 3000, () => {
    console.log(`Server is running on http://localhost:${server.address().port}.`);
});

server.setTimeout( process.env.SERVER_TIMEOUT ?? 10 * 60 * 1000 );