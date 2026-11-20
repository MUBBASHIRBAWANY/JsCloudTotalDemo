import cluster from "node:cluster";
import os from "node:os";
import process from "node:process";
import express from "express";
import cors from "cors";
import { translate } from "google-translate-api-x";
import { configDotenv } from "dotenv";
import { users } from "./App.js";

configDotenv();

const numCPUs = os.availableParallelism();
const PORT = process.env.PORT || 8000;
console.log(cluster.isPrimary)
if (cluster.isPrimary) {

    console.log(`Primary ${process.pid} is running`);

    // Fork workers equal to CPU cores
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork(); // auto restart worker
    });

} else {

    // 🔥 Express must run INSIDE worker
    const app = express();

    app.use(cors());
    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ extended: true, limit: "50mb" }));

    app.use("/", users);

    app.get("/", (req, res) => {
        res.send(`Worker ${process.pid} handling request`);
    });

    app.post("/translate", async (req, res) => {
  try {
    const { text, to } = req.body;

    const result = await translate(text, {
      to: to,
      client: "gtx"
    });

    let finalText = result.text;

    // Business word corrections
    const corrections = {
      "تاجر": "ٹریڈر",
      "تاجروں": "ٹریڈرز",
      "کمپنیوں": "کمپنیز",
      "ادارے": "انٹرپرائزز"
    };

    Object.keys(corrections).forEach((key) => {
      const regex = new RegExp(key, "g");
      finalText = finalText.replace(regex, corrections[key]);
    });

    res.json({ text: finalText });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

    app.listen(PORT, () => {
        console.log(`Worker ${process.pid} started at port ${PORT}`);
    });
}