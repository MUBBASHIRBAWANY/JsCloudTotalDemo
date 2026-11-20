import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let connecting;

const db = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);
  if (connecting) return connecting;

  const URL = process.env.URL || process.env.MONGODB_URI;
  if (!URL) {
    return Promise.reject(new Error("Set URL or MONGODB_URI to a MongoDB connection string"));
  }

  connecting = mongoose
    .connect(URL)
    .then(() => {
      console.log("DataBase Conected");
      return mongoose.connection;
    })
    .catch((error) => {
      connecting = null;
      console.error("DataBase connection failed", error.message);
      throw error;
    });

  return connecting;
};

export default db;
