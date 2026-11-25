/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Christophe Vandevoir
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file          app.js
 * │ @path          server/app.js
 * │ @description   app implementation
 * │ @version       1.0.0
 * │
 * │ @email         christophe.vandevoir@epitech.eu
 * │ @date          2025-04-29
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025 Christophe Vandevoir
 * └────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { initDatabase, pool } = require('./config/database');

// Load environment variables
// quiet: dotenv 17+ logs a line on every load by default
dotenv.config({ quiet: true });

// Initialize Express application
const app = express();

// Requests arrive through Traefik and the nginx of the pod: trust only those
// local hops, so req.ip is the client address and a forged X-Forwarded-For
// sent by the client is ignored
app.set('trust proxy', ['loopback', 'uniquelocal']);
app.disable('x-powered-by');

// Security headers for API responses. HSTS is set by Traefik (TLS ends there);
// X-Frame-Options DENY matches the one nginx adds on /api
app.use(helmet({
    strictTransportSecurity: false,
    xFrameOptions: { action: 'deny' }
}));

// Middleware for parsing JSON (explicit default limit)
app.use(express.json({ limit: '100kb' }));
// Express 5 leaves req.body undefined when no body is parsed: keep the
// controllers' destructuring (const { x } = req.body) safe
app.use((req, res, next) => {
    if (req.body === undefined) req.body = {};
    next();
});

// CORS: the client is served from the same origin, so no cross-origin access
// unless CORS_ORIGIN lists allowed origins (comma-separated)
const corsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
if (corsOrigins.length > 0) {
    app.use(cors({ origin: corsOrigins }));
}

// Middleware for logging HTTP requests (not the probes, called every few seconds)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    skip: (req) => req.path.startsWith('/api/health')
}));

// Health checks used by the Kubernetes probes
// - live: the Node process answers (liveness, startup); no database, so a
//   database outage does not make Kubernetes restart the app in a loop
// - ready: the database answers too (readiness: the pod leaves the routing)
app.get('/api/health/live', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/api/health', async (req, res) => {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('database check timed out')), 2000).unref();
    });
    try {
        await Promise.race([pool.query('SELECT 1'), timeout]);
        res.status(200).json({ status: 'ok', database: 'ok' });
    } catch (error) {
        res.status(503).json({ status: 'error', database: 'unreachable' });
    }
});

// Initialize the database
initDatabase().then(() => {
    // Start quest scheduler after database initialization
    const questScheduler = require('./services/questScheduler');
    questScheduler.start();
    console.log('\x1b[32mQuest scheduler initialized\x1b[0m');
}).catch(err => {
    console.error('\x1b[31mError initializing the database:\x1b[0m', err);
    process.exit(1);
});

// Import routes
const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');
const studentRoutes = require('./routes/students');
const pointRoutes = require('./routes/points');
const userRoutes = require('./routes/users');
const questRoutes = require('./routes/quests');
const settingsRoutes = require('./routes/settings');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/settings', settingsRoutes);

// Default route
app.get('/', (req, res) => {
    res.json({ message: 'Pool tracking API for Epitech pool management' });
});

// Middleware to handle 404 errors
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// Middleware to handle errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Handle SIGINT signal
process.on('SIGINT', () => {
    console.log('\x1b[33mShutting down gracefully...\x1b[0m');
    const questScheduler = require('./services/questScheduler');
    questScheduler.stop();
    process.exit(0);
});

// Handle SIGTERM signal (for deployment environments)
process.on('SIGTERM', () => {
    console.log('\x1b[33mShutting down gracefully...\x1b[0m');
    const questScheduler = require('./services/questScheduler');
    questScheduler.stop();
    process.exit(0);
});

module.exports = app;
