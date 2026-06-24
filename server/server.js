/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Christophe Vandevoir
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file          server.js
 * │ @path          server/server.js
 * │ @description   server implementation
 * │ @version       1.0.0
 * │
 * │ @email         christophe.vandevoir@epitech.eu
 * │ @date          2025-04-29
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025 Christophe Vandevoir
 * └────────────────────────────────────────────────────────────────────────────
 */

const app = require("./app");

const HOST = process.env.HOST;
const PORT = process.env.PORT;

// Handle uncaught exceptions from synchronous throws (e.g. mysql2 pool bug
// when a connection is closed server-side). Log and exit so Kubernetes can
// restart the pod cleanly instead of leaving it in a broken state.
process.on("uncaughtException", (err) => {
  console.error("\x1b[31mUncaught exception — restarting:\x1b[0m", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("\x1b[31mUnhandled promise rejection:\x1b[0m", reason);
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`The server is running on \x1b[34mhttp://${HOST}:${PORT}\x1b[0m`);
  console.log(`Press \x1b[33mCtrl+C\x1b[0m to stop the server`);
});

// Handle SIGINT signal
process.on("SIGINT", () => {
  console.log("\x1b[33mStopping the server...\x1b[0m");

  // Stop quest scheduler
  try {
    const questScheduler = require("./services/questScheduler");
    questScheduler.stop();
  } catch (error) {
    console.log("Quest scheduler already stopped or not initialized");
  }

  server.close(() => {
    console.log("\x1b[32mServer stopped\x1b[0m");
    process.exit(0);
  });
});

// Handle SIGTERM signal (for deployment environments)
process.on("SIGTERM", () => {
  console.log("\x1b[33mReceived SIGTERM, shutting down gracefully...\x1b[0m");

  // Stop quest scheduler
  try {
    const questScheduler = require("./services/questScheduler");
    questScheduler.stop();
  } catch (error) {
    console.log("Quest scheduler already stopped or not initialized");
  }

  server.close(() => {
    console.log("\x1b[32mServer stopped\x1b[0m");
    process.exit(0);
  });
});

module.exports = server;
