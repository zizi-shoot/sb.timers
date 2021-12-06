import { auth, createToken, createUser, deleteToken, findUserByUsername, hashPass } from "./utils.js";
import bodyParser from "body-parser";
import express from "express";

const router = express.Router();

router.post("/login", bodyParser.urlencoded({ extended: true }), async (req, res) => {
  const { username, password } = req.body;
  try {
    const users = await findUserByUsername(req.db, username);

    if (!users || users.every((user) => user.password !== hashPass(password))) {
      return res.redirect("/?authError=true");
    }

    const [user] = users.filter((user) => user.password === hashPass(password));
    const userToken = await createToken(req.db, user._id.toString());

    res.cookie("userToken", userToken, { httpOnly: true }).redirect("/");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

router.post("/signup", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;

  try {
    await createUser(req.db, username, password);
    res.status(201).redirect(`/?user=${username}`);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

router.get("/logout", auth(), async (req, res) => {
  if (!req.user) return res.redirect("/");

  try {
    await deleteToken(req.db, req.userToken);
    res.clearCookie("userToken").redirect("/");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

export { router };
