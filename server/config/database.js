/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Christophe Vandevoir
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file           database.js
 * │ @path          server/config/database.js
 * │ @description   database implementation
 * │ @version       1.0.0
 * │
 * │ @email         christophe.vandevoir@epitech.eu
 * │ @date          2025-04-29
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025 Christophe Vandevoir
 * └────────────────────────────────────────────────────────────────────────────
 */

const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config({ quiet: true });

// Database connection configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Ping MySQL every 5 minutes to prevent wait_timeout from closing idle connections.
// enableKeepAlive handles TCP-level drops, but MySQL closes connections at the
// application level after wait_timeout (default 8h) regardless of TCP keepalive.
setInterval(
  async () => {
    try {
      await pool.query("SELECT 1");
    } catch (err) {
      console.error("\x1b[33mDB keep-alive ping failed:\x1b[0m", err.message);
    }
  },
  5 * 60 * 1000,
);

// Default rows the application needs, created once. Runs under the migration
// lock, so two pods starting together never create the admin twice.
async function seed(connection) {
  const { zonedNow, initialLastAssignmentDate } = require("../services/questClock");

  const [admins] = await connection.query(
    'SELECT id FROM USERS WHERE role = "ADMIN" LIMIT 1',
  );
  if (admins.length === 0) {
    const bcrypt = require("bcryptjs");
    const crypto = require("crypto");
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || "admin@epitech.eu";
    const providedPassword = process.env.ADMIN_INITIAL_PASSWORD;
    const initialPassword =
      providedPassword || crypto.randomBytes(18).toString("base64url");
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    await connection.query(
      `INSERT INTO USERS (email, password, role, firstName, lastName, isFirstLogin)
       VALUES (?, ?, 'ADMIN', 'Admin', 'Système', FALSE)`,
      [adminEmail, hashedPassword],
    );

    if (providedPassword) {
      console.log(
        `\x1b[32mDefault admin account created (${adminEmail}) with ADMIN_INITIAL_PASSWORD\x1b[0m`,
      );
    } else {
      // Printed once, on first start with an empty database only
      console.log(
        `\x1b[33mDefault admin account created: ${adminEmail} / ${initialPassword} (change it after first login)\x1b[0m`,
      );
    }
  }

  const [configs] = await connection.query(
    "SELECT id, assignmentHour, lastAssignmentDate FROM QUEST_CONFIG LIMIT 1",
  );
  if (configs.length === 0) {
    await connection.query(
      "INSERT INTO QUEST_CONFIG (assignmentHour, durationHours) VALUES (10, 24)",
    );
    console.log("\x1b[32mDefault quest configuration created\x1b[0m");
  }

  // Never assign on start for an hour that has already passed today
  const [[config]] = await connection.query(
    "SELECT id, assignmentHour, lastAssignmentDate FROM QUEST_CONFIG LIMIT 1",
  );
  if (!config.lastAssignmentDate) {
    await connection.query(
      "UPDATE QUEST_CONFIG SET lastAssignmentDate = ? WHERE id = ?",
      [initialLastAssignmentDate(config.assignmentHour, zonedNow()), config.id],
    );
  }
}

// Schema migrations (server/migrations), then the default rows
async function initDatabase() {
  try {
    const { runMigrations } = require("./migrate");
    await runMigrations({ seed });
    console.log("\x1b[32mDatabase initialized successfully\x1b[0m");
  } catch (error) {
    console.error("\x1b[31mError initializing database:\x1b[0m", error);
    throw error;
  }
}

module.exports = {
  pool,
  initDatabase,
};
