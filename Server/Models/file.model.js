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

    // ── Where the payload lives: temporary clips in Mongo, permanent files in Cloudinary
    storage: {
        type: String,
        enum: ["mongo", "cloudinary"],
        default: "mongo",
    },

    // ── Cloudinary fields (only set for permanent uploaded files)
    cloudinaryPublicId: {
        type: String,
        default: null,
    },
    cloudinaryResourceType: {
        type: String, // image | raw | video (needed to destroy correctly)
        default: null,
    },
    fileUrl: {
        type: String, // Cloudinary secure_url
        default: null,
    },

    // ── Inline file fields (only set for temporary uploaded files)
    // select:false keeps the binary out of normal query responses
    fileData: {
        type: Buffer,
        select: false,
    },
    mimeType: {
        type: String,
        default: null,
    },
    size: {
        type: Number,
        default: 0,
    },
    pageCount: {
        type: Number,
        default: null,
    },
    thumbnailUrl: {
        type: String,
        default: null,
    },

    // ── Saved / starred
    saved: {
        type: Boolean,
        default: false,
    },

    // ── Expiry (null = permanent; date = auto-delete at that time)
    expiresAt: {
        type: Date,
        default: null,
    },

    // ── TTL marker (set only for temporary clips; Mongo deletes them automatically)
    ttlAt: {
        type: Date,
        default: null,
    },

}, { timestamps: true });

// TTL: MongoDB deletes temporary clips once ttlAt passes.
// Permanent clips keep ttlAt = null and are never touched.
clipSchema.index({ ttlAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Clip", clipSchema);
