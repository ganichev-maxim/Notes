const express = require('express');
const authRouter = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oidc');
const LocalStrategy = require('passport-local');
const { getCredentionals, createUser, createCredentionals, getUserById, login } = require("./db");

passport.use(new GoogleStrategy({
  clientID: process.env['GOOGLE_CLIENT_ID'],
  clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  callbackURL: '/auth/oauth2/redirect/google',
  scope: [ 'profile' ]
}, async function verify(issuer, profile, cb) {
  try {
    const credentionals = await getCredentionals(issuer, profile.id);
    if (!credentionals) {
      const { insertedId } = await createUser(null, profile.displayName, null);
      await createCredentionals(insertedId.toString(), issuer, profile.id)
      const user = {
        _id: insertedId,
        username: profile.displayName
      };
      return cb(null, user);
    } else {
      const user = await getUserById(credentionals.userId);
      if (!user) {
        return cb(null, false)
      }
      return cb(null, user);
    }
  } catch (err) {
    return cb(err);
  }
}));

passport.use(new LocalStrategy(async function verify(username, password, cb) {
  try {
    const user = await login(username, password)
    return cb(null, user);
  }
  catch (error) {
    return cb(error.message);
  }
}));

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { _id: user._id, username: user.username });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

authRouter.get("/google", passport.authenticate('google'));

authRouter.get('/oauth2/redirect/google', passport.authenticate('google', {
  successRedirect: '/dashboard',
  failureRedirect: '/'
}));

module.exports = { authRouter };
