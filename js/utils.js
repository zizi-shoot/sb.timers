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

const findUserBySessionId = async (db, sessionId) => {
  const userSession = await db.collection("sessions").findOne({ _id: ObjectId(sessionId) });
  if (!userSession) return;

  return db.collection("users").findOne({ _id: ObjectId(userSession.userId) });
};

const createSession = async (db, userId) => {
  const session = await db.collection("sessions").insertOne({
    userId,
  });

  return session.insertedId.toString();
};

const deleteSession = async (db, sessionId) => {
  await db.collection("sessions").deleteOne({ name: sessionId });
};

const createUser = async (db, username, pass) => {
  const password = hashPass(pass);

  await db.collection("users").insertOne({
    username,
    password,
  });
};

const auth = () => async (req, res, next) => {
  if (!req.cookies["sessionId"]) {
    return req.baseUrl === "/api/timers" ? res.sendStatus(401) : next();
  }
  req.user = await findUserBySessionId(req.db, req.cookies["sessionId"]);
  req.sessionId = req.cookies["sessionId"];
  next();
};

export { hashPass, auth, createUser, deleteSession, createSession, findUserBySessionId, findUserByUsername };
