import mongoose from "mongoose";
import logger from "../utils/logger.js";
import { DB_URL } from "../config/index.js";

mongoose.Promise = global.Promise;

async function connectDatabase() {
  try {
    logger.info(["[connectDatabase] Connecting Mongo Server", DB_URL]);
    const connection = await mongoose.connect(DB_URL);

    connection.connection
      .on("error", (error) => {
        const errorMsg = error?.message || "";
        logger.error([
          `[connectDatabase] MongoDB Connection error: ${errorMsg}`,
          error,
        ]);
        throw error;
      })
      .on("close", () => logger.info(["Database connection closed"]));

    return connection;
  } catch (error) {
    const errorMsg = error?.message || "Unable to connect Mongo Server";
    logger.error([`[connectDatabase] Exception: ${errorMsg}`]);
    throw error;
  }
}

export default connectDatabase;
