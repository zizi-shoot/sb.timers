import express from "express";
import { auth, findUserByToken } from "./utils.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.post("/", auth(), async (req, res) => {
  const { description } = req.body;
  const timer = {};
  try {
    const user = await findUserByToken(req.db, req.userToken);
    const { insertedId } = await req.db.collection("timers").insertOne({
      description,
      start: Date.now(),
      userId: user._id,
    });

    timer.id = insertedId;

    res.status(201).json(timer);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

router.post("/:id/stop", auth(), async (req, res) => {
  const { id } = req.params;

  try {
    const timers = req.db.collection("timers");
    const targetTimer = await timers.findOne({ _id: ObjectId(id) });

    if (!targetTimer) {
      res.status(404).send(`Unknown timer ID: ${id}`);
      return;
    }

    await timers.updateOne({ _id: ObjectId(id) }, { $set: { end: Date.now() } }, { upsert: true });

    res.status(204).json(targetTimer);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

export { router };
