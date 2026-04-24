const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Redirect to Google
router.get("/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth Callback
router.get("/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/auth/failed" }),
    (req, res) => {
        try {                          
            const token = jwt.sign(
                { id: req.user._id, email: req.user.email, name: req.user.name, avatar: req.user.avatar },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );
            res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);
        } catch (err) {
            console.error("JWT Error:", err);
            res.status(500).json({ error: "Authentication failed" });
        }
    }
);

// Failure route
router.get("/failed", (req, res) => {
    res.status(401).json({ error: "Google authentication failed" });
});

// Check auth status (useful for frontend)
router.get("/me", (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ error: "Not authenticated" });
    }
});

module.exports = router;