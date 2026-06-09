/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Alexandre DE FREITAS MARTINS
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file          setting.js
 * │ @path          server/models/setting.js
 * │ @description   Settings model for global application settings
 * │ @version       1.0.0
 * │
 * │ @date          2025-12-08
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025
 * └────────────────────────────────────────────────────────────────────────────
 */

const { pool } = require('../config/database');

class Setting {
    // Get a setting value by key
    static async get(key) {
        try {
            const [rows] = await pool.query(
                'SELECT settingValue FROM SETTINGS WHERE settingKey = ?',
                [key]
            );
            return rows.length > 0 ? rows[0].settingValue : null;
        } catch (error) {
            console.error('Error getting setting:', error);
            throw error;
        }
    }

    // Set a setting value by key (insert or update)
    static async set(key, value) {
        try {
            await pool.query(`
                INSERT INTO SETTINGS (settingKey, settingValue)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE settingValue = VALUES(settingValue)
            `, [key, value]);
            return true;
        } catch (error) {
            console.error('Error setting value:', error);
            throw error;
        }
    }

    // Get all settings
    static async getAll() {
        try {
            const [rows] = await pool.query('SELECT settingKey, settingValue FROM SETTINGS');
            const settings = {};
            rows.forEach(row => {
                settings[row.settingKey] = row.settingValue;
            });
            return settings;
        } catch (error) {
            console.error('Error getting all settings:', error);
            throw error;
        }
    }
}

module.exports = Setting;
