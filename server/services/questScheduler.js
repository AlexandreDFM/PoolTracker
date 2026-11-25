/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Christophe Vandevoir
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file          questScheduler.js
 * │ @path          server/services/questScheduler.js
 * │ @description   questScheduler implementation
 * │ @version       1.0.0
 * │
 * │ @email         christophe.vandevoir@epitech.eu
 * │ @date          2025-07-13
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025 Christophe Vandevoir
 * └────────────────────────────────────────────────────────────────────────────
 */

/**
 * Daily quest assignment. Every minute, each pod checks whether today's
 * assignment is due (configured hour passed, not recorded yet in
 * QUEST_CONFIG.lastAssignmentDate). The assignment runs under a MySQL named
 * lock and the date is checked again inside it, so with several pods, or
 * after a restart, it happens exactly once a day.
 */

const { pool } = require('../config/database');
const Quest = require('../models/quest');
const { zonedNow, isAssignmentDue } = require('./questClock');

const LOCK_NAME = 'pool_tracker_quest_assignment';
const CHECK_INTERVAL_MS = 60 * 1000;

const readSchedule = async (connection) => {
    const [rows] = await connection.query(
        "SELECT id, assignmentHour, DATE_FORMAT(lastAssignmentDate, '%Y-%m-%d') AS lastAssignmentDate FROM QUEST_CONFIG LIMIT 1"
    );
    return rows[0];
};

class QuestScheduler {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) {
            console.log('Quest scheduler is already running');
            return;
        }
        this.isRunning = true;
        console.log('\x1b[32mQuest scheduler started\x1b[0m');
        this.checkAndAssignQuests();
        this.intervalId = setInterval(() => this.checkAndAssignQuests(), CHECK_INTERVAL_MS);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('\x1b[33mQuest scheduler stopped\x1b[0m');
    }

    async checkAndAssignQuests() {
        let connection;
        try {
            const now = zonedNow();
            if (!isAssignmentDue(await readSchedule(pool), now)) return;

            connection = await pool.getConnection();
            // Another pod holds the lock: it is assigning, nothing to do here
            const [[{ locked }]] = await connection.query('SELECT GET_LOCK(?, 0) AS locked', [LOCK_NAME]);
            if (locked !== 1) return;

            try {
                const schedule = await readSchedule(connection);
                if (!isAssignmentDue(schedule, now)) return;

                console.log(`\x1b[34mAssigning daily quests for ${now.date}\x1b[0m`);
                await Quest.assignDailyQuests();
                await connection.query(
                    'UPDATE QUEST_CONFIG SET lastAssignmentDate = ? WHERE id = ?',
                    [now.date, schedule.id]
                );
            } finally {
                await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
            }
        } catch (error) {
            console.error('\x1b[31mError in quest scheduler:\x1b[0m', error);
        } finally {
            if (connection) connection.release();
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            intervalId: this.intervalId !== null
        };
    }
}

module.exports = new QuestScheduler();
