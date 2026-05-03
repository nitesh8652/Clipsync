const express = require("express");
const router = express.Router()
const streamifier = require("streamifier");
const Clip = require("../Models/file.model")
const authMiddleware = require("../Middleware/auth")
const upload = require("../Middleware/upload")
const cloudinary = require("../Config/cloudinary")



const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours


/**
 * @des upload a buffer to cloudinary
 */

function uploadToCloudinary(buffer, options) {
    return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err) return reject(err)
            resolve(result)
        })
        streamifier.createReadStream(buffer).pipe(stream)
    })
}



/**
 *@desc proxy-download route to bypass Cloudinary "untrusted" restriction)
 */

router.get("/:id/download", authMiddleware, async (req, res) => {
    try {
        const clip = await Clip.findOne({ _id: req.params.id, userId: req.user.id });
        if (!clip) return res.status(404).json({ error: "Clip not found" });
        if (!clip.cloudinaryPublicId) return res.status(400).json({ error: "No file attached" });

        const signedUrl = cloudinary.utils.private_download_url(
            clip.cloudinaryPublicId,
            null,
            { resource_type: "raw", expires_at: Math.floor(Date.now() / 1000) + 60 }
        );

        const fileRes = await fetch(signedUrl);
        console.log("Cloudinary fetch status:", fileRes.status, clip.fileUrl);
        if (!fileRes.ok) return res.status(502).json({ error: "failed to fetch file" });

        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(clip.title)}"`);
        res.setHeader("Content-Type", fileRes.headers.get("content-type") || "application/octet-stream");
        const contentLength = fileRes.headers.get("content-length");
        if (contentLength) res.setHeader("Content-Length", contentLength);

        const { Readable } = require("stream");
        Readable.fromWeb(fileRes.body).pipe(res);
    } catch (err) {
        console.error("GET /:id/download error", err);
        if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
    }
});





/**
 @desc  Schedule Cloudinary deletion to match MongoDB TTL

 */

function scheduleCloudinaryDelete(publicId, delayMs) {
    setTimeout(async () => {
        try {
            await cloudinary.uploader.destroy(publicId, {
                resource_type: "raw"
            })
            console.log(`🗑️  Cloudinary asset deleted: ${publicId}`)
        } catch (err) {
            console.error("Cloudinary auto-delete failed:", err.message)
        }
    }, delayMs)
}

/**
 * @desc upload a file to cloudinary
 * @route POST/clips/upload
 * @access private
 */

router.post("/upload", authMiddleware, upload.single("file"),
    async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: "No file uploaded" })

            const { originalname, mimetype, buffer, size } = req.file;

            //upload raw file to cloudinary
            const result = await uploadToCloudinary(buffer, {
                folder: `clipsync/${req.user.id}`,
                public_id: `${Date.now()}_${originalname.replace(/\s+/g, "_")}`,
                resource_type: "raw",
                use_filename: false,
            })

            //save metadata clip doc with cloudinary

            const clip = await Clip.create({
                userId: req.user.id,
                title: originalname,
                type: "file",
                action: "download",
                iconBg: req.body.iconBg || "#f0fdf4",
                iconColor: req.body.iconColor || "#22c55e",
                cloudinaryPublicId: result.public_id,
                fileUrl: result.secure_url,

            })

            //schedule cloudinary delete 6 hours            
            scheduleCloudinaryDelete(result.public_id, TTL_MS)
            res.status(201).json({ clip })

        } catch (err) {
            console.error("Post/ upload error", err)

            //file size

            if (err.message?.includes("file too large") || err.message?.includes("unsupported file type")) {
                return res.status(400).json({
                    error: err.message
                })
            }
            res.status(500).json({ error: "Upload failed" })
        }
    })

module.exports = router