const Minio = require("minio");
const path = require("path");

const upload2minio = async (file, binary) => {
    if (!binary) throw new Error("No binary data provided");
    if (!file?.name) throw new Error("No file name provided");

    const S3_ENDPOINT = process.env.S3_ENDPOINT;
    if (!S3_ENDPOINT) throw new Error("S3_ENDPOINT is not set");

    const slash = file.name.indexOf("/");
    if (slash < 0) throw new Error("Invalid file path format");

    const bucket = file.name.substring(0, slash);
    const saveas = file.name.substring(slash + 1);

    const client = new Minio.Client({
        endPoint: S3_ENDPOINT,
        port: process.env.S3_PORT || 443,
        accessKey: process.env.S3_ACCESS_KEY,
        secretKey: process.env.S3_SECRET_KEY,
    });

    await client.putObject(bucket, saveas, Buffer.from(binary), binary.length, {
        "Content-Type": file.type,
    });

    const protocol = process.env.S3_USE_SSL ? "https://" : "http://";
    const url = `${protocol}${S3_ENDPOINT}/${bucket}/${saveas}`;

    return {
        url,
        bucket,
        type: file.type,
        name: path.basename(saveas),
        size: binary.length,
    };
};

module.exports = { upload2minio };
