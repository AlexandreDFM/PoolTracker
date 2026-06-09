/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Alexandre DE FREITAS MARTINS
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file          settings.js
 * │ @path          server/routes/settings.js
 * │ @description   Settings routes for global application settings
 * │ @version       1.0.0
 * │
 * │ @date          2025-12-08
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025
 * └────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const Setting = require('../models/setting');
const { authenticateJWT, isAdmin } = require('../middlewares/auth');

// Get current global theme setting
router.get('/theme', async (req, res) => {
    try {
        const theme = await Setting.get('globalTheme') || 'default';
        res.json({ theme });
    } catch (error) {
        console.error('Error getting theme setting:', error);
        res.status(500).json({ error: 'Failed to get theme setting' });
    }
});

// Update global theme setting (admin only)
router.put('/theme', authenticateJWT, isAdmin, async (req, res) => {
    try {
        const { theme } = req.body;

        // Validate theme value
        const validThemes = ['default', 'halloween', 'christmas'];
        if (!validThemes.includes(theme)) {
            return res.status(400).json({ error: 'Invalid theme value' });
        }

        await Setting.set('globalTheme', theme);
        res.json({ theme, message: 'Theme updated successfully' });
    } catch (error) {
        console.error('Error updating theme setting:', error);
        res.status(500).json({ error: 'Failed to update theme setting' });
    }
});

// Get all settings (admin only)
router.get('/', authenticateJWT, isAdmin, async (req, res) => {
    try {
        const settings = await Setting.getAll();
        res.json(settings);
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

module.exports = router;
