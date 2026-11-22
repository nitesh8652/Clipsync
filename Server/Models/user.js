const mongoose = require("mongoose");
const Clip = require("./file.model");
const { destroyCloudinaryAsset } = require("../Utils/cloudinary.util");

const userSchema = new mongoose.Schema({
    googleId: { type: String, default: null },
    name: String,
    email: { type: String, unique: true, required: true },
    avatar: String,
    password: { type: String, default: null },
    lastLogin: { type: Date, default: Date.now },
}, { timestamps: true });

// Cascade-delete all clips (+ Cloudinary assets) when a user is deleted
userSchema.post("findOneAndDelete", async (user) => {
    if (!user) return;
    const clips = await Clip.find({ userId: user._id }).select("cloudinaryPublicId cloudinaryResourceType");
    for (const clip of clips) {
        if (clip.cloudinaryPublicId) {
            try { await destroyCloudinaryAsset(clip.cloudinaryPublicId, clip.cloudinaryResourceType); }
            catch (err) { console.error("Cloudinary cleanup failed:", err.message); }
        }
    }
    await Clip.deleteMany({ userId: user._id });
});

module.exports = mongoose.model("User", userSchema);
