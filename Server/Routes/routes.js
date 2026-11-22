const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../Models/user");

function signToken(user, extra = {}) {
    return jwt.sign(
        { id: user._id, email: user.email, name: user.name, avatar: user.avatar || null, ...extra },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get("/google",
    (req, _res, next) => {
        req.session.authIntent = req.query.intent === "register" ? "register" : "login";
        next();
    },
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/auth/failed" }),
    (req, res) => {
        try {
            const authIntent = req.session.authIntent;
            delete req.session.authIntent;

            if (authIntent === "register" && req.user._isExistingAccount) {
                return res.redirect(`${process.env.FRONTEND_URL}/register?notice=account-exists`);
            }

            if (req.user._needsPassword) {
                // New Google user — needs to set a password before entering
                const setupToken = signToken(req.user, { needsPassword: true });
                return res.redirect(`${process.env.FRONTEND_URL}/set-password?token=${setupToken}`);
            }
            const token = signToken(req.user);
            res.redirect(`${process.env.FRONTEND_URL}/clips?token=${token}`);
        } catch (err) {
            console.error("JWT Error:", err);
            res.status(500).json({ error: "Authentication failed" });
        }
    }
);

router.get("/failed", (_req, res) => res.status(401).json({ error: "Google authentication failed" }));

// ── Set password (after Google signup) ───────────────────────────────────────
router.post("/set-password", async (req, res) => {
    try {
        const { password } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: "No token" });

        const payload = jwt.verify(authHeader.replace("Bearer ", ""), process.env.JWT_SECRET);
        if (!payload.needsPassword) return res.status(400).json({ error: "Password already set" });

        const user = await User.findById(payload.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.password = await bcrypt.hash(password, 10);
        await user.save();

        const token = signToken(user);
        res.json({ token });
    } catch (err) {
        console.error("POST /set-password error", err);
        res.status(500).json({ error: "Failed to set password" });
    }
});

// ── Register: email + password ────────────────────────────────────────────────
router.post("/register", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "email and password are required" });

        const emailLower = email.toLowerCase().trim();
        const existing = await User.findOne({ email: emailLower });
        if (existing)
            return res.status(409).json({ error: "Email already registered" });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            email: emailLower,
            name: emailLower.split("@")[0],
            password: passwordHash,
        });
        user.lastLogin = new Date();
        await user.save();

        res.status(201).json({ token: signToken(user) });
    } catch (err) {
        console.error("POST /register error", err);
        if (err.code === 11000)
            return res.status(409).json({ error: "Email already registered" });
        res.status(500).json({ error: "Registration failed" });
    }
});

// ── Login: email + password ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "email and password required" });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.password) return res.status(401).json({ error: "Invalid credentials" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: "Invalid credentials" });

        user.lastLogin = new Date();
        await user.save();

        res.json({ token: signToken(user) });
    } catch (err) {
        console.error("POST /login error", err);
        res.status(500).json({ error: "Login failed" });
    }
});

module.exports = router;
