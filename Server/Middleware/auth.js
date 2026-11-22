const jwt = require("jsonwebtoken");
const User = require("../Models/user");

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No Token Provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Verify user still exists in DB — catches deleted accounts
        const user = await User.findById(payload.id).select("_id");
        if (!user) return res.status(401).json({ error: "Account not found" });

        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid Token" });
    }
}

module.exports = authMiddleware;