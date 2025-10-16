const path = require("path");
const crypto = require("crypto");
const { upload2minio } = require("./storage");


const generate_filename = (ext = "tmp", prefix = "") => {
    const id = crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : crypto.randomBytes(16).toString("hex");
    return `${prefix || ""}${id}.${ext}`;
};

const ext_mimetype = (filenameOrExt) => {
    const ext = path.extname(filenameOrExt) || filenameOrExt;
    const clean = ext.toLowerCase().replace(/^\./, "");
    switch (clean) {
        case "png":  return "image/png";
        case "jpeg": return "image/jpeg";
        case "jpg":  return "image/jpeg";
        case "gif":  return "image/gif";
        case "webp": return "image/webp";

        case "pdf":  return "application/pdf";

        case "mp3":  return "audio/mpeg";
        case "wav":  return "audio/wav";
        case "ogg":  return "audio/ogg";

        case "mp4":  return "video/mp4";
        case "webm": return "video/webm";

        default: return "application/octet-stream";
    }
};

const prepare_file = (config = {}, defaults = {}) => {
    const { ext, prefix } = { ...defaults, ...config };

    let full = (config.full_path?.trim() || "").replace(/^\/+|\/+$/g, "");
    let dir = (config.path?.trim() || "").replace(/^\/+|\/+$/g, "");
    let name = (config.file_name?.trim() || "").replace(/^\/+|\/+$/g, "");

    if( !full.length ) {
        name = name.length ? name : generate_filename(ext, prefix);
        full = [dir, name].filter(Boolean).join("/");
    }

    const file = path.extname(full).slice(1) ? full : `${full}.${ext || "tmp"}`;
    const slash = file.indexOf("/");

    return {
        name: file,
        type: ext_mimetype(file),
        bucket: slash > 0 ? file.substring(0, slash) : undefined,
    };
};


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

    if ( (proxy ?? null) && proxy === "phantomjs") {
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

// Common Response Handler + Minio Uploader
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


module.exports = { prepare_file, generate_filename, ext_mimetype, is_valid_url, verify_url, stream_response };
