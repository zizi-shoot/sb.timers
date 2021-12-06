import crypto from "crypto";
import { ObjectId } from "mongodb";

const hashPass = (password) => {
  const hash = crypto.createHash("sha256");
  hash.update(password);
  return hash.digest("hex");
};

const findUserByUsername = async (db, username) => {
  return db.collection("users").find({ username }).toArray();
};

const findUserByUserId = async (db, userId) => {
  return db.collection("users").findOne({ _id: ObjectId(userId) });
};

const findUserByToken = async (db, userToken) => {
  const token = await db.collection("tokens").findOne({ _id: ObjectId(userToken) });
  if (!token) return;

  return db.collection("users").findOne({ _id: ObjectId(token.userId) });
};

const createUser = async (db, username, pass) => {
  const password = hashPass(pass);

  await db.collection("users").insertOne({
    username,
    password,
  });
};

const auth = () => async (req, res, next) => {
  if (!req.cookies["userToken"]) {
    return req.baseUrl === "/api/timers" ? res.sendStatus(401) : next();
  }
  req.user = await findUserByToken(req.db, req.cookies["userToken"]);
  req.userToken = req.cookies["userToken"];
  next();
};

const createToken = async (db, userId) => {
  const token = await db.collection("tokens").insertOne({
    userId,
  });

  return token.insertedId.toString();
};

const deleteToken = async (db, userToken) => {
  await db.collection("tokens").deleteOne({ _id: ObjectId(userToken) });
};

const getAllTimers = async (db, userId) => {
  const timers = await db
    .collection("timers")
    .find({ userId: ObjectId(userId) })
    .toArray();

  return timers.map((timer) => {
    if (!timer.end)
      return {
        ...timer,
        start: +timer.start,
        progress: Date.now() - +timer.start,
      };

    return {
      ...timer,
      start: +timer.start,
      end: +timer.end,
      duration: +timer.end - +timer.start,
    };
  });
};

const getActiveTimers = async (db, userId) => {
  const timers = await db
    .collection("timers")
    .find({
      userId: ObjectId(userId),
      end: { $exists: false },
    })
    .toArray();

  return timers.map((timer) => ({
    ...timer,
    start: +timer.start,
    progress: Date.now() - +timer.start,
  }));
};

const sentAllTimers = async (db, userId, ws) => {
  const allTimers = await getAllTimers(db, userId);

  ws.send(
    JSON.stringify({
      type: "all_timers",
      timers: allTimers,
    })
  );
};

export {
  hashPass,
  auth,
  createUser,
  findUserByToken,
  findUserByUsername,
  findUserByUserId,
  createToken,
  deleteToken,
  getActiveTimers,
  getAllTimers,
  sentAllTimers,
};
