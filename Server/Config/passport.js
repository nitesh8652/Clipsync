const passport = require('passport');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require('../Models/user');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            proxy: true,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const googleEmail = profile.emails[0].value.toLowerCase();

                // 1. Already linked via googleId
                let user = await User.findOne({ googleId: profile.id });
                let isExistingAccount = Boolean(user);

                if (!user) {
                    // 2. Email exists from manual registration — link the Google account
                    user = await User.findOne({ email: googleEmail });
                    if (user) {
                        isExistingAccount = true;
                        user.googleId = profile.id;
                        user.avatar = user.avatar || profile.photos?.[0]?.value || null;
                    } else {
                        // 3. Brand new user via Google
                        user = new User({
                            googleId: profile.id,
                            name: profile.displayName || "User",
                            email: googleEmail,
                            avatar: profile.photos?.[0]?.value || null,
                        });
                    }
                }

                user.lastLogin = new Date();
                await user.save();

                // Flag if this Google user has never set a password
                user._needsPassword = !user.password;
                user._isExistingAccount = isExistingAccount;

                return done(null, user);
            } catch (err) {
                console.error("Google OAuth Error:", err);
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select('-__v');
        if (!user) return done(new Error('User not found'), null);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});
