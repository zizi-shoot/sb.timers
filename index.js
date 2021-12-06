import express from "express";
import nunjucks from "nunjucks";
import cookieParser from "cookie-parser";
import { auth } from "./js/utils.js";
import { router as usersRoute } from "./js/users.js";
import { router as timersRoute } from "./js/timers.js";
import { clientPromise } from "./js/mongo_connect.js";

const app = express();

nunjucks.configure("views", {
  autoescape: true,
  express: app,
  tags: {
    blockStart: "[%",
    blockEnd: "%]",
    variableStart: "[[",
    variableEnd: "]]",
    commentStart: "[#",
    commentEnd: "#]",
  },
});

app.set("view engine", "njk");

app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());

app.use(async (req, res, next) => {
  try {
    const client = await clientPromise;
    req.db = client.db("mongo_timer");
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/", auth(), (req, res) => {
  res.render("index", {
    user: req.user,
    authError: req.query.authError === "true" ? "Wrong username or password" : req.query.authError,
    createdUser: req.query.user,
  });
});

app.use("/", usersRoute);
app.use("/api/timers", timersRoute);

app.use((err, req, res, _next) => {
  res.status(500).send(err.message);
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`  Listening on http://localhost:${port}`);
});
