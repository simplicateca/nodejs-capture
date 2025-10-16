const crypto = require("crypto");
const path = require("path");

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
        case "png": return "image/png";
        case "pdf": return "application/pdf";
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

module.exports = { prepare_file, generate_filename, ext_mimetype };
