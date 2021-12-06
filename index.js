import dotenv from "dotenv";
import express from "express";
import nunjucks from "nunjucks";
import cookieParser from "cookie-parser";
import cookie from "cookie";
import { auth, findUserByToken, getActiveTimers, sentAllTimers } from "./js/utils.js";
import { router as usersRoute } from "./js/users.js";
import { router as timersRoute } from "./js/timers.js";
import { clientPromise } from "./js/mongo_connect.js";
import { WebSocketServer } from "ws";
import { createServer } from "http";

dotenv.config();

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
    const mongoClient = await clientPromise;
    req.db = mongoClient.db("mongo_timer");
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
    userToken: req.userToken,
  });
});
app.use("/", usersRoute);
app.use("/api/timers", timersRoute);
app.use((err, req, res, _next) => {
  res.status(500).send(err.message);
});

const server = createServer(app);
const wss = new WebSocketServer({ clientTracking: false, noServer: true });

server.on("upgrade", async (req, socket, _head) => {
  const mongoClient = await clientPromise;
  const db = mongoClient.db("mongo_timer");
  const cookies = cookie.parse(req.headers["cookie"]);
  const userToken = cookies && cookies["userToken"];
  const user = await findUserByToken(db, userToken);

  if (!user) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  req.db = db;
  req.user = user;

  wss.handleUpgrade(req, socket, _head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", async (ws, req) => {
  const userId = req.user._id.toString();

  await sentAllTimers(req.db, userId, ws);

  setInterval(async () => {
    const activeTimers = await getActiveTimers(req.db, userId);

    ws.send(
      JSON.stringify({
        type: "active_timers",
        timers: activeTimers,
      })
    );
  }, 1000);

  ws.on("message", async (message) => {
    let data;

    try {
      data = JSON.parse(message);
    } catch (err) {
      return;
    }

    if (data.message === "get_timers") {
      await sentAllTimers(req.db, userId, ws);
    }
  });
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`  Listening on http://localhost:${port}`);
});
