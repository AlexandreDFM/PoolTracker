/**
 * Versioned schema migrations: numbered SQL files in server/migrations,
 * applied once each, in order, and recorded in schema_migrations.
 *
 * Several pods can start at the same time: the whole run (migrations, then
 * the seed callback) holds a MySQL named lock, so only one pod changes the
 * schema while the others wait.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const LOCK_NAME = 'pool_tracker_migrations';
const LOCK_TIMEOUT_S = 120;

const listMigrations = () =>
    fs.readdirSync(MIGRATIONS_DIR)
        .filter((file) => /^\d{3}_[a-z0-9_]+\.sql$/.test(file))
        .sort()
        .map((file) => {
            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
            return {
                version: Number(file.slice(0, 3)),
                name: file,
                sql,
                checksum: crypto.createHash('sha256').update(sql).digest('hex')
            };
        });

async function runMigrations({ seed } = {}) {
    // Own connection: files hold several statements, and the named lock
    // belongs to the connection that took it
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        const [[{ locked }]] = await connection.query('SELECT GET_LOCK(?, ?) AS locked', [LOCK_NAME, LOCK_TIMEOUT_S]);
        if (locked !== 1) {
            throw new Error(`Could not take the migration lock within ${LOCK_TIMEOUT_S}s`);
        }

        try {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    checksum CHAR(64) NOT NULL,
                    appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            const [rows] = await connection.query('SELECT version, checksum FROM schema_migrations');
            const applied = new Map(rows.map((row) => [row.version, row.checksum]));

            for (const migration of listMigrations()) {
                if (applied.has(migration.version)) {
                    if (applied.get(migration.version) !== migration.checksum) {
                        console.warn(`\x1b[33mMigration ${migration.name} changed after it was applied: write a new migration instead\x1b[0m`);
                    }
                    continue;
                }
                // DDL commits implicitly in MySQL: a migration is recorded only
                // once all its statements succeeded
                await connection.query(migration.sql);
                await connection.query(
                    'INSERT INTO schema_migrations (version, name, checksum) VALUES (?, ?, ?)',
                    [migration.version, migration.name, migration.checksum]
                );
                console.log(`\x1b[32mMigration applied: ${migration.name}\x1b[0m`);
            }

            if (seed) {
                await seed(connection);
            }
        } finally {
            await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
        }
    } finally {
        await connection.end();
    }
}

module.exports = { runMigrations, listMigrations };
