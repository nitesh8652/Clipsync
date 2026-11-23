const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
const passport = require("passport");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();
require("./Config/passport");

const routes = require("./Routes/routes");
const clipRoutes = require("./Routes/clips.route");
const cloudinaryRoutes = require("./Routes/cloudinary.routes");
const Clip = require("./Models/file.model");
const { destroyCloudinaryAsset } = require("./Utils/cloudinary.util");

const app = express();
const server = http.createServer(app); // wrap express in http server to upgrade connections for Socket.IO

// Support multiple allowed origins via comma-separated CLIENT_URL
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",").map(o => o.trim());

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
});

// tracks devices per user (one user, many devices)
const userSockets = new Map();

// Socket.IO auth middleware — verify JWT on connect
io.use((socket, next) => {
    //verifies token
    const token = socket.handshake.auth?.token; //? -> optional chaining if auth missing no crash 
    if (!token) return next(new Error("No token"));
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = payload.id;
        next();
    } catch {
        next(new Error("Invalid token"));
    }
});

// track socket of user, handle clip events, trigger disconnect
io.on("connection", (socket) => {
    // every socket linked to specific user
    const userId = socket.userId; 
    console.log(`Socket connected: ${socket.id} for user ${userId}`);

    // Track sockets per user usersockets is an map line 27
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id); 

    // When a client emits a new clip, broadcast it to ALL other devices of the same user
    socket.on("clip:new", (clip) => {
        const sockets = userSockets.get(userId);
        if (sockets) {
            // sid socket id eg sid = "socket1" sid = "socket2"
            sockets.forEach((sid) => {
                // send clip to all devices but NOT the one that sent it
                if (sid !== socket.id) { // socket.id -> current connection id & sid -> loop id sid = "socket1" sid = "socket2"
                    io.to(sid).emit("clip:new", clip); //send clip to all devices 
                }
            });
        }
    });

    // When a client toggles temp/permanent, broadcast the updated clip
    socket.on("clip:update", (clip) => {
        const sockets = userSockets.get(userId);
        if (sockets) {
            sockets.forEach((sid) => {
                if (sid !== socket.id) {
                    io.to(sid).emit("clip:update", clip);
                }
            });
        }
    });

    // When a client deletes a clip, broadcast to other devices
    socket.on("clip:delete", (clipId) => {
        const sockets = userSockets.get(userId);
        if (sockets) {
            sockets.forEach((sid) => {
                if (sid !== socket.id) {
                    io.to(sid).emit("clip:delete", clipId);
                }
            });
        }
    });

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
        const sockets = userSockets.get(userId);
        if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) userSockets.delete(userId);
        }
    });
});

// Health check (no auth, cheap for uptime pingers)
app.get("/health", (req, res) => res.sendStatus(200));

// CORS
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,  // wait up to 10s for Atlas
    heartbeatFrequencyMS: 30000,      // ping every 30s to keep alive
    socketTimeoutMS: 45000,
})
    .then(() => {
        console.log("✅ DB Connected!")
    })
    .catch((err) => {
        console.error("❌ DB Connection Error:", err);
        process.exit(1);
    });

// ADD after the connect block:
mongoose.connection.on("disconnected", () => console.warn("⚠️  MongoDB disconnected — reconnecting..."));
mongoose.connection.on("reconnected",  () => console.log("✅  MongoDB reconnected"));

// One-time cleanup for clips expired before the TTL field existed (removes orphaned Cloudinary assets)
mongoose.connection.once("open", async () => {
    try {
        const legacy = await Clip.find({
            expiresAt: { $ne: null, $lte: new Date() },
            ttlAt: null,
        });

        for (const clip of legacy) {
            if (clip.cloudinaryPublicId) {
                try {
                    await destroyCloudinaryAsset(clip.cloudinaryPublicId, clip.cloudinaryResourceType);
                } catch (cloudErr) {
                    console.error("Cloudinary cleanup failed:", cloudErr.message);
                }
            }
            await Clip.deleteOne({ _id: clip._id });
        }

        if (legacy.length) console.log(`🧹 Cleaned ${legacy.length} legacy expired clip(s)`);
    } catch (err) {
        console.error("Legacy cleanup error:", err);
    }
});

// Session -> server side memory to track user
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, //Don’t save session again if nothing changed
    saveUninitialized: false,  //Don’t create empty session -> Example: user not logged in → no session
    cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000,
    }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", routes);
app.use("/clips", clipRoutes);
app.use("/clips", cloudinaryRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {  // use `server.listen` not `app.listen`
    console.log(`🚀 Server running on port ${PORT}`);
});

