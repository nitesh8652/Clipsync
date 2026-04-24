const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
const passport = require("passport");
require("dotenv").config();
require("./Config/passport");
const routes = require("./Routes/routes"); // ✅ FIX 4: was `authRoutes` (undefined variable)

const app = express();

// CORS — allow your React frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,               // ✅ needed for cookies/sessions
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB Connect with error handling
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ DB Connected!"))
    .catch((err) => {                
        console.error("❌ DB Connection Error:", err);
        process.exit(1);
    });

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production", 
        maxAge: 24 * 60 * 60 * 1000,
    }
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", routes);            

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});