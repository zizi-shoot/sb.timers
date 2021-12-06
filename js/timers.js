import express from "express";
import { auth, findUserBySessionId } from "./utils.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/", auth(), async (req, res) => {
  try {
    const user = await findUserBySessionId(req.db, req.sessionId);
    const timers = req.db.collection("timers");
    if (req.query.isActive === "true") {
      const targetTimers = await timers
        .find({
          end: { $exists: false },
          userId: user._id,
        })
        .toArray();

      res.json(
        targetTimers.map((timer) => ({
          ...timer,
          start: +timer.start,
          progress: Date.now() - +timer.start,
        }))
      );

      return;
    }

    const targetTimers = await timers
      .find({
        end: { $exists: true },
        userId: user._id,
      })
      .toArray();

    res.json(
      targetTimers.map((timer) => ({
        ...timer,
        start: +timer.start,
        end: +timer.end,
        duration: +timer.end - +timer.start,
      }))
    );
  } catch (err) {
    res.status(400).send(err.message);
  }
});

router.post("/", auth(), async (req, res) => {
  const { description } = req.body;
  const timer = {};
  try {
    const user = await findUserBySessionId(req.db, req.sessionId);
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
