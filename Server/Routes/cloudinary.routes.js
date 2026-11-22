const express = require("express");
const router = express.Router();
const Clip = require("../Models/file.model");
const authMiddleware = require("../Middleware/auth");
const upload = require("../Middleware/upload");
const { uploadToCloudinary } = require("../Utils/cloudinary.util");

const TEMP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TEMP_MAX_BYTES = 15 * 1024 * 1024;

async function extractPdfPageCount(buffer) {
    try {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        return data.numpages || null;
    } catch {
        return null;
    }
}

/**
 * @desc serve thumbnail for Mongo-stored files (PDF first page as image)
 * @route GET /clips/:id/thumbnail
 * @access Private
 */
router.get("/:id/thumbnail", authMiddleware, async (req, res) => {
    try {
        const clip = await Clip.findOne({ _id: req.params.id, userId: req.user.id }).select("+fileData");
        if (!clip || !clip.fileData) return res.status(404).json({ error: "No thumbnail" });

        // Only PDFs support page rendering
        if (clip.mimeType !== "application/pdf") return res.status(404).json({ error: "No thumbnail" });

        // Return the raw PDF bytes — client renders page 1 via PDF.js
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Length", clip.fileData.length);
        res.setHeader("Cache-Control", "private, max-age=86400");
        return res.send(clip.fileData);
    } catch (err) {
        console.error("GET /:id/thumbnail error", err);
        if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
    }
});

/**
 * @desc proxy-download route (works for Mongo-inline and Cloudinary files)
 * @route GET /clips/:id/download
 * @access Private
 */
router.get("/:id/download", authMiddleware, async (req, res) => {
    try {
        const clip = await Clip.findOne({ _id: req.params.id, userId: req.user.id }).select("+fileData");
        if (!clip) return res.status(404).json({ error: "Clip not found" });

        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(clip.title)}"`);

        // Temporary file stored inline in MongoDB
        if (clip.fileData) {
            res.setHeader("Content-Type", clip.mimeType || "application/octet-stream");
            res.setHeader("Content-Length", clip.fileData.length);
            return res.send(clip.fileData);
        }

        // Permanent file stored in Cloudinary
        if (!clip.fileUrl) return res.status(400).json({ error: "No file attached" });

        const fileRes = await fetch(clip.fileUrl);
        if (!fileRes.ok) return res.status(502).json({ error: "Failed to fetch file from Cloudinary" });

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
 * @desc upload a file
 *       temporary -> stored inline in MongoDB with a TTL (auto-deleted)
 *       permanent -> stored in Cloudinary
 * @route POST /clips/upload
 * @access Private
 */
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const { originalname, mimetype, buffer, size } = req.file;
        const temporary = req.body.temporary === "true";
        const isPdf = mimetype === "application/pdf";
        const pageCount = isPdf ? await extractPdfPageCount(buffer) : null;

        const base = {
            userId: req.user.id,
            title: originalname,
            type: "file",
            action: "download",
            iconBg: req.body.iconBg || "#f0fdf4",
            iconColor: req.body.iconColor || "#22c55e",
            mimeType: mimetype,
            size,
            pageCount,
        };

        // ── Temporary: MongoDB + TTL
        if (temporary) {
            if (size > TEMP_MAX_BYTES) {
                return res.status(400).json({ error: "Temporary files are limited to 15 MB" });
            }

            const expiresAt = new Date(Date.now() + TEMP_TTL_MS)
            const clip = await Clip.create({
                ...base,
                storage: "mongo",
                fileData: buffer,
                expiresAt,
                ttlAt: expiresAt,
            });

            const clipObj = clip.toObject();
            delete clipObj.fileData; // never send the binary back
            return res.status(201).json({ clip: clipObj });
        }

        // ── Permanent: Cloudinary
        const result = await uploadToCloudinary(buffer, {
            folder: `clipsync/${req.user.id}`,
            public_id: `${Date.now()}_${originalname.replace(/\s+/g, "_")}`,
            resource_type: "auto",
            use_filename: false,
        });

        // Cloudinary generates PDF thumbnails at: base_url/image/upload/pg_1/public_id.jpg
        const thumbnailUrl = isPdf && result.resource_type === "image"
            ? result.secure_url.replace(/\.pdf$/i, ".jpg") + "?pg=1"
            : isPdf
            ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/pg_1/${result.public_id}.jpg`
            : null;

        const clip = await Clip.create({
            ...base,
            storage: "cloudinary",
            cloudinaryPublicId: result.public_id,
            cloudinaryResourceType: result.resource_type,
            fileUrl: result.secure_url,
            thumbnailUrl,
            expiresAt: null,
        });

        res.status(201).json({ clip });
    } catch (err) {
        console.error("Post/ upload error", err);

        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File too large (max 50 MB)" });
        }
        if (err.message?.includes("Invalid file type")) {
            return res.status(400).json({ error: "Unsupported file type" });
        }
        res.status(500).json({ error: "Upload failed" });
    }
});

module.exports = router;

/**
 * @upload_flow -> Client → Multer → Buffer → (temporary ? MongoDB : Cloudinary) → Response
 * @download_flow -> Client → Backend → (Mongo buffer | Cloudinary) → Client Download
 */
