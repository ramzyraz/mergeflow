import { createWriteStream } from "fs";
import { format } from "date-fns";

const logStream = createWriteStream("app.log", { flags: "a" });

const log = (level, ...args) => {
  const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const message = args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
    .join(" ");
  const formattedMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;

  console.log(formattedMessage);
  logStream.write(`${formattedMessage}\n`);
};

const logger = {
  info: (...args) => log("info", ...args),
  warn: (...args) => log("warn", ...args),
  error: (...args) => log("error", ...args),
  debug: (...args) => log("debug", ...args),
};

export default logger;
