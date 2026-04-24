const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();

//redirect to google

router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
    })
)

//callback
router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
    }),
    (req, res) => {
        //createjwt
        const token = jwt.sign(
            {
                id: req.user._id,
                email:req.user.email,
                name:req.user.name
            },
            process.env.JWT_SECRET,
            {expiresIn: "7d"}
        )
        res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${token}`);
    }
)