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
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
};

// Authentication (login)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if the user exists
        const user = await User.findByEmail(email);
        if (!user) {
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
        const isPasswordValid = await User.verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate a JWT token
        const token = generateToken(user);

        // Return user information without the password
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            message: 'Authentication successful',
            user: userWithoutPassword,
            token,
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

        const existingUser = await User.findById(payload.id);
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
        const user = await User.findById(userId);

        // Generate a JWT token
        const token = generateToken(user);

        // Return user information without the password
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            message: 'Password set successfully',
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        console.error('\x1b[31mPassword setting error:\x1b[0m', error);
        res.status(500).json({ message: 'Server error while setting password' });
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
        const { password, ...userWithoutPassword } = user;

        res.status(200).json({ user: userWithoutPassword });
    } catch (error) {
        console.error('\x1b[31mError retrieving user profile:\x1b[0m', error);
        res.status(500).json({ message: 'Server error while retrieving profile' });
    }
};
