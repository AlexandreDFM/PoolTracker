/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Christophe Vandevoir
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file           authController.js
 * │ @path          server/controllers/authController.js
 * │ @description   authController implementation
 * │ @version       1.0.0
 * │
 * │ @email         christophe.vandevoir@epitech.eu
 * │ @date          2025-04-29
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025 Christophe Vandevoir
 * └────────────────────────────────────────────────────────────────────────────
 */

const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const loginGuard = require('../middlewares/loginGuard');
const { setSessionCookie, clearSessionCookie } = require('../middlewares/session');

// Compared against when the email is unknown, so that the response time does
// not reveal whether an account exists
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// Token validity period: 24h
const TOKEN_EXPIRY = '24h';

// First-login token: only allows setting the initial password
const SETUP_TOKEN_PURPOSE = 'set-password';
const SETUP_TOKEN_EXPIRY = '10m';
const MIN_PASSWORD_LENGTH = 6;

const generateSetupToken = (user) => {
    return jwt.sign(
        { id: user.id, purpose: SETUP_TOKEN_PURPOSE },
        process.env.JWT_SECRET,
        { expiresIn: SETUP_TOKEN_EXPIRY }
    );
};

// Generate a JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            sv: user.sessionVersion || 0
        },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
};

// Authentication (login)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (typeof email !== 'string' || !email.trim()) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const guardKey = `email:${email.trim().toLowerCase()}`;
        if (!(await loginGuard.wait(guardKey))) {
            return loginGuard.tooManyAttempts(res);
        }

        // Check if the user exists
        const user = await User.findAuthByEmail(email);
        if (!user) {
            await User.verifyPassword(String(password || ''), DUMMY_HASH);
            loginGuard.recordFailure(guardKey);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // If the user hasn't set their password yet (first login)
        if (!user.password) {
            return res.status(200).json({
                message: 'First login detected',
                requiresPasswordSet: true,
                setupToken: generateSetupToken(user)
            });
        }

        // Check if the password is valid
        const isPasswordValid = await User.verifyPassword(String(password || ''), user.password);
        if (!isPasswordValid) {
            loginGuard.recordFailure(guardKey);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        loginGuard.recordSuccess(guardKey);

        // The session token goes into the HttpOnly cookie, never into the body
        setSessionCookie(res, generateToken(user));

        // Return user information without the password
        const { password: _, sessionVersion: __, ...userWithoutPassword } = user;

        res.status(200).json({
            message: 'Authentication successful',
            user: userWithoutPassword,
            isFirstLogin: user.isFirstLogin
        });
    } catch (error) {
        console.error('\x1b[31mAuthentication error:\x1b[0m', error);
        res.status(500).json({ message: 'Server error during authentication' });
    }
};

// Set the initial password (first login only)
exports.setPassword = async (req, res) => {
    try {
        const { setupToken, password } = req.body;

        let payload;
        try {
            payload = jwt.verify(setupToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        } catch (err) {
            return res.status(401).json({ message: 'Invalid or expired first-login session. Please log in again.' });
        }
        if (payload.purpose !== SETUP_TOKEN_PURPOSE) {
            return res.status(401).json({ message: 'Invalid or expired first-login session. Please log in again.' });
        }

        if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
        }

        const existingUser = await User.findAuthById(payload.id);
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // A setup token can never overwrite an existing password
        if (existingUser.password) {
            return res.status(409).json({ message: 'Password already set. Please log in with your password.' });
        }

        // Update the password and mark first login as completed
        const updated = await User.update(existingUser.id, {
            password,
            isFirstLogin: false
        });

        if (!updated) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userId = existingUser.id;

        // Get the updated user
        const user = await User.findAuthById(userId);

        setSessionCookie(res, generateToken(user));

        // Return user information without the password
        const { password: _, sessionVersion: __, ...userWithoutPassword } = user;

        res.status(200).json({
            message: 'Password set successfully',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('\x1b[31mPassword setting error:\x1b[0m', error);
        res.status(500).json({ message: 'Server error while setting password' });
    }
};

// Change the password of the connected user
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (typeof currentPassword !== 'string' || !currentPassword) {
            return res.status(400).json({ message: 'Current password is required' });
        }
        if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
        }

        const user = await User.findAuthById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const guardKey = `user:${user.id}`;
        if (!(await loginGuard.wait(guardKey))) {
            return loginGuard.tooManyAttempts(res);
        }

        const isPasswordValid = user.password
            ? await User.verifyPassword(currentPassword, user.password)
            : false;
        if (!isPasswordValid) {
            loginGuard.recordFailure(guardKey);
            // 400, not 401: the session itself is valid
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        loginGuard.recordSuccess(guardKey);

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: 'The new password must be different from the current one' });
        }

        // Sessions opened before this change stop working; this one gets a new token
        await User.update(user.id, { password: newPassword });
        await User.revokeSessions(user.id);
        const updatedUser = await User.findAuthById(user.id);

        setSessionCookie(res, generateToken(updatedUser));
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('\x1b[31mPassword change error:\x1b[0m', error);
        res.status(500).json({ message: 'Server error while changing password' });
    }
};

// End the session in this browser
exports.logout = (req, res) => {
    clearSessionCookie(res);
    res.status(200).json({ message: 'Logged out' });
};

// One-time migration for clients that kept the token in localStorage: the
// token, already checked by authenticateJWT, is moved into the cookie
exports.createSession = async (req, res) => {
    try {
        const user = await User.findAuthById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        setSessionCookie(res, generateToken(user));
        res.status(200).json({ message: 'Session created' });
    } catch (error) {
        console.error('\x1b[31mSession creation error:\x1b[0m', error);
        res.status(500).json({ message: 'Server error while creating session' });
    }
};

// Get the connected user's profile
exports.getProfile = async (req, res) => {
    try {
        // User ID is already available in req.user thanks to the authentication middleware
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return user information without the password
        const { password, sessionVersion, ...userWithoutPassword } = user;

        res.status(200).json({ user: userWithoutPassword });
    } catch (error) {
        console.error('\x1b[31mError retrieving user profile:\x1b[0m', error);
        res.status(500).json({ message: 'Server error while retrieving profile' });
    }
};
