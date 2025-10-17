const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { promisify } = require("util");

const unlink = promisify(fs.unlink);
ffmpeg.setFfmpegPath( process.env.FFMPEG_PATH ?? "/usr/bin/ffmpeg" );

/**
 * Write a Buffer to temp file if needed. Return path.
 */
async function prepareInput(input) {
    if (Buffer.isBuffer(input)) {
        const tmp = path.join(os.tmpdir(), `input-${Date.now()}.mp4`);
        await fs.promises.writeFile(tmp, input);
        return tmp;
    }
    // assume it's a URL or local path string
    return input;
}

/**
 * Read file → Buffer and clean up.
 */
async function readAndClean(file) {
    const data = await fs.promises.readFile(file);
    await unlink(file).catch(() => {});
    return data;
}


/**
 * Optimize a video for web playback.
 * @param {Buffer|string} input - Buffer or file/URL path.
 * @param {object} [options]
 * @param {boolean} [options.audio=true] - Include audio track.
 * @param {number} [options.crf=23] - Quality factor (lower = better).
 * @param {string} [options.preset="veryfast"] - Encoding speed preset.
 * @returns {Promise<Buffer>} - Optimized MP4 buffer.
 */
async function video_optimize(input, options = {}) {
    const {
        audio = true,
        crf = 23,
        preset = "veryfast",
    } = options;

    const inFile = await prepareInput(input);
    const outFile = path.join(os.tmpdir(), `optimized-${Date.now()}.mp4`);

    return new Promise((resolve, reject) => {
        const cmd = ffmpeg(inFile)
            .videoCodec("libx264")
            .outputOptions([
                `-preset ${preset}`,
                `-crf ${crf}`,
                "-movflags +faststart"
            ]);

        if (audio) {
            cmd.outputOptions(["-c:a aac", "-b:a 128k"]);
        } else {
            cmd.noAudio();
        }

        cmd
            .on("end", async () => {
                try { resolve(await readAndClean(outFile)); }
                catch (e) { reject(e); }
            })
            .on("error", reject)
            .save(outFile);
    });
}


/**
 * Extract only audio as MP3.
 */
async function video_mp3(input) {
    const inFile = await prepareInput(input);
    const outFile = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);

    return new Promise((resolve, reject) => {
        ffmpeg(inFile)
            .noVideo()
            .audioCodec("libmp3lame")
            .audioBitrate("192k")
            .on("end", async () => {
                try {
                    const buf = await readAndClean(outFile);
                    resolve(buf);
                } catch (e) { reject(e); }
            })
            .on("error", reject)
            .save(outFile);
    });
}


/**
 * Optimize a video for looping background use:
 * - Downscale to 720p (keeps aspect ratio)
 * - No audio
 * - Lower bitrate (CRF 28)
 * - Faststart enabled
 * - Good balance of quality/speed
 */
async function video_looping(input) {
    const inFile = await prepareInput(input);
    const outFile = path.join(os.tmpdir(), `background-${Date.now()}.mp4`);

    return new Promise((resolve, reject) => {
        ffmpeg(inFile)
            .noAudio()
            .videoCodec("libx264")
            .outputOptions([
                "-vf scale=-2:720",      // maintain aspect ratio, max height 720
                "-preset veryfast",
                "-crf 28",
                "-movflags +faststart",
                "-pix_fmt yuv420p"       // for browser compatibility
            ])
            .on("end", async () => {
                try { resolve(await readAndClean(outFile)); }
                catch (e) { reject(e); }
            })
            .on("error", reject)
            .save(outFile);
    });
}


/**
 * Create a WebM version from any existing video source.
 * Intended for generating WebM from already-optimized MP4 artifacts.
 * Preserves resolution and codec parameters from input.
 */
async function video_webm(input) {
    const inFile = await prepareInput(input);
    const outFile = path.join(os.tmpdir(), `optimized-${Date.now()}.webm`);

    // Aim for similar visual quality to CRF 23 MP4
    const webmCrf = 33;
    const cpusUsed = 4;

    return new Promise((resolve, reject) => {
        ffmpeg(inFile)
            .outputOptions([
                "-c:v libvpx-vp9",
                "-b:v 0",
                `-crf ${webmCrf}`,
                "-pix_fmt yuv420p",
                "-row-mt 1",
                "-deadline good",
                `-cpu-used ${cpusUsed}`
            ])
            .on("end", async () => {
                try { resolve(await readAndClean(outFile)); }
                catch (e) { reject(e); }
            })
            .on("error", reject)
            .save(outFile);
    });
}

module.exports = {
    video_optimize,
    video_looping,
    video_mp3,
    video_webm
};