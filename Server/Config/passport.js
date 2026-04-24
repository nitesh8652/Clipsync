const passport = require('passport');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require('../Models/user');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/auth/google/callback"
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ googleId: profile.id });
                if (!user) {
                    user = await User.create({
                        googleId: profile.id,
                        name: profile.displayName || "User",
                        email: profile.emails[0].value,
                        avatar: profile.photos?.[0]?.value || null,
                    });
                    console.log(`New user created: ${user.email}`);
                } else {
                    user.lastLogin = Date.now();
                    await user.save();
                }
                return done(null, user);
            } catch (err) {          // ✅ FIX 1: was `catch { err }` — invalid syntax
                console.error("Google OAuth Error:", err);
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select('-__v'); 
        if (!user) return done(new Error('User not found'), null);
        done(null, user);
    } catch (err) {                   
        console.error("Error deserializing user:", err);
        done(err, null);
    }
});