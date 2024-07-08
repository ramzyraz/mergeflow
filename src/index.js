import "dotenv/config";
import cors from "cors";
import express from "express";
import connectDatabase from "./services/mongo.js";
import routes from "./routes/index.js";
import logger from "./utils/logger.js";
import { APP_BASE_URL, PORT } from "./config/index.js";

(async () => {
  try {
    const { err: mongoConnectionErr } = await connectDatabase();
    if (mongoConnectionErr) throw new Error(mongoConnectionErr);

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors({ origin: APP_BASE_URL, optionsSuccessStatus: 200 }));

    app.use("/api", routes);
    app.listen(PORT, () => logger.info([`Server is running on port ${PORT}`]));
  } catch (error) {
    const errorMsg = error?.message || "";
    logger.error(["Server error", errorMsg]);
    process.exit(1);
  }
})();
