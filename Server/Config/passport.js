const passport = require('passport');

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require('../Models/user')

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                //if user exists
                let user = await User.findOne({ googleId: profile.id })
                if (!user) {
                    //create new user
                    user = await User.create({
                        googleId: profile.id,
                        name: profile.displayName || "User",
                        email: profile.emails[0].value,
                        avatar: profile.photos[0].value || null,
                    })
                    console.log(`new user created: ${user.email}`)
                } else {
                    // Update lastLogin time on existing login
                    user.lastLogin = Date.now();
                    await user.save()
                }
                return done(null, user)
            } catch { err } {
                console.error("Google OAuth Error:", err);
                return done(err, null)
            }
        }

    )
)

//session handling
passport.serializeUser((user, done) => {
    // Only store user._id in session
    done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
    // Find user by id and pass the full user object to req.user
    try {
        const user = await User.findById(id).select('__v'); //exclude version key
        if (!user) {
            return done(new Error('User not found'), null)
        }
        done(null, user)
    } catch { err } {
        console.error("Error deserializing user:", err);
        done(err, null)
    }
})