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

const app = express();
const server = http.createServer(app); // wrap express in http server to upgrade connections for Socket.IO

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173", // allows WebSocket connections only from frontend
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

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB Connect
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ DB Connected!"))
    .catch((err) => {
        console.error("❌ DB Connection Error:", err);
        process.exit(1);
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

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {  // use `server.listen` not `app.listen`
    console.log(`🚀 Server running on port ${PORT}`);
});