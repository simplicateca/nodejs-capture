const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const { generate_filename } = require("./files");

const chromium = async (source, config = {}) => {
    const instance = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ...config,
    });

    const page = await instance.newPage();
    if (source.startsWith("http")) {
        await page.goto(source, { waitUntil: "domcontentloaded" });
    } else {
        await page.setContent(source, { waitUntil: "domcontentloaded" });
    }
    return { instance, page };
};

const capture_screenshot = async (source, { browser, config }) => {
    const { instance, page } = await chromium(source, browser);
    const binary = await page.screenshot(config ?? { fullPage: true });
    await instance.close();
    return binary;
};

const capture_pdf = async (source, { browser, config }) => {
    const { instance, page } = await chromium(source, browser);
    const binary = await page.pdf(config ?? { format: "A4" });
    await instance.close();
    return binary;
};

const capture_recording = async (source, { browser, config }) => {
    const { instance, page } = await chromium(source, browser);
    const tmpdir = process.env.TMP_DIR || "/tmp/screencasts";
    const tmpfile = path.join(tmpdir, generate_filename("webm"));
    const recording = await page.screencast({
        path: tmpfile,
        video: {
            width: config?.width ?? 1920,
            height: config?.height ?? 1080,
            frameRate: config?.frameRate ?? 30,
        },
    });

    await new Promise(resolve => setTimeout(resolve, config?.duration ?? 5000));
    await recording.stop();
    await instance.close();
    const binary = await fs.readFile(tmpfile);
    await fs.unlink(tmpfile).catch(() => {}); // cleanup
    return binary;
};

module.exports = { capture_screenshot, capture_pdf, capture_recording };
