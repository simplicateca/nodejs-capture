const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const { generate_filename } = require("./files");

const chromium = async (source, config = {}) => {
    const params = {
        launch: {
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            timeout: 240000 // 4 minutes,
        },
        viewport: { width: 1920, height: 1080 }, ...(config ?? {}) };

    const instance = await puppeteer.launch( params.launch )
    const page = await instance.newPage();
    await page.setViewport( params.viewport );

    if (source.startsWith("http")) {
        await page.goto(source, { waitUntil: "networkidle2" });
    } else {
        await page.setContent(source, { waitUntil: "networkidle2" });
    }

    await page.evaluate(() => {
        return Promise.all(
            Array.from(document.images)
            .filter(img => !img.complete || img.naturalWidth === 0)
            .map(img => new Promise(resolve => {
                img.onload = img.onerror = resolve;
            }))
        );
    });

    return { instance, page };
};

const capture_screenshot = async (source, { browser, options }) => {
    const { instance, page } = await chromium(source, browser);
    const binary = await page.screenshot( options ?? { fullPage: true } );
    await instance.close();
    return binary;
};

const capture_pdf = async (source, { browser, options }) => {
    const { instance, page } = await chromium( source, browser );
    const binary = await page.pdf( options ?? { format: "A4" } );
    await instance.close();
    return binary;
};

const capture_recording = async (source, { browser, options }) => {
    const { instance, page } = await chromium(source, browser);
    const temp_file = path.join(process.env.TMP_DIR || "/tmp/screencasts", generate_filename("webm"));
    const recording = await page.screencast( options ?? {} );

    await new Promise(resolve => setTimeout(resolve, options.duration ?? 5000));
    await recording.stop();
    await instance.close();
    const binary = await fs.readFile(temp_file);
    await fs.unlink(temp_file).catch(() => {}); // cleanup
    return binary;
};

module.exports = { capture_screenshot, capture_pdf, capture_recording };
