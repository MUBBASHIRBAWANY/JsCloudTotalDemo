import { configDotenv } from "dotenv";
import app from "./App.js";

configDotenv();

const port = process.env.PORT || 3005;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server Running at ${port}`);
  });
}

export default app;
