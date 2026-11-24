# Pool Tracker - Client

## Description

Pool Tracker Client is the frontend application for the Pool Tracker system, designed to manage student points and team performance during Epitech pools. This React-based application provides an intuitive interface for administrators, APEs, AERs, and students to interact with the system based on their respective permissions.

## Technologies

- React 18, built with Vite
- React Router v7
- Axios for API communication
- React Toastify for notifications
- CSS for styling (custom components)

## Features

- **Role-based access control**: Different interfaces and permissions for ADMIN, APE, AER, and STUDENT roles
- **Authentication system**: Login with first-time password setup
- **Dashboard**: Overview of team rankings and performance
- **Team management**: Create, update, and manage teams with student assignments
- **Points system**: Assign and track points for students
- **User management**: Admin interface for managing users and their roles
- **Student profiles**: Personal dashboard showing points history and team information

## Project Structure

```
client/
├── public/              # Static files
├── src/
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── pages/           # Page components
│   │   └── admin/       # Admin-specific pages
│   ├── services/        # API services
│   ├── App.css          # Global styles
│   ├── App.jsx          # Main application component
│   ├── Routes.jsx       # Application routes
│   └── index.jsx        # Entry point
├── index.html           # Page template (Vite entry)
├── vite.config.js       # Dev server, API proxy and build settings
├── package.json         # Dependencies and scripts
└── README.md            # Documentation
```

## Installation

1. Make sure you have Node.js 24 (at least 20.19, required by Vite) installed
2. Clone the repository
3. Navigate to the client directory:
   ```
   cd PoolTracker/client
   ```
4. Install dependencies:
   ```
   npm install
   ```

## Running the Application

### Development Mode
```
npm start
```
The Vite dev server runs at http://localhost:3000 and proxies `/api` to the API. In `docker-compose.dev.yml` the API is the `server` container (the default); outside Docker:
```
API_PROXY_TARGET=http://localhost:3001 npm start
```

### Production Build
```
npm run build
```
This command creates a production-ready build in the `build` directory.

## Usage

### User Roles

- **ADMIN**: Full access to all features, can manage all users and their roles
- **APE**: Can manage teams, students, and points; cannot manage ADMIN or other APE accounts
- **AER**: Can only manage points for students
- **STUDENT**: Can view their profile and team information

### Key Pages

- **Home**: Displays team rankings and top students
- **Login**: Authentication page with support for first-time login
- **Profile**: Student's personal dashboard
- **Admin/Students**: Manage student accounts
- **Admin/Teams**: Manage teams and team membership
- **Admin/Points**: Assign and manage points
- **Admin/Users**: Manage user accounts and roles (ADMIN only)

## Configuration

In development, `/api` is proxied by the Vite dev server (`vite.config.js`, target `API_PROXY_TARGET`, default `http://server:3001`). In production, nginx serves the build and proxies `/api` to Node in the same container.

## Notes

- The session is an HttpOnly cookie set by the server: page scripts cannot read it, and the browser sends it with every `/api` request. A token stored by an older version in `localStorage` is moved into the cookie once, then removed
- Role-based component rendering ensures users only see what they have permission to access