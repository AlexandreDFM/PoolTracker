/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Christophe Vandevoir
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file           auth.js
 * │ @path          server/routes/auth.js
 * │ @description   auth implementation
 * │ @version       1.0.0
 * │
 * │ @email         christophe.vandevoir@epitech.eu
 * │ @date          2025-04-29
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025 Christophe Vandevoir
 * └────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middlewares/auth');

// Authentication route (login)
router.post('/login', authController.login);

// Route to set the initial password (first login)
router.post('/set-password', authController.setPassword);

// Route to change the connected user's password
router.put('/password', authenticateJWT, authController.changePassword);

// End the session (clears the cookie; no token needed, an expired one must still log out)
router.post('/logout', authController.logout);

// Move a token kept by an older client (Authorization header) into the session cookie
router.post('/session', authenticateJWT, authController.createSession);

// Route to get the connected user's profile
router.get('/profile', authenticateJWT, authController.getProfile);

module.exports = router;
