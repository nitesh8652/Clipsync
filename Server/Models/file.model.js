const mongoose = require("mongoose");

const clipSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    preview: {
        type: String,
    },
    rawText: {
        type: String,
    },
    type: {
        type: String,
        enum: ["text", "pdf", "code", "file"],
        default: "text",
    },
    action: {
        type: String,
        enum: ["copy", "download"],
        default: "copy",
    },
    iconBg: String,
    iconColor: String,

    // ── Cloudinary fields (only set for uploaded files) ───────────────────
    cloudinaryPublicId: {
        type: String,
        default: null,
    },
    fileUrl: {
        type: String, // Cloudinary secure_url
        default: null,
    },
    // ─────────────────────────────────────────────────────────────────────

    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 6 * 60 * 60 * 1000),
        index: { expireAfterSeconds: 0 }, // MongoDB TTL index — deletes doc automatically
    },
}, { timestamps: true });

module.exports = mongoose.model("Clip", clipSchema);