const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    googleId: { type: String, unique: true },
    name: String,
    email: { type: String, unique: true },
    avatar: String,
    lastLogin: { type: Date, default: Date.now }, // ✅ FIX: was missing, passport.js saves it
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);