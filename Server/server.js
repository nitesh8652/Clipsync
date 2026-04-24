const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
require("dotenv").config();
require("./Config/passport");
const routes = require("./Routes/routes")
const app = express();

//db connect
mongoose.connect(process.env.MONGO_URI).then(()=>console.log("DB CONNECTED!"))

//SESSION MIDDLEWARE
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    })
)

//PASSPORT MIDDLEWARE
app.use(passport.initialize())
app.use(passport.session())

//ROUTES

app.use("/auth",authRoutes)

app.listen(process.env.PORT,()=>{
    console.log(`Server is running on port ${process.env.PORT}`)
})