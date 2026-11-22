const express = require("express");
const router = express.Router()
const Clip = require("../Models/file.model")
const authMiddleware = require("../Middleware/auth")
const { uploadToCloudinary, destroyCloudinaryAsset } = require("../Utils/cloudinary.util")

const TEMP_TTL_MS = 7 * 24 * 60 * 60 * 1000 // temporary clips live for 7 days
const TEMP_MAX_BYTES = 15 * 1024 * 1024 // temporary files are stored inline in Mongo

/**
 * @desc    Get all clips
 * @route   GET /api/clips
 * @access  Private
 */
router.get("/", authMiddleware, async (req, res) => {
    try {
        //users see only their clip
        const clips = await Clip.find({
            userId: req.user.id
        }).sort({ createdAt: -1 }).limit(50) //desending order (newest first)
        res.json({ clips })
    } catch (err) {
        console.error("Get/ clips error", err)
        res.status(500).json({ error: "Internal Server Error" })

    }
})

/**
 * @desc    Create a clip
 * @route   POST /api/clips
 * @access  Private
 */

router.post("/", authMiddleware, async (req, res) => {
    try {
        //destructing data from frontend 
        const { title, preview, rawText, type, action, iconBg, iconColor, temporary } = req.body

        if (!title) return res.status(400).json({ error: "title required" })

        // temporary -> auto-delete in 7 days, otherwise permanent
        const expiresAt = temporary ? new Date(Date.now() + TEMP_TTL_MS) : null

        //clip is the moongoose model .create inserts a new document 
        const clip = await Clip.create({
            userId: req.user.id, // links the clip to the loged-in user to see only their data 
            title,
            preview,
            rawText,
            type,
            action,
            iconBg,
            iconColor,
            expiresAt,
            ttlAt: expiresAt
        })
        res.status(201).json({ clip })

    } catch (err) {
        console.error("Post/ clips error", err)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

/**
 * @desc    Toggle a clip between temporary and permanent
 * @route   PATCH /api/clips/:id
 * @access  Private
 */
router.patch("/:id", authMiddleware, async (req, res) => {
    try {
        const { temporary, saved } = req.body

        // ── Saved toggle (standalone — no file migration needed)
        if (typeof saved === "boolean") {
            const clip = await Clip.findOneAndUpdate(
                { _id: req.params.id, userId: req.user.id },
                { saved },
                { new: true }
            )
            if (!clip) return res.status(404).json({ error: "Clip Not Found" })
            return res.json({ clip })
        }

        if (typeof temporary !== "boolean") {
            return res.status(400).json({ error: "temporary must be a boolean" })
        }

        const clip = await Clip.findOne({
            _id: req.params.id,
            userId: req.user.id,
        }).select("+fileData")

        if (!clip) return res.status(404).json({ error: "Clip Not Found" })

        const hasFile = Boolean(clip.fileData) || Boolean(clip.fileUrl) || clip.type === "file"

        // ── Text clips (and any clip without a file payload): only expiry changes
        if (!hasFile) {
            clip.expiresAt = temporary ? new Date(Date.now() + TEMP_TTL_MS) : null
            clip.ttlAt = clip.expiresAt
            await clip.save()
            return res.json({ clip })
        }

        if (temporary) {
            // ── Permanent (Cloudinary) -> Temporary (Mongo + TTL)
            if (!clip.fileData) {
                if (!clip.fileUrl) return res.status(400).json({ error: "No file attached" })

                const fileRes = await fetch(clip.fileUrl)
                if (!fileRes.ok) return res.status(502).json({ error: "Failed to fetch file from Cloudinary" })

                const buffer = Buffer.from(await fileRes.arrayBuffer())
                if (buffer.length > TEMP_MAX_BYTES) {
                    return res.status(400).json({ error: "File is larger than 15 MB and cannot be made temporary" })
                }

                clip.fileData = buffer
                clip.mimeType = clip.mimeType || fileRes.headers.get("content-type") || "application/octet-stream"
                clip.size = buffer.length

                // remove the Cloudinary copy now that it lives in Mongo
                if (clip.cloudinaryPublicId) {
                    try {
                        await destroyCloudinaryAsset(clip.cloudinaryPublicId, clip.cloudinaryResourceType)
                    } catch (cloudErr) {
                        console.error("Cloudinary delete failed:", cloudErr.message)
                    }
                    clip.cloudinaryPublicId = null
                    clip.cloudinaryResourceType = null
                    clip.fileUrl = null
                }
            }

            clip.storage = "mongo"
            clip.expiresAt = new Date(Date.now() + TEMP_TTL_MS)
            clip.ttlAt = clip.expiresAt
        } else {
            // ── Temporary (Mongo) -> Permanent (Cloudinary)
            if (clip.fileData) {
                const result = await uploadToCloudinary(clip.fileData, {
                    folder: `clipsync/${req.user.id}`,
                    public_id: `${Date.now()}_${clip.title.replace(/\s+/g, "_")}`,
                    resource_type: "auto",
                    use_filename: false,
                })

                clip.cloudinaryPublicId = result.public_id
                clip.cloudinaryResourceType = result.resource_type
                clip.fileUrl = result.secure_url
                clip.fileData = undefined
            }

            clip.storage = "cloudinary"
            clip.expiresAt = null
            clip.ttlAt = null
        }

        await clip.save()

        const clipObj = clip.toObject()
        delete clipObj.fileData
        res.json({ clip: clipObj })
    } catch (err) {
        console.error("Patch/ clips error", err)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const clip = await Clip.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!clip) return res.status(404).json({ error: "Clip Not Found" });

        // If this clip has a Cloudinary asset, delete it too (real-time)
        if (clip.cloudinaryPublicId) {
            try {
                await destroyCloudinaryAsset(clip.cloudinaryPublicId, clip.cloudinaryResourceType);
                console.log(`🗑️  Cloudinary asset deleted: ${clip.cloudinaryPublicId}`);
            } catch (cloudErr) {
                // Log but don't fail the request — MongoDB doc is already gone
                console.error("Cloudinary delete failed:", cloudErr.message);
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Delete/ clips error", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router