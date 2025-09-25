const path = require("path");

const is_valid_url = (url) => {
    const trimed = url?.trim();
    if (!trimed.toLowerCase().startsWith("http")) return false;
    if (!trimed.length || trimed.length > 2048) return false;

    try {
        new URL(trimed);
        return true;
    } catch {
        return false;
    }
};

const verify_url = (url, proxy) => {
    if (!is_valid_url(url)) throw new Error("Invalid URL");

    if (proxy === "phantomjs") {
        const PHANTOMJS_URL = process.env.PHANTOMJS_URL;
        if (!PHANTOMJS_URL) {
            console.error("Missing PHANTOMJS_URL in .env file");
            return url;
        }
        return PHANTOMJS_URL + JSON.stringify({
            url,
            renderType: "html",
            requestSettings: {
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
                doneWhen: [{ event: "domReady" }],
            },
        });
    }

    return url;
};

module.exports = { is_valid_url, verify_url };
