import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const clientPromise = new MongoClient(process.env.DB_URI, {
  maxPoolSize: 10,
}).connect();

export { clientPromise };
