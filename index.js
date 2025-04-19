const express = require("express");
const nunjucks = require("nunjucks");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const bodyParser = require("body-parser");
const notesRouter = require("./notes");
const { authRouter } = require("./auth");
const passport = require('passport');
const { createUser, getUserByLogin } = require("./db");

const app = express();

nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

app.set("view engine", "njk");
app.enable("trust proxy");

const sessionParser = session({
  saveUninitialized: false,
  secret: '$eCuRiTy',
  resave: false
});

const authMiddleware = async function (req, res, next) {
  if (!req.session?.passport?.user) {
    if (req.path !== "/" && req.path !== "/login" && req.path !== "/signup" && !req.path.startsWith("/auth")) {
      res.redirect("/");
      return;
    }
  } else {
    if (req.path === "/") {
      res.redirect("/dashboard");
      return;
    }
  }

  next();
};

const nocacheMiddleware = async function (req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
};

app.use(express.static("public"));
app.use(cookieParser());
app.use(nocacheMiddleware);
app.use(express.json());
app.use(sessionParser);
app.use(passport.authenticate('session'));
app.use(authMiddleware);
app.use("/notes", notesRouter);
app.use("/auth", authRouter);
app.set('etag', false)

app.get("/", (req, res) => {
  res.render("index", {
    authError: req.query.authError === "true" ? "Wrong username or password" : req.query.authError,
  });
});

app.get("/dashboard", (req, res) => {
  res.render("dashboard", {
    user: req.user
  });
});

app.post("/signup", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const user = await getUserByLogin(req.body.username);
  if (user) {
    res.redirect("/?authError=User exists");
    return;
  }
  await createUser(req.body.username, req.body.username, req.body.password);

  res.status(201).redirect("/");
});

app.post("/login",  bodyParser.urlencoded({ extended: false }), passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/?authError=true',
  failureMessage: true
}));

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  })
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`  Listening on http://localhost:${port}`);
});
