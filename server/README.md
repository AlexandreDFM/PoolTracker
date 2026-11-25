# Pool Tracker API

## Description

Pool Tracker API is a backend application designed to manage student points during Epitech pools. It allows administrators to create teams, add students, assign points, and track team and student performance.

## Features

- Secure authentication (JWT)
- User management (students and administrators)
- Team management with color assignment
- Student points tracking
- Team and student rankings
- Points history
- RESTful API with documentation

## Prerequisites

- Node.js (version 14 or higher)
- MySQL (version 5.7 or higher)
- npm or yarn

## Installation

### Using Docker (Recommended)

The easiest way to set up the entire application (including this API, the frontend, and database) is using Docker. See the [main README](../README.md) and [Docker documentation](../docker/README.md) for instructions.

### Manual Setup

1. Navigate to the server directory:
   ```bash
   cd PoolTracker/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file with your information:
   ```
   HOST=localhost
   PORT=3001
   NODE_ENV=development

   # Database
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=pool_tracker

   # JWT
   JWT_SECRET=your_very_secure_jwt_secret
   ```

4. Create the database (MySQL):
   ```sql
   CREATE DATABASE pool_tracker;
   ```

## Starting the Server

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm start
```

The API will be accessible at: `http://localhost:3001` (or the address/port configured in your .env)

## Project Structure

```
server/
├── config/              # Configuration (database)
├── controllers/         # Controllers for business logic
├── middlewares/         # Middlewares (authentication, etc.)
├── models/              # Data models
├── routes/              # API routes
├── .env.example         # Example environment variables configuration
├── app.js               # Express application configuration
├── package.json         # Dependencies and npm scripts
└── server.js            # Application entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/set-password` - Set the initial password (first login, requires the setup token returned by login)
- `PUT /api/auth/password` - Change the connected user's password (current + new password)
- `POST /api/auth/logout` - End the session (clears the cookie)
- `POST /api/auth/session` - Move a token sent as `Authorization: Bearer` into the session cookie (one-time migration of older clients)
- `GET /api/auth/profile` - Get connected user profile

### Health
- `GET /api/health/live` - The Node process answers (liveness and startup probes)
- `GET /api/health` - The database answers too (`SELECT 1`, 2 s timeout, else `503`): readiness probe

### Students
- `GET /api/students` - List all students (admin)
- `GET /api/students/:id` - Get student details
- `POST /api/students` - Create a student (admin)
- `PUT /api/students/:id` - Update a student (admin)
- `DELETE /api/students/:id` - Delete a student (admin)

### Teams
- `GET /api/teams` - List all teams
- `GET /api/teams/with-points` - List teams with total score
- `GET /api/teams/:id` - Get team details
- `GET /api/teams/:id/students` - List students in a team
- `GET /api/teams/:id/top-students` - Top students in a team
- `POST /api/teams` - Create a team (admin)
- `PUT /api/teams/:id` - Update a team (admin)
- `DELETE /api/teams/:id` - Delete a team (admin)
- `POST /api/teams/:id/students` - Add a student to a team (admin)
- `DELETE /api/teams/:id/students/:userId` - Remove a student from a team (admin)

### Points
- `POST /api/points` - Assign points to a student (admin)
- `GET /api/points/summary` - Summary of points for all students (admin)
- `GET /api/points/user/:userId/history` - Points history for a student
- `GET /api/points/user/:userId/total` - Total points for a student

### Users
- `GET /api/users` - List all users (admin)
- `GET /api/users/by-role/:role` - List users by role (admin)
- Various endpoints for managing different user roles (ADMIN, APE, AER)
- `POST /api/users/:id/reset-password` - Reset a user's password: the account goes back to first login (ADMIN for every account, APE for AER and STUDENT)

## Security

The API uses JWT (JSON Web Token) for authentication. Passwords are hashed using bcrypt. Different authorization levels are implemented:

- Public routes: login and first connection
- Protected routes: require a valid JWT token
- Admin routes: reserved for users with the "ADMIN" role
- Personal routes: accessible by the administrator or the concerned student

Sessions:
- The JWT is sent in an HttpOnly, SameSite=Strict cookie (`pt_session`, path `/api`, Secure in production), never in a response body. `Authorization: Bearer` is still accepted for scripts.
- Each request reads the user from the database: a deleted account is refused at once and the role is always the current one.
- Changing or resetting a password ends the user's other sessions (`sessionVersion` column, carried in the token as `sv`). The session that changes its password receives a new token.

Password guessing (`server/middlewares/loginGuard.js`), per account and never per IP, since students share the campus address:
- The first 10 failures for an email within 15 minutes answer normally.
- Each further failure adds one second to the next attempt on that email, up to 10 seconds. Attempts on a delayed account are handled one after the other, so parallel requests do not bypass the delay.
- A success, or 15 minutes without failure, resets the counter. Nobody is locked out; only a burst of parallel attempts on one account gets `429`.
- The same applies to the current-password check of `PUT /api/auth/password`.
- An unknown email takes as long to answer as a wrong password.

HTTP:
- `helmet` headers on API responses (HSTS is set by Traefik).
- CORS is off: the client is served from the same origin. Set `CORS_ORIGIN` (comma-separated origins) only if another origin must call the API.
- `trust proxy` covers loopback and private addresses (nginx in the pod, Traefik), so `req.ip` is the client address.

## Database schema

The schema is versioned in `migrations/` (numbered SQL files). At startup the server applies the files not yet recorded in `schema_migrations`, then creates the default rows (first admin, quest configuration), all under a MySQL named lock so that several instances can start together. To change the schema, add the next numbered file; never edit one already applied.

## Quest schedule

Daily quests are assigned once the configured hour has passed (Europe/Paris, `QUEST_TIME_ZONE` to change it) and today's assignment is not recorded yet in `QUEST_CONFIG.lastAssignmentDate`. The assignment runs under a MySQL named lock: exactly once a day, whatever the number of instances or restarts.

## Tests

```bash
npm test   # unit tests; API tests too when BASE_URL and the initial admin are set (the CI does)
```

## First Start

On first startup, a default admin account is created:
- Email: `ADMIN_INITIAL_EMAIL` (default: admin@epitech.eu)
- Password: `ADMIN_INITIAL_PASSWORD` if set, otherwise a random password printed once in the server logs

This only happens when the database contains no admin account.

**Change this password after the first login** ("Password" in the menu).

## Development

### Watch mode
```bash
npm run dev   # node --watch: restarts on file changes, no extra dependency
```

### Contribution
1. Create a branch for your feature
2. Commit your changes
3. Submit a pull request

## License

MIT © Christophe Vandevoir