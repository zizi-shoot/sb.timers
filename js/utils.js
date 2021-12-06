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

export { hashPass, auth, createUser, findUserByToken, findUserByUsername, createToken, deleteToken };
